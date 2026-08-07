import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Layers, Info, RefreshCw, AlertTriangle, CheckCircle, ArrowUpRight, Wallet } from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import { useVault, CONVERSION_RATE } from '../hooks/useVault';
import { ARBITRUM_SEPOLIA_EXPLORER } from '../config/constants';

export const VaultView: React.FC = () => {
  const { wallet, connectWallet } = useWeb3();
  const { metrics, isProcessing, txHash, error, deposit, withdraw } = useVault();
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('30D');

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (action === 'deposit') {
      await deposit(amount);
      setAmount('');
    } else {
      await withdraw(amount);
      setAmount('');
    }
  };

  const handlePreset = (preset: string) => {
    if (preset === 'MAX') {
      setAmount(metrics.userAssets);
    } else if (preset === '50%') {
      const half = (parseFloat(metrics.userAssets) / 2).toFixed(2);
      setAmount(half);
    } else {
      setAmount(preset.replace(',', ''));
    }
  };

  const userAssetsNum = parseFloat(metrics.userAssets) || 0;
  const totalAssetsNum = parseFloat(metrics.totalAssets) || 0;
  const userSharesNum = parseFloat(metrics.userShares) || 0;

  const sharePercentage = totalAssetsNum > 0 ? (userAssetsNum / totalAssetsNum) * 100 : 0;
  const sharePctFormatted = sharePercentage < 0.001 && sharePercentage > 0 ? '<0.001%' : `${sharePercentage.toFixed(3)}%`;
  const donutOffset = Math.max(0, 113 - (113 * Math.min(1, sharePercentage / 100)));

  const generatedProfit = (userSharesNum * (CONVERSION_RATE - 1.0)).toFixed(2);

  const timeframeData: Record<string, { dates: string[]; path: string; endY: number }> = {
    '1D': {
      dates: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
      path: 'M 0 100 Q 80 95, 150 90 T 300 85 T 450 70 L 485 65 L 485 150 L 0 150 Z',
      endY: 65
    },
    '7D': {
      dates: ['21 May', '22 May', '23 May', '24 May', '25 May', '26 May', '27 May'],
      path: 'M 0 120 Q 80 110, 150 95 T 300 80 T 450 45 L 485 40 L 485 150 L 0 150 Z',
      endY: 40
    },
    '30D': {
      dates: ['29 Abr', '3 May', '7 May', '11 May', '15 May', '19 May', '23 May', '27 May'],
      path: 'M 0 130 Q 80 110, 150 90 T 300 70 T 450 30 L 485 20 L 485 150 L 0 150 Z',
      endY: 20
    },
    '90D': {
      dates: ['Mar', 'Abr', 'May'],
      path: 'M 0 140 Q 100 120, 200 90 T 350 50 L 485 15 L 485 150 L 0 150 Z',
      endY: 15
    },
    'Todo': {
      dates: ['Ene', 'Feb', 'Mar', 'Abr', 'May'],
      path: 'M 0 145 Q 120 130, 240 85 T 360 40 L 485 10 L 485 150 L 0 150 Z',
      endY: 10
    }
  };

  const currentTF = timeframeData[timeframe] || timeframeData['30D'];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 text-white font-sans">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#08111f] border border-cyan-500/10 shadow-[0_25px_60px_rgba(4,18,32,0.45)] rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3 text-slate-400 text-xs uppercase tracking-[0.25em]">
            <span>APY actual</span>
            <Info className="w-4 h-4" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-cyan-300">8.03%</div>
          <p className="mt-2 text-sm text-slate-400">Rendimiento Aave V3 en Arbitrum.</p>
        </div>

        <div className="bg-[#08111f] border border-cyan-500/10 shadow-[0_25px_60px_rgba(4,18,32,0.45)] rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3 text-slate-400 text-xs uppercase tracking-[0.25em]">
            <span>TVL del Vault</span>
            <Info className="w-4 h-4" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-white">${totalAssetsNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1 text-[11px] text-cyan-300">Arbitrum Sepolia</div>
        </div>

        <div className="bg-[#08111f] border border-cyan-500/10 shadow-[0_25px_60px_rgba(4,18,32,0.45)] rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3 text-slate-400 text-xs uppercase tracking-[0.25em]">
            <span>Tu posición</span>
            <Info className="w-4 h-4" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-white">${userAssetsNum.toFixed(2)}</div>
          <div className="mt-3 text-xs text-slate-500">{metrics.userShares} aaUSDC shares</div>
        </div>

        <div className="bg-[#08111f] border border-cyan-500/10 shadow-[0_25px_60px_rgba(4,18,32,0.45)] rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3 text-slate-400 text-xs uppercase tracking-[0.25em]">
            <span>Rendimiento generado</span>
            <Info className="w-4 h-4" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-emerald-400">+${generatedProfit}</div>
          <p className="mt-2 text-sm text-slate-500">1 aaUSDC = {CONVERSION_RATE} USDC</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="lg:col-span-2 rounded-[32px] border border-white/10 bg-[#07111f]/95 shadow-[0_40px_80px_rgba(0,0,0,0.35)] p-6 overflow-hidden"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Valor de tu posición</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">${userAssetsNum.toFixed(2)}</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 text-xs text-cyan-300 border border-cyan-500/20">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              aaUSDC
            </div>
          </div>

          <div className="relative rounded-[28px] border border-white/10 bg-[#0c1624]/90 p-5">
            <div className="absolute -left-8 top-1/2 h-24 w-24 rounded-full bg-cyan-500/5 blur-3xl" />
            <div className="absolute -right-8 bottom-6 h-28 w-28 rounded-full bg-slate-500/5 blur-3xl" />

            <div className="flex items-center justify-between gap-4 mb-4 text-sm text-slate-400">
              <span>Performance</span>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800/60 bg-slate-950/80 px-3 py-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Activo
              </div>
            </div>

            <motion.svg
              className="w-full h-64"
              viewBox="0 0 500 150"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <defs>
                <linearGradient id="vaultGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={currentTF.path}
                fill="url(#vaultGradient)"
                opacity="0.85"
              />
              <motion.path
                d={currentTF.path.replace(' L 485 150 L 0 150 Z', '')}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />
              <circle cx="485" cy={currentTF.endY} r="5" fill="#06b6d4" />
              <circle cx="485" cy={currentTF.endY} r="3" fill="#fff" />
            </motion.svg>

            <div className="flex flex-col gap-4 border-t border-slate-800/50 pt-4 text-sm text-slate-400">
              <div className="flex items-center justify-between gap-3 overflow-x-auto text-xs uppercase tracking-[0.2em] text-slate-500">
                {currentTF.dates.map((date) => (
                  <span key={date} className="min-w-[55px]">{date}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                {['1D', '7D', '30D', '90D', 'Todo'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`rounded-full px-4 py-2 text-[11px] transition ${
                      timeframe === tf
                        ? 'bg-cyan-500 text-slate-950 border border-cyan-500'
                        : 'bg-[#07111f] text-slate-300 border border-slate-800 hover:border-cyan-500/50 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.05 }}
          className="rounded-[32px] border border-white/10 bg-[#08111f]/95 shadow-[0_40px_80px_rgba(0,0,0,0.35)] p-6"
        >
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Operaciones</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Depositar o retirar</h3>
            </div>
            <div className="rounded-full bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-300">Fast mode</div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#091020]/90 p-5 space-y-5">
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.28em] text-slate-500">
              <span>{action === 'deposit' ? 'Monto a depositar' : 'Posición disponible'}</span>
              <span className="text-slate-200 font-mono">{metrics.userAssets} USDC</span>
            </div>

            <div className="rounded-[24px] border border-slate-800 bg-[#06101b] p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent text-3xl font-semibold text-white outline-none placeholder:text-slate-600"
                />
                <div className="flex items-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-200 uppercase tracking-[0.24em]">
                  USDC
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {['100', '500', '1,000', '50%'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePreset(preset)}
                    className="rounded-2xl border border-slate-800 bg-[#06101b] px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-500/40 hover:text-white"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 text-sm text-slate-400">
              <div className="flex items-center justify-between">
                <span>Shares estimadas ({action === 'deposit' ? 'a recibir' : 'a quemar'})</span>
                <span className="text-slate-200 font-mono">{amount ? (parseFloat(amount) / CONVERSION_RATE).toFixed(4) : '0.0000'} aaUSDC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">Tasa de conversión <Info className="w-3 h-3" /></span>
                <span className="text-slate-200 font-mono">1 aaUSDC = {CONVERSION_RATE} USDC</span>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-900/30 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <button
              onClick={wallet.isConnected ? handleAction : connectWallet}
              disabled={isProcessing || (!wallet.isConnected ? false : !amount || parseFloat(amount) <= 0)}
              className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Procesando...
                </span>
              ) : wallet.isConnected ? (
                action === 'deposit' ? 'Depositar USDC' : 'Retirar USDC'
              ) : (
                'Conecta tu wallet para operar'
              )}
            </button>
          </div>

          {txHash && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-4 text-sm text-emerald-200">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 font-semibold text-emerald-300">
                  <CheckCircle className="h-4 w-4" /> Transacción enviada
                </div>
                <a
                  href={`${ARBITRUM_SEPOLIA_EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-cyan-300 hover:text-white"
                >
                  Arbiscan <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
