import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/apiService';
import { Web3Service } from '../services/web3Service';
import { StrategyResponse, RiskMode, RiskModeInfo } from '../types';

// Convierte errores de ethers/MetaMask en mensajes claros para el usuario
const parseExecutionError = (err: any): string => {
  if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
    return 'Transaction cancelled from your wallet.';
  }

  const raw: string = [
    err?.reason,
    err?.shortMessage,
    err?.info?.error?.message,
    err?.message
  ]
    .filter(Boolean)
    .join(' | ');

  if (raw.includes('Cooldown activo')) {
    return 'Cooldown active: the vault only allows one rebalance every 8 hours. Try again later.';
  }
  if (raw.includes('Nonce ya usado')) {
    return 'This signal was already executed. Generate a new one.';
  }
  if (raw.includes('Senal expirada')) {
    return 'The signal expired. Run the strategy again.';
  }
  if (raw.includes('Firma invalida')) {
    return 'The contract rejected the signature: it does not match the registered AI agent.';
  }
  if (raw.includes('Retiro de Aave incompleto')) {
    return 'Aave no pudo devolver el monto solicitado. Intenta de nuevo.';
  }
  if (raw.includes('401') || raw.includes('422')) {
    return 'The backend rejected the request (invalid or missing API key).';
  }

  return err?.shortMessage || err?.message || 'Error al ejecutar la estrategia.';
};

export const useStrategy = () => {
  const [riskMode, setRiskModeState] = useState<RiskMode>(() => {
    if (typeof window !== 'undefined') {
      // En esta versión solo está activo el modo moderado: ignora cualquier otro valor guardado.
      const saved = localStorage.getItem('arbiagent_risk_mode');
      if (saved === 'moderado') {
        return saved as RiskMode;
      }
    }
    return 'moderado';
  });

  const [riskModes, setRiskModes] = useState<RiskModeInfo[]>([]);
  const [strategy, setStrategy] = useState<StrategyResponse>({
    action: 'HOLD',
    confidence: 0.90,
    estimated_apy: 5.74,
    risk_level: 'Medio',
    volatility_7d: 7.85,
    recommended_protocol: 'Aave V3',
    timestamp: new Date().toISOString(),
    arbiagent_score: 94.5,
    active_mode: 'moderado',
    mode_description: 'Balance optimo entre rendimiento y riesgo (ratio Sharpe).'
  });

  // true solo cuando `strategy` viene del backend (no del valor inicial de relleno).
  // Las vistas lo usan para no mostrar un APY inventado si el backend no responde.
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingModes, setIsLoadingModes] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<{ success: boolean; txHash: string; message: string } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchRiskModes = useCallback(async () => {
    setIsLoadingModes(true);
    try {
      const modes = await ApiService.getRiskModes();
      setRiskModes(modes);
    } catch {
      // Fallback local
    } finally {
      setIsLoadingModes(false);
    }
  }, []);

  const fetchStrategy = useCallback(async (modeToFetch?: RiskMode) => {
    const targetMode = modeToFetch || riskMode;
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await ApiService.getAIStrategy(targetMode);
      setStrategy(data);
      setHasLoaded(true);
    } catch (err: any) {
      setFetchError(err.message || "Critical connection failure.");
    } finally {
      setIsLoading(false);
    }
  }, [riskMode]);

  // Cambiar el modo actualiza riskMode y el useEffect de abajo vuelve a pedir la estrategia,
  // así que ya no se llama fetchStrategy aquí (antes se pedía dos veces).
  const setRiskMode = (newMode: RiskMode) => {
    if (newMode !== 'moderado') return; // solo el modo moderado está activo
    setRiskModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('arbiagent_risk_mode', newMode);
    }
  };

  useEffect(() => {
    fetchRiskModes();
    fetchStrategy(riskMode);
  }, [fetchRiskModes, fetchStrategy, riskMode]);

  const executeStrategy = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    try {
      // 1. El backend calcula la señal y la firma con la clave del agente IA (EIP-712)
      const signal = await ApiService.triggerRebalance(riskMode);

      // 2. Si no hay nada que mover, no se envía transacción
      //    (ejecutar una señal vacia igual consumiria el cooldown de 8h)
      if (Number(signal.amountToSupply) === 0 && Number(signal.amountToWithdraw) === 0) {
        setExecutionResult({
          success: true,
          txHash: '',
          message: 'The AI recommends holding the current position: there are no moves to execute on-chain.'
        });
        return;
      }

      // 3. La wallet del usuario envia executeSignal() al vault; el contrato verifica la firma
      await Web3Service.switchToArbitrumSepolia();
      const txHash = await Web3Service.executeSignalOnChain(signal);

      setExecutionResult({
        success: true,
        txHash,
        message: 'AI signal verified and executed on-chain.'
      });

      await fetchStrategy(riskMode);
    } catch (err: any) {
      setExecutionResult({
        success: false,
        txHash: '',
        message: parseExecutionError(err)
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    riskMode,
    setRiskMode,
    riskModes,
    strategy,
    hasLoaded,
    isLoading,
    isLoadingModes,
    isExecuting,
    executionResult,
    fetchError,
    fetchStrategy: () => fetchStrategy(riskMode),
    executeStrategy
  };
};