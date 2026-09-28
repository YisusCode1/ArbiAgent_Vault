import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/apiService';
import { Web3Service } from '../services/web3Service';
import { StrategyResponse, RiskMode, RiskModeInfo } from '../types';

// Convierte errores de ethers/MetaMask en mensajes claros para el usuario
const parseExecutionError = (err: any): string => {
  if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
    return 'Transacción cancelada desde la wallet.';
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
    return 'Cooldown activo: el vault solo permite un rebalanceo cada 8 horas. Intenta más tarde.';
  }
  if (raw.includes('Nonce ya usado')) {
    return 'Esta señal ya fue ejecutada. Genera una nueva.';
  }
  if (raw.includes('Senal expirada')) {
    return 'La señal expiró. Vuelve a ejecutar la estrategia.';
  }
  if (raw.includes('Firma invalida')) {
    return 'El contrato rechazó la firma: no corresponde al agente IA registrado.';
  }
  if (raw.includes('Retiro de Aave incompleto')) {
    return 'Aave no pudo devolver el monto solicitado. Intenta de nuevo.';
  }
  if (raw.includes('401') || raw.includes('422')) {
    return 'El backend rechazó la petición (API key inválida o ausente).';
  }

  return err?.shortMessage || err?.message || 'Error al ejecutar la estrategia.';
};

export const useStrategy = () => {
  const [riskMode, setRiskModeState] = useState<RiskMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('arbiagent_risk_mode');
      if (saved && (saved === 'conservador' || saved === 'moderado' || saved === 'agresivo')) {
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
    } catch (err: any) {
      setFetchError(err.message || "Fallo de conexión crítico.");
    } finally {
      setIsLoading(false);
    }
  }, [riskMode]);

  const setRiskMode = (newMode: RiskMode) => {
    setRiskModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('arbiagent_risk_mode', newMode);
    }
    fetchStrategy(newMode);
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
          message: 'La IA recomienda mantener la posición actual: no hay movimientos que ejecutar on-chain.'
        });
        return;
      }

      // 3. La wallet del usuario envia executeSignal() al vault; el contrato verifica la firma
      await Web3Service.switchToArbitrumSepolia();
      const txHash = await Web3Service.executeSignalOnChain(signal);

      setExecutionResult({
        success: true,
        txHash,
        message: 'Señal de la IA verificada y ejecutada on-chain.'
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
    isLoading,
    isLoadingModes,
    isExecuting,
    executionResult,
    fetchError,
    fetchStrategy: () => fetchStrategy(riskMode),
    executeStrategy
  };
};