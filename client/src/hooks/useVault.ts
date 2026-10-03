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
    return 'You cancelled the transaction in your wallet.';
  }
  if (code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(msg)) {
    return 'You do not have enough testnet ETH to pay for gas.';
  }
  if (/transfer amount exceeds balance/i.test(msg)) {
    return 'You do not have enough USDC for this deposit.';
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
      setError('Enter an amount greater than zero.');
      return;
    }

    if (!wallet.isConnected) {
      setError('Connect your wallet to deposit.');
      return;
    }

    const walletUsdcNum = parseFloat(usdcBalance) || 0;
    if (numAmount > walletUsdcNum) {
      setError(`Your balance is ${walletUsdcNum.toFixed(2)} USDC. Enter that amount or less.`);
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
        date: new Date().toLocaleString('en-US'),
        type: 'DEPOSIT',
        typeBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        description: 'USDC deposit to the vault',
        detail: 'Transaction confirmed',
        protocol: 'Aave V3',
        amount: `${numAmount.toFixed(2)} USDC`,
        subAmount: `~${addedShares.toFixed(4)} aaUSDC`,
        status: 'Completed',
        fullHash: hash,
        hash: hash ? `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}` : '-'
      };

      setHistory((prev) => [newRecord, ...prev]);
    } catch (err: any) {
      setError(friendlyError(err, 'The deposit could not be completed. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const withdraw = async (amountStr: string) => {
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    if (!wallet.isConnected) {
      setError('Connect your wallet to withdraw.');
      return;
    }

    const currentUserAssets = parseFloat(metrics.userAssets) || 0;
    if (numAmount > currentUserAssets) {
      setError(`Your available position is ${currentUserAssets.toFixed(2)} USDC.`);
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
        date: new Date().toLocaleString('en-US'),
        type: 'WITHDRAWAL',
        typeBadge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        description: 'USDC withdrawal from the vault',
        detail: 'Transaction confirmed',
        protocol: 'Aave V3',
        amount: `${numAmount.toFixed(2)} USDC`,
        subAmount: `${removedShares.toFixed(4)} aaUSDC`,
        status: 'Completed',
        fullHash: hash,
        hash: hash ? `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}` : '-'
      };

      setHistory((prev) => [newRecord, ...prev]);
    } catch (err: any) {
      setError(friendlyError(err, 'The withdrawal could not be completed. Please try again.'));
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