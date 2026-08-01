import React, { useState } from 'react';
import { ChevronDown, Wallet, LogOut, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import { ARBITRUM_SEPOLIA_CHAIN_ID } from '../config/constants';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { wallet, connectWallet, disconnectWallet, switchNetwork } = useWeb3();
  const [showDropdown, setShowDropdown] = useState(false);

  const navItems = [
    { id: 'vault', label: 'Vault' },
    { id: 'estrategia', label: 'Estrategia IA' },
    { id: 'actividad', label: 'Actividad' },
    { id: 'como-funciona', label: 'Como funciona' },
  ];

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const isWrongNetwork = wallet.isConnected && !wallet.isDemo && wallet.chainId !== ARBITRUM_SEPOLIA_CHAIN_ID;

  return (
    <header className="bg-[#090D16] border-b border-cyan-900/30 text-white px-6 py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4 md:gap-0">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('vault')}>
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <span className="text-cyan-400 font-bold text-xl">A</span>
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none tracking-wide text-white">ArbiAgent</h1>
          <span className="text-xs text-cyan-400/80 tracking-widest font-mono">AI DEFI VAULT</span>
        </div>
      </div>

      <nav className="flex items-center gap-8">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`text-sm font-medium transition-colors relative py-1 ${
              activeTab === item.id ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label}
            {activeTab === item.id && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        {isWrongNetwork ? (
          <button
            onClick={switchNetwork}
            className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/50 text-amber-300 px-3 py-1.5 rounded-lg text-xs hover:bg-amber-500/30 transition-all"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Cambiar a Arbitrum Sepolia</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-[#121927] border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Arbitrum Sepolia</span>
          </div>
        )}

        <div className="relative">
          {wallet.isConnected ? (
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 bg-[#121927] hover:bg-[#1a2337] border border-cyan-500/30 px-3.5 py-1.5 rounded-lg text-xs font-mono text-cyan-300 transition-all"
            >
              <div className={`w-2 h-2 rounded-full ${wallet.isDemo ? 'bg-cyan-400' : 'bg-emerald-400'}`} />
              <span>{formatAddress(wallet.account)}</span>
              {wallet.isDemo && <span className="text-[10px] text-cyan-400/80 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/40">DEMO</span>}
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
          ) : (
            <button
              onClick={connectWallet}
              disabled={wallet.isConnecting}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {wallet.isConnecting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wallet className="w-3.5 h-3.5" />
              )}
              <span>{wallet.isConnecting ? 'Conectando...' : 'Conectar Wallet'}</span>
            </button>
          )}

          {showDropdown && wallet.isConnected && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0D1424] border border-slate-800 rounded-xl shadow-xl p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 font-mono uppercase">Direccion activa</p>
                  {wallet.isDemo && (
                    <span className="text-[9px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                      Modo Demo
                    </span>
                  )}
                </div>
                <p className="text-xs text-white font-mono truncate mt-0.5">{wallet.account}</p>
                {wallet.balance && (
                  <p className="text-[11px] text-cyan-400 font-mono mt-1">
                    Balance: {parseFloat(wallet.balance).toFixed(4)} ETH
                  </p>
                )}
              </div>
              
              <button
                onClick={() => {
                  connectWallet();
                  setShowDropdown(false);
                }}
                className="w-full text-left flex items-center gap-2 text-cyan-300 hover:bg-cyan-950/30 px-3 py-2 rounded-lg text-xs transition-colors mt-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reconectar / Cambiar wallet</span>
              </button>

              <button
                onClick={() => {
                  disconnectWallet();
                  setShowDropdown(false);
                }}
                className="w-full text-left flex items-center gap-2 text-rose-400 hover:bg-rose-950/30 px-3 py-2 rounded-lg text-xs transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desconectar wallet</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
