import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Wallet, LogOut, RefreshCw, AlertCircle, Menu, X, Copy, Check } from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import { ARBITRUM_SEPOLIA_CHAIN_ID } from '../config/constants';
import { shortAddress } from '../utils/format';

const logoUrl = new URL('../assets/arbiagent-symbol.png', import.meta.url).href;

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'vault', label: 'Vault' },
  { id: 'estrategia', label: 'AI Strategy' },
  { id: 'actividad', label: 'Activity' },  
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { wallet, connectWallet, disconnectWallet, switchNetwork } = useWeb3();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);

  const address = wallet.account ? shortAddress(wallet.account) : '';
  const isWrongNetwork = wallet.isConnected && wallet.chainId !== ARBITRUM_SEPOLIA_CHAIN_ID;

  // Cierra el menú de wallet al hacer clic fuera o al pulsar Escape
  useEffect(() => {
    if (!showDropdown) return;
    const onClickOutside = (e: MouseEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDropdown(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showDropdown]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    setShowDropdown(false);
  };

  const copyAddress = async () => {
    if (!wallet.account) return;
    try {
      await navigator.clipboard.writeText(wallet.account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Sin permiso de portapapeles: no hacemos nada
    }
  };

  const CopyButton = (
    <button
      onClick={copyAddress}
      className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-400 transition hover:text-cyan-300"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Address copied' : 'Copy address'}
    </button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050811]/95 backdrop-blur-xl px-4 py-4 md:px-6">
      <div className="mx-auto">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => handleNavigate('home')}
            aria-label="Go to home"
            className="flex items-center gap-3 text-left"
          >
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-[#d4af5f]/20 bg-[#071220] shadow-[0_0_30px_rgba(212,175,95,0.12)]">
              <img src={logoUrl} alt="ArbiAgent" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="font-semibold text-lg tracking-tight text-white">ArbiAgent</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 sm:text-xs">AI DEFI VAULT</p>
            </div>
          </button>

          <nav className="hidden md:flex flex-wrap items-center gap-4 justify-center">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                aria-current={activeTab === item.id ? 'page' : undefined}
                className={`text-sm font-medium transition ${
                  activeTab === item.id ? 'text-[#d4af5f]' : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-3">
            {isWrongNetwork ? (
              <button
                onClick={switchNetwork}
                className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300 transition hover:bg-amber-500/20"
              >
                <AlertCircle className="h-4 w-4" />
                Switch to Arbitrum Sepolia
              </button>
            ) : wallet.isConnected ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-[#09111f] border border-cyan-500/10 px-4 py-2 text-xs text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Arbitrum Sepolia
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-[#09111f] border border-slate-800 px-4 py-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-600" />
                Not connected
              </div>
            )}

            <div className="relative" ref={walletMenuRef}>
              {wallet.isConnected ? (
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  aria-expanded={showDropdown}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-500/10 bg-[#09111f] px-4 py-2 text-xs text-cyan-300 transition hover:bg-[#0f1a2d]"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {address}
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={wallet.isConnecting}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4f6dbb] to-[#d4af5f] px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-[#d4af5f]/20 transition hover:brightness-110 disabled:opacity-50"
                >
                  {wallet.isConnecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}

              {showDropdown && wallet.isConnected && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 rounded-3xl border border-slate-800 bg-[#08111f] p-3 shadow-[0_20px_40px_rgba(0,0,0,0.35)] text-sm text-slate-300"
                >
                  <div className="px-3 py-2 border-b border-slate-800/60">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Active address</p>
                    <p className="mt-2 text-sm text-white font-mono truncate" title={wallet.account ?? undefined}>
                      {wallet.account}
                    </p>
                    {wallet.balance && (
                      <p className="mt-2 text-xs text-cyan-300">Balance: {parseFloat(wallet.balance).toFixed(4)} ETH</p>
                    )}
                    {CopyButton}
                  </div>
                  <button
                    onClick={() => {
                      connectWallet();
                      setShowDropdown(false);
                    }}
                    className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-cyan-500/10 px-3 py-2 text-left text-xs text-cyan-300 transition hover:bg-cyan-500/15"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                    Reconnect / Switch wallet
                  </button>
                  <button
                    onClick={() => {
                      disconnectWallet();
                      setShowDropdown(false);
                    }}
                    className="mt-2 flex w-full items-center gap-2 rounded-2xl bg-rose-500/10 px-3 py-2 text-left text-xs text-rose-300 transition hover:bg-rose-500/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect wallet
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-slate-100 transition hover:bg-white/10 md:hidden"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="mt-4 space-y-4 border-t border-white/10 pt-4 md:hidden">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                    activeTab === item.id
                      ? 'bg-[#d4af5f]/15 text-[#d4af5f] border border-[#d4af5f]/30'
                      : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="space-y-3">
              {isWrongNetwork && (
                <button
                  onClick={() => {
                    switchNetwork();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300 transition hover:bg-amber-500/20"
                >
                  <AlertCircle className="h-4 w-4" />
                  Switch to Arbitrum Sepolia
                </button>
              )}

              {wallet.isConnected ? (
                // En móvil el menú de wallet va dentro del panel: el desplegable de escritorio está oculto en pantallas pequeñas
                <div className="rounded-2xl border border-cyan-500/20 bg-[#09111f] px-4 py-3">
                  {!isWrongNetwork && (
                    <span className="inline-flex items-center gap-2 text-xs text-cyan-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Arbitrum Sepolia
                    </span>
                  )}
                  <p className="mt-2 text-sm text-white font-mono break-all">{wallet.account}</p>
                  {wallet.balance && (
                    <p className="mt-1 text-xs text-cyan-300">Balance: {parseFloat(wallet.balance).toFixed(4)} ETH</p>
                  )}
                  {CopyButton}
                  <button
                    onClick={() => {
                      disconnectWallet();
                      setIsMobileMenuOpen(false);
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-rose-500/10 px-4 py-2 text-xs text-rose-300 transition hover:bg-rose-500/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect wallet
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    connectWallet();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4f6dbb] to-[#d4af5f] px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-[#d4af5f]/20"
                >
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
