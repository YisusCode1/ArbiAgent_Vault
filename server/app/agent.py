import logging
import json
import time
from typing import Dict, Any, Optional
from app.config import settings
from app.models import MarketData, StrategyRecommendation
from app.cache import TTLCache
from app.decision_engine import normalize_mode, RiskMode

logger = logging.getLogger(__name__)

# Intentar importar google-genai o google.generativeai
try:
    from google import genai
    from google.genai import types
    HAS_GENAI_NEW = True
except ImportError:
    HAS_GENAI_NEW = False
    try:
        import google.generativeai as genai_old
        HAS_GENAI_OLD = True
    except ImportError:
        HAS_GENAI_OLD = False

class GeminiAgent:
    def __init__(self):
        self.model = settings.GEMINI_MODEL
        self.api_key = settings.GEMINI_API_KEY
        self.cache = TTLCache(default_ttl=settings.CACHE_TTL_SECONDS)
        self.last_call_timestamp: Optional[str] = None
        self.client = None

        if HAS_GENAI_NEW and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Error al inicializar google.genai client: {e}")

    async def get_strategy(self, mode_str: str, market_data: MarketData) -> StrategyRecommendation:
        enum_mode = normalize_mode(mode_str)
        cache_key = f"{enum_mode.value}:{market_data.supply_rate}:{market_data.utilization_rate}:{market_data.health_factor}:{market_data.current_allocation}"

        cached = self.cache.get(cache_key)
        if cached:
            logger.info(f"Retornando respuesta de cache para clave {cache_key}")
            return StrategyRecommendation(**cached)

        system_prompt = self._build_system_prompt(enum_mode)
        user_prompt = self._build_user_prompt(market_data)

        raw_data = await self._call_gemini_with_retry(system_prompt, user_prompt)
        
        if raw_data:
            try:
                rec = StrategyRecommendation(**raw_data)
                self.cache.set(cache_key, rec.model_dump() if hasattr(rec, 'model_dump') else rec.dict())
                self.last_call_timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                return rec
            except Exception as ve:
                logger.error(f"Error de validacion en respuesta Gemini: {ve}")

        # Fallback elegante si Gemini falla o no responde
        logger.warning(f"Usando estrategia fallback para modo {enum_mode.value}")
        fallback_rec = self._get_fallback_recommendation(enum_mode, market_data)
        
        # Cachear el fallback temporalmente para evitar la espiral de requests (death spiral) en caso de limitacion de cuota (429)
        self.cache.set(cache_key, fallback_rec.model_dump() if hasattr(fallback_rec, 'model_dump') else fallback_rec.dict())
        return fallback_rec

    async def _call_gemini_with_retry(self, system_prompt: str, user_prompt: str) -> Optional[Dict[str, Any]]:
        retries = settings.GEMINI_MAX_RETRIES
        for attempt in range(retries + 1):
            try:
                if self.client and HAS_GENAI_NEW:
                    response = self.client.models.generate_content(
                        model=self.model,
                        contents=f"{system_prompt}\n\n{user_prompt}",
                        config=types.GenerateContentConfig(
                            temperature=0.2,
                            max_output_tokens=1024,
                            response_mime_type="application/json"
                        )
                    )
                    text = response.text
                elif HAS_GENAI_OLD and self.api_key:
                    genai_old.configure(api_key=self.api_key)
                    model_obj = genai_old.GenerativeModel(
                        self.model,
                        generation_config={"response_mime_type": "application/json", "temperature": 0.2}
                    )
                    res = model_obj.generate_content(f"{system_prompt}\n\n{user_prompt}")
                    text = res.text
                else:
                    logger.warning("SDK de Gemini no disponible o API key no configurada.")
                    return None

                # Extraer JSON de la respuesta (por si viene rodeado de bloques markdown)
                clean_text = text.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                if clean_text.startswith("```"):
                    clean_text = clean_text[3:]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()

                return json.loads(clean_text)

            except Exception as e:
                error_str = str(e)
                logger.error(f"Intento {attempt + 1}/{retries + 1} fallido al llamar a Gemini: {error_str}")
                
                # Circuit Breaker: Si es error de cuota (429), salir rapido para usar el fallback sin esperar inutilmente
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    logger.warning("Limite de cuota (429) detectado. Abortando reintentos.")
                    return None

                if attempt < retries:
                    import asyncio
                    await asyncio.sleep(1.0 * (attempt + 1))
        return None

    def _build_system_prompt(self, mode: RiskMode) -> str:
        base_instructions = """
        Eres un agente de Inteligencia Artificial especializado en optimizacion de vaults DeFi ERC-4626 en Arbitrum Sepolia.
        Tu funcion es analizar metricas financieras de Aave V3 y recomendar la accion del vault.
        DEBES responder UNICAMENTE con un objeto JSON valido con la siguiente estructura exacta:
        {
            "action": "HOLD" | "SUPPLY" | "WITHDRAW",
            "confidence": float entre 0.0 y 1.0,
            "estimated_apy": float >= 0.0,
            "risk_level": "Bajo" | "Medio" | "Alto",
            "startbase_score": float entre 0.0 y 100.0
        }
        Ejemplo de respuesta valida:
        {"action": "HOLD", "confidence": 0.92, "estimated_apy": 5.74, "risk_level": "Bajo", "startbase_score": 94.5}
        """

        mode_prompts = {
            RiskMode.CONSERVADOR: """
            MODO DE RIESGO: CONSERVADOR
            Tu prioridad absoluta es la preservacion del capital y minimizar cualquier posibilidad de perdidas o liquidez atrapada.
            - Si la tasa de utilizacion de Aave supera el 80% o la volatilidad es alta (>10%), recomienda WITHDRAW o HOLD.
            - Solo recomienda SUPPLY si la confianza es superior al 0.90 y el Health Factor es > 1.30.
            - Nivel de riesgo sugerido en JSON: "Bajo".
            """,
            RiskMode.MODERADO: """
            MODO DE RIESGO: MODERADO
            Tu objetivo es equilibrar la rentabilidad (APY) y la seguridad de la posicion (ratio de Sharpe).
            - Recomienda SUPPLY cuando las tasas de interes sean atractivas y el mercado este estable.
            - Recomienda WITHDRAW o HOLD si la utilizacion supera el 90% o el Health Factor cae de 1.15.
            - Nivel de riesgo sugerido en JSON: "Medio".
            """,
            RiskMode.AGRESIVO: """
            MODO DE RIESGO: AGRESIVO
            Tu objetivo es maximizar el rendimiento (APY) aprovechando picos de rendimiento en Aave V3.
            - Recomienda SUPPLY agresivamente para mantener la maxima cantidad de fondos invertidos generandoyield.
            - Solo recomienda WITHDRAW si el Health Factor cae peligrosamente por debajo de 1.05.
            - Nivel de riesgo sugerido en JSON: "Alto".
            """
        }
        return base_instructions + "\n" + mode_prompts.get(mode, mode_prompts[RiskMode.MODERADO])

    def _build_user_prompt(self, data: MarketData) -> str:
        return f"""
        Datos de mercado actuales para el Vault:
        - Tasa de suministro Aave V3: {data.supply_rate}%
        - Tasa de utilizacion del pool: {data.utilization_rate * 100:.1f}%
        - Health Factor del Vault: {data.health_factor}
        - TVL total en Vault: ${data.tvl:,.2f} USD
        - Volatilidad a 7 dias: {data.volatility_7d}%
        - Asignacion actual en Aave: {data.current_allocation * 100:.1f}%
        """

    def _get_fallback_recommendation(self, mode: RiskMode, data: MarketData) -> StrategyRecommendation:
        if mode == RiskMode.CONSERVADOR:
            return StrategyRecommendation(
                action="HOLD",
                confidence=0.88,
                estimated_apy=max(4.2, data.supply_rate),
                risk_level="Bajo",
                startbase_score=95.0
            )
        elif mode == RiskMode.AGRESIVO:
            return StrategyRecommendation(
                action="SUPPLY",
                confidence=0.82,
                estimated_apy=max(7.5, data.supply_rate * 1.3),
                risk_level="Alto",
                startbase_score=88.5
            )
        else:
            return StrategyRecommendation(
                action="HOLD",
                confidence=0.90,
                estimated_apy=max(5.74, data.supply_rate),
                risk_level="Medio",
                startbase_score=94.5
            )
