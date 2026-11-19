import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { WalletState } from '../types';
import { Web3Service } from '../services/web3Service';
import { ARBITRUM_SEPOLIA_CHAIN_ID } from '../config/constants';

export interface Web3ContextType {
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  refreshEvmBalances: () => Promise<void>;
}

export const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const EMPTY_WALLET: WalletState = {
  account: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  isDemo: false,
  error: null,
  balance: '0',
  evmUsdcBalance: '0.00'
};

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);

  const refreshEvmBalances = useCallback(async () => {
    if (!wallet.account) return;
    try {
      const [ethBalance, usdcBalance] = await Promise.all([
        Web3Service.connectWallet().then((state) => state.balance).catch(() => wallet.balance),
        Web3Service.getUsdcBalance(wallet.account)
      ]);
      setWallet((prev) => ({ ...prev, balance: ethBalance, evmUsdcBalance: usdcBalance, error: null }));
    } catch (err: any) {
      setWallet((prev) => ({ ...prev, error: err?.message || 'Could not refresh wallet balances.' }));
    }
  }, [wallet.account, wallet.balance]);

  const connectWallet = useCallback(async () => {
    setWallet((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const { account, chainId, balance } = await Web3Service.connectWallet();
      const evmUsdcBalance = await Web3Service.getUsdcBalance(account);
      setWallet({
        account,
        chainId,
        isConnected: true,
        isConnecting: false,
        isDemo: false,
        error: null,
        balance,
        evmUsdcBalance
      });
      localStorage.setItem('arbiagent_wallet_connected', 'true');
    } catch (err: any) {
      setWallet({ ...EMPTY_WALLET, error: err?.message || 'Failed to connect the MetaMask wallet.' });
      localStorage.removeItem('arbiagent_wallet_connected');
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet(EMPTY_WALLET);
    localStorage.removeItem('arbiagent_wallet_connected');
  }, []);

  const switchNetwork = useCallback(async () => {
    try {
      await Web3Service.switchToArbitrumSepolia();
      if (wallet.account) await connectWallet();
    } catch {
      setWallet((prev) => ({ ...prev, error: 'Could not switch to the Arbitrum Sepolia network.' }));
    }
  }, [wallet.account, connectWallet]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnectWallet();
      else void connectWallet();
    };

    const handleChainChanged = (hexChainId: string) => {
      const newChainId = parseInt(hexChainId, 16);
      setWallet((prev) => ({ ...prev, chainId: newChainId }));
      if (newChainId === ARBITRUM_SEPOLIA_CHAIN_ID) void refreshEvmBalances();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    if (localStorage.getItem('arbiagent_wallet_connected') === 'true') void connectWallet();

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [connectWallet, disconnectWallet, refreshEvmBalances]);

  useEffect(() => {
    if (!wallet.isConnected || !wallet.account) return;
    void refreshEvmBalances();
    const interval = window.setInterval(() => void refreshEvmBalances(), 30_000);
    return () => window.clearInterval(interval);
  }, [wallet.isConnected, wallet.account, refreshEvmBalances]);

  return (
    <Web3Context.Provider value={{ wallet, connectWallet, disconnectWallet, switchNetwork, refreshEvmBalances }}>
      {children}
    </Web3Context.Provider>
  );
};
