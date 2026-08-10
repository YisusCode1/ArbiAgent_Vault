# Arquitectura — ArbiAgent

Diagrama de la interacción entre los componentes principales del sistema.

📐 Ver en Figma: https://bit.ly/4cxNcvN 

## Descripción del flujo

1. **Usuario** interactúa con el **frontend**, conectando su wallet vía Wagmi/RainbowKit.
2. El **frontend** hace dos cosas en paralelo:
   - Lee y escribe directamente al **smart contract** para depósitos, retiros, y balances (ERC-4626 estándar).
   - Consulta al **backend** para obtener la estrategia y recomendación actual de la IA.
3. El **agente de IA** (backend) analiza datos de mercado de Aave V3, decide la acción de rebalanceo, y **firma esa decisión criptográficamente (EIP-712)**.
4. Esa señal firmada se envía al **smart contract** vía `executeSignal()`, que **verifica on-chain** que la firma corresponde a la clave autorizada del agente antes de ejecutar cualquier acción.
5. El contrato interactúa con el **Pool de Aave V3** (protocolo externo, no propio) para depositar (`supply`) o retirar (`withdraw`) los fondos y generar rendimiento real.

## Por qué la verificación EIP-712 importa

El contrato nunca confía únicamente en `msg.sender` para autorizar una acción de rebalanceo — verifica criptográficamente que la señal fue firmada por la clave privada del agente de IA autorizado, permitiendo auditar on-chain que cada decisión ejecutada realmente provino del sistema de IA y no fue falsificada.
