import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from './useWeb3';
import { Web3Service } from '../services/web3Service';
import { VaultMetrics, TransactionRecord } from '../types';

export const CONVERSION_RATE = 1.0087; // 1 aaUSDC = 1.0087 USDC

export const useVault = () => {
  const { wallet } = useWeb3();
  const [metrics, setMetrics] = useState<VaultMetrics>({
    totalAssets: '125446.51',
    userShares: '16.3636',
    userAssets: '16.51',
    performanceFee: 10,
    assetSymbol: 'USDC'
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<TransactionRecord[]>([
    {
      date: '28 May 2025, 14:32:18',
      type: 'IA',
      typeBadge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      description: 'Senal generada: Mantener en Aave',
      detail: 'Confianza: 90% - Riesgo: Bajo',
      protocol: 'Aave V3',
      amount: '-',
      status: 'Completado',
      hash: '0x8f3a...b7c9'
    },
    {
      date: '27 May 2025, 09:18:07',
      type: 'DEPÓSITO',
      typeBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      description: 'Deposito de USDC al vault',
      detail: 'Convertido a aaUSDC',
      protocol: 'Aave V3',
      amount: '500.00 USDC',
      subAmount: '495.6875 aaUSDC',
      status: 'Completado',
      hash: '0x9b6c...2e11'
    }
  ]);

  const fetchMetrics = useCallback(async () => {
    try {
      if (wallet.isConnected && !wallet.isDemo && wallet.account) {
        const totalAssets = await Web3Service.getVaultTotalAssets();
        const userVaultData = await Web3Service.getUserShares(wallet.account);
        setMetrics((prev) => ({
          ...prev,
          totalAssets,
          userShares: userVaultData.shares,
          userAssets: userVaultData.assets
        }));
      }
    } catch {
      // Mantiene estado local exacto
    }
  }, [wallet.account, wallet.isConnected, wallet.isDemo]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const deposit = async (amountStr: string) => {
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Ingrese un monto valido mayor a cero.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      let hash = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      if (wallet.isConnected && !wallet.isDemo) {
        hash = await Web3Service.deposit(amountStr);
      } else {
        await new Promise((res) => setTimeout(res, 1000));
      }

      const addedShares = numAmount / CONVERSION_RATE;
      const currentUserAssets = parseFloat(metrics.userAssets);
      const currentUserShares = parseFloat(metrics.userShares);
      const currentTotalAssets = parseFloat(metrics.totalAssets);

      const newUserAssets = (currentUserAssets + numAmount).toFixed(2);
      const newUserShares = (currentUserShares + addedShares).toFixed(4);
      const newTotalAssets = (currentTotalAssets + numAmount).toFixed(2);

      setMetrics((prev) => ({
        ...prev,
        userAssets: newUserAssets,
        userShares: newUserShares,
        totalAssets: newTotalAssets
      }));

      setTxHash(hash);
      const newRecord: TransactionRecord = {
        date: new Date().toLocaleString('es-ES'),
        type: 'DEPÓSITO',
        typeBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        description: 'Deposito de USDC al vault',
        detail: `Recibidas ${addedShares.toFixed(4)} aaUSDC shares`,
        protocol: 'Aave V3',
        amount: `${numAmount.toFixed(2)} USDC`,
        subAmount: `${addedShares.toFixed(4)} aaUSDC`,
        status: 'Completado',
        hash: hash.substring(0, 6) + '...' + hash.substring(hash.length - 4)
      };

      setHistory((prev) => [newRecord, ...prev]);
    } catch (err: any) {
      setError(err?.message || 'Error al ejecutar el deposito.');
    } finally {
      setIsProcessing(false);
    }
  };

  const withdraw = async (amountStr: string) => {
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Ingrese un monto valido mayor a cero.');
      return;
    }

    const currentUserAssets = parseFloat(metrics.userAssets);
    if (numAmount > currentUserAssets) {
      setError(`Monto supera tu posicion disponible de $${metrics.userAssets} USDC.`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      let hash = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      if (wallet.isConnected && !wallet.isDemo) {
        hash = await Web3Service.withdraw(amountStr);
      } else {
        await new Promise((res) => setTimeout(res, 1000));
      }

      const removedShares = numAmount / CONVERSION_RATE;
      const currentUserShares = parseFloat(metrics.userShares);
      const currentTotalAssets = parseFloat(metrics.totalAssets);

      const newUserAssets = Math.max(0, currentUserAssets - numAmount).toFixed(2);
      const newUserShares = Math.max(0, currentUserShares - removedShares).toFixed(4);
      const newTotalAssets = Math.max(0, currentTotalAssets - numAmount).toFixed(2);

      setMetrics((prev) => ({
        ...prev,
        userAssets: newUserAssets,
        userShares: newUserShares,
        totalAssets: newTotalAssets
      }));

      setTxHash(hash);
      const newRecord: TransactionRecord = {
        date: new Date().toLocaleString('es-ES'),
        type: 'RETIRO',
        typeBadge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        description: 'Retiro de USDC del vault',
        detail: `Quemadas ${removedShares.toFixed(4)} aaUSDC shares`,
        protocol: 'Aave V3',
        amount: `${numAmount.toFixed(2)} USDC`,
        subAmount: `${removedShares.toFixed(4)} aaUSDC`,
        status: 'Completado',
        hash: hash.substring(0, 6) + '...' + hash.substring(hash.length - 4)
      };

      setHistory((prev) => [newRecord, ...prev]);
    } catch (err: any) {
      setError(err?.message || 'Error al ejecutar el retiro.');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    metrics,
    isProcessing,
    txHash,
    error,
    history,
    deposit,
    withdraw,
    refetch: fetchMetrics
  };
};
