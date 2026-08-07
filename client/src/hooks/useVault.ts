import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from './useWeb3';
import { Web3Service } from '../services/web3Service';
import { VaultMetrics, TransactionRecord } from '../types';

export const CONVERSION_RATE = 1.0087; // 1 aaUSDC = 1.0087 USDC

export const useVault = () => {
  const { wallet } = useWeb3();
  const [metrics, setMetrics] = useState<VaultMetrics>({
    totalAssets: '0.00',
    userShares: '0.0000',
    userAssets: '0.00',
    userPrincipal: '0.00',
    performanceFee: 10,
    assetSymbol: 'USDC'
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TransactionRecord[]>([]);

  const fetchMetrics = useCallback(async () => {
    try {
      if (wallet.isConnected && wallet.account) {
        const totalAssets = await Web3Service.getVaultTotalAssets();
        const userVaultData = await Web3Service.getUserShares(wallet.account);
        const userPrincipal = await Web3Service.getUserPrincipal(wallet.account);
        
        setMetrics((prev) => ({
          ...prev,
          totalAssets,
          userShares: userVaultData.shares,
          userAssets: userVaultData.assets,
          userPrincipal
        }));
      }
    } catch (err: any) {
      console.error('Error fetching vault metrics:', err);
    }
  }, [wallet.account, wallet.isConnected]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const deposit = async (amountStr: string) => {
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Ingrese un monto valido mayor a cero.');
      return;
    }

    if (!wallet.isConnected) {
      setError('Por favor conecta tu wallet para realizar un deposito.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      const hash = await Web3Service.deposit(amountStr);
      setTxHash(hash);
      
      // Obtener datos reales de la blockchain
      await fetchMetrics();
      
      const addedShares = numAmount / CONVERSION_RATE;
      const newRecord: TransactionRecord = {
        date: new Date().toLocaleString('es-ES'),
        type: 'DEPÓSITO',
        typeBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        description: 'Deposito de USDC al vault',
        detail: `Recibidas ~${addedShares.toFixed(4)} aaUSDC shares`,
        protocol: 'Aave V3',
        amount: `${numAmount.toFixed(2)} USDC`,
        subAmount: `~${addedShares.toFixed(4)} aaUSDC`,
        status: 'Completado',
        hash: hash ? `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}` : '-'
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

    if (!wallet.isConnected) {
      setError('Por favor conecta tu wallet para realizar un retiro.');
      return;
    }

    const currentUserAssets = parseFloat(metrics.userAssets) || 0;
    if (numAmount > currentUserAssets) {
      setError(`Monto supera tu posicion disponible de $${metrics.userAssets} USDC.`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      const hash = await Web3Service.withdraw(amountStr);
      setTxHash(hash);
      
      // Obtener datos reales de la blockchain
      await fetchMetrics();

      const removedShares = numAmount / CONVERSION_RATE;
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
        hash: hash ? `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}` : '-'
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
