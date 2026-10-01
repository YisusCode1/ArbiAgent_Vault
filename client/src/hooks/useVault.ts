import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from './useWeb3';
import { Web3Service } from '../services/web3Service';
import { VaultMetrics, TransactionRecord } from '../types';

export const CONVERSION_RATE = 1.0087; // Solo como valor de respaldo: 1 aaUSDC ≈ 1.0087 USDC

// Convierte errores técnicos de ethers/MetaMask en mensajes que una persona entienda.
const friendlyError = (err: any, fallback: string): string => {
  const code = err?.code;
  const msg: string = err?.shortMessage || err?.message || '';
  if (code === 'ACTION_REJECTED' || code === 4001 || /user rejected|user denied/i.test(msg)) {
    return 'Cancelaste la transacción en tu wallet.';
  }
  if (code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(msg)) {
    return 'No tienes suficiente ETH de testnet para pagar el gas.';
  }
  if (/transfer amount exceeds balance/i.test(msg)) {
    return 'No tienes suficiente USDC para este depósito.';
  }
  console.error(err);
  return fallback;
};

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
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TransactionRecord[]>([]);

  const fetchMetrics = useCallback(async () => {
    try {
      if (wallet.isConnected && wallet.account) {
        const [totalAssets, userVaultData, userPrincipal, walletUsdc] = await Promise.all([
          Web3Service.getVaultTotalAssets(),
          Web3Service.getUserShares(wallet.account),
          Web3Service.getUserPrincipal(wallet.account),
          Web3Service.getUsdcBalance(wallet.account)
        ]);

        setMetrics((prev) => ({
          ...prev,
          totalAssets,
          userShares: userVaultData.shares,
          userAssets: userVaultData.assets,
          userPrincipal
        }));
        setUsdcBalance(walletUsdc);

        // Movimientos del usuario + rebalanceos de la IA, ordenados del más reciente al más antiguo
        const [userHistory, aiEvents] = await Promise.all([
          Web3Service.fetchUserActivityFromArbiscan(wallet.account),
          Web3Service.fetchOnChainEvents()
        ]);
        setHistory(
          [...userHistory, ...aiEvents].sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0))
        );
      } else {
        setHistory([]);
        setUsdcBalance('0.00');
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
      setError('Ingresa un monto mayor a cero.');
      return;
    }

    if (!wallet.isConnected) {
      setError('Conecta tu wallet para depositar.');
      return;
    }

    const walletUsdcNum = parseFloat(usdcBalance) || 0;
    if (numAmount > walletUsdcNum) {
      setError(`Tu saldo es de ${walletUsdcNum.toFixed(2)} USDC. Ingresa un monto menor o igual.`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      await Web3Service.switchToArbitrumSepolia();
      const hash = await Web3Service.deposit(amountStr);
      setTxHash(hash);

      // La tx ya está confirmada: actualiza saldos ahora y otra vez cuando el RPC indexe los eventos.
      fetchMetrics();
      setTimeout(() => fetchMetrics(), 3000);

      const addedShares = numAmount / CONVERSION_RATE;
      const newRecord: TransactionRecord = {
        date: new Date().toLocaleString('es-ES'),
        type: 'DEPÓSITO',
        typeBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        description: 'Depósito de USDC al vault',
        detail: 'Transacción confirmada',
        protocol: 'Aave V3',
        amount: `${numAmount.toFixed(2)} USDC`,
        subAmount: `~${addedShares.toFixed(4)} aaUSDC`,
        status: 'Completado',
        fullHash: hash,
        hash: hash ? `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}` : '-'
      };

      setHistory((prev) => [newRecord, ...prev]);
    } catch (err: any) {
      setError(friendlyError(err, 'No se pudo completar el depósito. Inténtalo de nuevo.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const withdraw = async (amountStr: string) => {
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Ingresa un monto mayor a cero.');
      return;
    }

    if (!wallet.isConnected) {
      setError('Conecta tu wallet para retirar.');
      return;
    }

    const currentUserAssets = parseFloat(metrics.userAssets) || 0;
    if (numAmount > currentUserAssets) {
      setError(`Tu posición disponible es de ${currentUserAssets.toFixed(2)} USDC.`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      await Web3Service.switchToArbitrumSepolia();
      const hash = await Web3Service.withdraw(amountStr);
      setTxHash(hash);

      fetchMetrics();
      setTimeout(() => fetchMetrics(), 3000);

      const removedShares = numAmount / CONVERSION_RATE;
      const newRecord: TransactionRecord = {
        date: new Date().toLocaleString('es-ES'),
        type: 'RETIRO',
        typeBadge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        description: 'Retiro de USDC del vault',
        detail: 'Transacción confirmada',
        protocol: 'Aave V3',
        amount: `${numAmount.toFixed(2)} USDC`,
        subAmount: `${removedShares.toFixed(4)} aaUSDC`,
        status: 'Completado',
        fullHash: hash,
        hash: hash ? `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}` : '-'
      };

      setHistory((prev) => [newRecord, ...prev]);
    } catch (err: any) {
      setError(friendlyError(err, 'No se pudo completar el retiro. Inténtalo de nuevo.'));
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    metrics,
    usdcBalance,
    isProcessing,
    txHash,
    error,
    history,
    deposit,
    withdraw,
    refetch: fetchMetrics
  };
};