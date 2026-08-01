import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/apiService';
import { StrategyResponse } from '../types';

export const useStrategy = () => {
  const [strategy, setStrategy] = useState<StrategyResponse>({
    action: 'HOLD',
    confidence: 0.90,
    estimated_apy: 5.74,
    risk_level: 'Bajo',
    volatility_7d: 7.85,
    recommended_protocol: 'Aave V3',
    timestamp: new Date().toISOString(),
    startbase_score: 94.5
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<{ success: boolean; txHash: string; message: string } | null>(null);

  const fetchStrategy = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getAIStrategy();
      setStrategy(data);
    } catch {
      // Mantiene estado fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategy();
  }, [fetchStrategy]);

  const executeStrategy = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    try {
      const res = await ApiService.triggerRebalance();
      setExecutionResult(res);
      await fetchStrategy();
    } catch (err: any) {
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
    strategy,
    isLoading,
    isExecuting,
    executionResult,
    fetchStrategy,
    executeStrategy
  };
};
