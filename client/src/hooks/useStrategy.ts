import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/apiService';
import { StrategyResponse, RiskMode, RiskModeInfo } from '../types';

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
    startbase_score: 94.5,
    active_mode: 'moderado',
    mode_description: 'Balance optimo entre rendimiento y riesgo (ratio Sharpe).'
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingModes, setIsLoadingModes] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<{ success: boolean; txHash: string; message: string } | null>(null);

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
    try {
      const data = await ApiService.getAIStrategy(targetMode);
      setStrategy(data);
    } catch {
      // Mantiene estado fallback
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
      const res = await ApiService.triggerRebalance(riskMode);
      setExecutionResult(res);
      await fetchStrategy(riskMode);
    } catch {
      setExecutionResult({
        success: false,
        txHash: '',
        message: 'Error al ejecutar la estrategia.'
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
    fetchStrategy: () => fetchStrategy(riskMode),
    executeStrategy
  };
};
