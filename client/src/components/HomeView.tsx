import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, ShieldCheck, Wallet, Info, Check } from 'lucide-react';
import { useVault } from '../hooks/useVault';
import { useWeb3 } from '../hooks/useWeb3';
import { useStrategy } from '../hooks/useStrategy';
import { formatUSD, formatPercent, shortAddress } from '../utils/format';

interface HomeViewProps {
  onNavigate: (tab: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const { wallet, connectWallet, disconnectWallet } = useWeb3();
  const { metrics } = useVault();
  const { strategy, hasLoaded } = useStrategy();

  const quickStart = [
    { done: wallet.isConnected, text: 'Connect your wallet and check you are on Arbitrum Sepolia.' },
    { done: false, text: 'Open the vault and explore your balance and metrics.' },
    { done: false, text: 'Deposit and withdraw USDC whenever you want.' },
  ];
  // El primer paso pendiente se resalta como "siguiente acción".
  const nextStep = quickStart.findIndex((s) => !s.done);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 text-slate-100">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr]"
      >
        <section className="space-y-8 rounded-[36px] border border-white/10 bg-[#070b16]/90 p-8 shadow-[0_50px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-[#d4af5f]/20 bg-[#d4af5f]/10 px-4 py-2 text-xs uppercase tracking-[0.32em] text-[#d4af5f]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#d4af5f]" />
            SIGNALS VERIFIED ON-CHAIN
          </div>

          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-6"
          >
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-6xl">
              Deposit USDC. Let the AI work your yield. Withdraw anytime.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
              Connect your wallet on Arbitrum Sepolia and make your first deposit.
            </p>
            {/* Propuesta de confianza subida junto al hero */}
            <p className="flex max-w-2xl items-start gap-3 rounded-2xl border border-[#d4af5f]/20 bg-[#d4af5f]/5 px-4 py-3 text-sm leading-6 text-slate-200">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af5f]" />
              <span>
                The AI can only move funds between the vault and Aave, never to another address. Every decision is signed and verified on-chain before it executes.
              </span>
            </p>
          </motion.div>


        </section>

        <aside className="space-y-6 rounded-[36px] border border-white/10 bg-[#08111f]/95 p-8 shadow-[0_40px_80px_rgba(0,0,0,0.35)]">
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="rounded-[28px] border border-white/10 bg-[#0a1722]/90 p-6"
          >
            <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.3em] text-slate-500">
              <span>Wallet</span>
              {/* El estado ahora refleja la conexión real */}
              <span
                className={`rounded-full px-3 py-1 ${
                  wallet.isConnected ? 'bg-[#d4af5f]/10 text-[#d4af5f]' : 'bg-white/5 text-slate-400'
                }`}
              >
                {wallet.isConnected ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</p>
                <p className="mt-2 text-lg font-semibold text-white">{wallet.isConnected ? 'Connected' : 'Not connected'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Address</p>
                <p
                  className="mt-2 break-all text-sm font-medium text-slate-100"
                  title={wallet.account ?? undefined}
                >
                  {wallet.account ? shortAddress(wallet.account) : 'No wallet'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Balance</p>
                <p className="mt-2 text-lg font-semibold text-white">{wallet.isConnected ? `${Number(wallet.balance).toFixed(4)} ETH` : '---'}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease: 'easeOut' }}
            className="rounded-[28px] border border-white/10 bg-[#08101f]/90 p-6"
          >
            <div className="flex items-center gap-3 text-[#d4af5f]">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs uppercase tracking-[0.3em]">Quick start</span>
            </div>
            <ol className="mt-6 space-y-4 text-sm leading-6">
              {quickStart.map((step, i) => (
                <li
                  key={step.text}
                  className={`flex items-start gap-3 ${
                    step.done ? 'text-slate-500' : i === nextStep ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                      step.done
                        ? 'border-[#d4af5f] bg-[#d4af5f] text-slate-950'
                        : i === nextStep
                        ? 'border-[#d4af5f] text-[#d4af5f]'
                        : 'border-white/20 text-slate-500'
                    }`}
                  >
                    {step.done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className={step.done ? 'line-through decoration-slate-600' : ''}>{step.text}</span>
                </li>
              ))}
            </ol>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.24, ease: 'easeOut' }}
            className="space-y-4 rounded-[28px] border border-white/10 bg-[#08101f]/90 p-6"
          >
            <div className="flex items-center justify-between gap-3 text-slate-400">
              <div>
                {/* Etiqueta distinta a "TVL": esto es TU posición, no el total del vault */}
                <p className="text-xs uppercase tracking-[0.3em]">Your position</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatUSD(metrics.userAssets)}</p>
              </div>
              <div
                className="inline-flex cursor-help items-center gap-2 rounded-full bg-[#d4af5f]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af5f]"
                title="Your ArbiAgent tier, based on the capital you have deposited. Bronze is the starting tier."
              >
                Bronze
                <Info className="h-3.5 w-3.5" aria-label="What this tier means" />
              </div>
            </div>
            <div className="grid gap-3 rounded-[24px] border border-white/10 bg-[#0b1722]/80 p-4 text-sm text-slate-400">
              <div className="flex items-center justify-between text-white">
                <span>Vault TVL</span>
                <span>{formatUSD(metrics.totalAssets)}</span>
              </div>
              <div className="flex items-center justify-between text-white">
                <span>Yield</span>
                <span>{hasLoaded ? `${formatPercent(strategy.estimated_apy)} APY` : '—'}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.32, ease: 'easeOut' }}
            className="rounded-[28px] border border-[#d4af5f]/15 bg-[#08101f]/90 p-6 text-center"
          >
            {!wallet.isConnected ? (
              <button
                onClick={connectWallet}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4a6aa3] to-[#d4af5f] px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-[#d4af5f]/20 transition hover:brightness-110"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </button>
            ) : (
              <button
                onClick={() => onNavigate('vault')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d4af5f] px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-[#d4af5f]/20 transition hover:bg-[#c9a94a]"
              >
                <ArrowRight className="h-4 w-4" />
                Deposit USDC
              </button>
            )}
            {wallet.isConnected && (
              <button
                onClick={disconnectWallet}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-transparent px-6 py-3 text-sm text-slate-300 transition hover:bg-white/5"
              >
                Disconnect Wallet
              </button>
            )}
          </motion.div>
        </aside>
      </motion.div>
    </div>
  );
};
