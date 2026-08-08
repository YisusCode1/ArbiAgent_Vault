import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, ShieldCheck, Eye, Wallet, Zap, Cpu } from 'lucide-react';
import { useVault } from '../hooks/useVault';
import { useWeb3 } from '../hooks/useWeb3';

interface HomeViewProps {
  onNavigate: (tab: string) => void;
}

const worldCards = [
  {
    title: '01 · Portfolio',
    subtitle: 'Gestión inteligente',
    description: 'Un mundo donde tu wallet y la IA trabajan juntos para proteger y hacer crecer tu capital.',
  },
  {
    title: '02 · Estrategia',
    subtitle: 'Optimización activa',
    description: 'Rebalanceo automático y evaluación constante de oportunidades en Arbitrum y Aave V3.',
  },
  {
    title: '03 · Transparencia',
    subtitle: 'Visibilidad total',
    description: 'Todos los datos de tu vault disponibles con claridad en cada sección.',
  },
];

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const { wallet, connectWallet, disconnectWallet } = useWeb3();
  const { metrics } = useVault();

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
            IA VERIFICADA ON-CHAIN
          </div>

          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-6"
          >
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-6xl">
              Deposita USDC, deja que la IA decida cuándo generar rendimiento en Aave y retira cuando quieras.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
              Conecta tu wallet en Arbitrum Sepolia y empieza: deposita, sigue el rendimiento en tiempo real, y deja que la IA rebalancee entre USDC y Aave según tu perfil de riesgo.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="rounded-[28px] border border-white/10 bg-[#08101f]/90 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.16)]">
              <div className="flex items-center gap-3 text-[#d4af5f]">
                <Zap className="h-5 w-5" />
                <span className="text-xs uppercase tracking-[0.24em]">Rendimiento</span>
              </div>
              <p className="mt-4 text-lg font-semibold text-white">Optimizado para Arbitrum Sepolia</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">Monitorea APY, TVL y tu posición en tiempo real, actualizados directamente desde el contrato.</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-[#08101f]/90 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.16)]">
              <div className="flex items-center gap-3 text-[#d4af5f]">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs uppercase tracking-[0.24em]">Seguridad</span>
              </div>
              <p className="mt-4 text-lg font-semibold text-white">Tu wallet en control</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">Nunca cedes custodia de tus fondos. Cada decisión de la IA queda firmada y verificada on-chain antes de ejecutarse.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
            className="grid gap-4 lg:grid-cols-3"
          >
            {worldCards.map((card, index) => (
              <motion.div
                key={card.title}
                whileHover={{ y: -8, scale: 1.01 }}
                transition={{ duration: 0.25 }}
                className="rounded-[32px] border border-white/10 bg-[#081220]/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.24)]"
              >
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{card.title}</span>
                <h2 className="mt-4 text-2xl font-semibold text-white">{card.subtitle}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">{card.description}</p>
                <button
                  onClick={() => {
                    if (index === 0) onNavigate('vault');
                    else if (index === 1) onNavigate('estrategia');
                    else onNavigate('como-funciona');
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#d4af5f]/20 bg-[#d4af5f]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af5f] transition hover:bg-[#d4af5f]/20"
                >
                  Explorar mundo
                </button>
              </motion.div>
            ))}
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
              <span className="rounded-full bg-[#d4af5f]/10 px-3 py-1 text-[#d4af5f]">Activo</span>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Estado</p>
                <p className="mt-2 text-lg font-semibold text-white">{wallet.isConnected ? 'Conectada' : 'Sin conectar'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Address</p>
                <p className="mt-2 text-sm font-medium text-slate-100">{wallet.isConnected ? wallet.account : 'Sin wallet'}</p>
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
            <div className="mt-6 space-y-4 text-sm leading-6 text-slate-400">
              <p>1. Conecta tu wallet y verifica tu red Arbitrum Sepolia.</p>
              <p>2. Ingresa al vault y experimenta gráficos y métricas en tiempo real.</p>
              <p>3. Deposita y retira USDC con la IA alineada a tu perfil.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.24, ease: 'easeOut' }}
            className="space-y-4 rounded-[28px] border border-white/10 bg-[#08101f]/90 p-6"
          >
            <div className="flex items-center justify-between gap-3 text-slate-400">
              <div>
                <p className="text-xs uppercase tracking-[0.3em]">Tu vault</p>
                <p className="mt-2 text-2xl font-semibold text-white">${metrics.userAssets}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#d4af5f]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af5f]">
                Bronce
              </div>
            </div>
            <div className="grid gap-3 rounded-[24px] border border-white/10 bg-[#0b1722]/80 p-4 text-sm text-slate-400">
              <div className="flex items-center justify-between text-white">
                <span>TVL</span>
                <span>${metrics.totalAssets}</span>
              </div>
              <div className="flex items-center justify-between text-white">
                <span>Rendimiento</span>
                <span>8.03% APY</span>
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
                Conectar Wallet
              </button>
            ) : (
              <button
                onClick={() => onNavigate('vault')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d4af5f] px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-[#d4af5f]/20 transition hover:bg-[#c9a94a]"
              >
                <ArrowRight className="h-4 w-4" />
                Entrar al Vault
              </button>
            )}
            {wallet.isConnected && (
              <button
                onClick={disconnectWallet}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-transparent px-6 py-3 text-sm text-slate-300 transition hover:bg-white/5"
              >
                Desconectar Wallet
              </button>
            )}
          </motion.div>
        </aside>
      </motion.div>
    </div>
  );
};
