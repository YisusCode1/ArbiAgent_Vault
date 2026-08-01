import React, { useState } from 'react';
import { TrendingUp, Layers, Info, ExternalLink, RefreshCw, AlertTriangle, CheckCircle, ArrowUpRight } from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import { useVault, CONVERSION_RATE } from '../hooks/useVault';
import { ARBITRUM_SEPOLIA_EXPLORER } from '../config/constants';

export const VaultView: React.FC = () => {
  const { wallet } = useWeb3();
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

  // Calculos matematicos exactos
  const userAssetsNum = parseFloat(metrics.userAssets) || 0;
  const totalAssetsNum = parseFloat(metrics.totalAssets) || 125446.51;
  const userSharesNum = parseFloat(metrics.userShares) || 0;

  const sharePercentage = totalAssetsNum > 0 ? (userAssetsNum / totalAssetsNum) * 100 : 0;
  const sharePctFormatted = sharePercentage < 0.001 && sharePercentage > 0 ? '<0.001%' : `${sharePercentage.toFixed(3)}%`;
  const donutOffset = Math.max(0, 113 - (113 * Math.min(1, sharePercentage / 100)));

  const generatedProfit = (userSharesNum * (CONVERSION_RATE - 1.0)).toFixed(2);

  // Fechas y puntos de curva segun periodo seleccionado
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
        <div className="bg-[#0D1424] border border-cyan-900/20 rounded-xl p-4 flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>APY actual</span>
              <Info className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-bold text-cyan-400">8.03%</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <span>+3.23% vs. ciclo anterior (4.80%)</span>
            </div>
          </div>
          <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0D1424] border border-cyan-900/20 rounded-xl p-4 flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>TVL del Vault</span>
              <Info className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-bold text-white">${totalAssetsNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>Arbitrum Sepolia</span>
            </div>
          </div>
          <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0D1424] border border-cyan-900/20 rounded-xl p-4 flex justify-between items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Tu posicion</span>
              <Info className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-bold text-white">${userAssetsNum.toFixed(2)}</div>
            <div className="text-xs text-slate-500 font-mono">{metrics.userShares} aaUSDC shares</div>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="24" cy="24" r="18" stroke="#1e293b" strokeWidth="4" fill="transparent" />
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="#06b6d4"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="113"
                strokeDashoffset={donutOffset}
              />
            </svg>
            <span className="absolute text-[8px] text-slate-300 font-mono">{sharePctFormatted}</span>
          </div>
        </div>

        <div className="bg-[#0D1424] border border-cyan-900/20 rounded-xl p-4 flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Rendimiento generado</span>
              <Info className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">+${generatedProfit}</div>
            <div className="text-xs text-slate-500">Calculado a 1 aaUSDC = {CONVERSION_RATE} USDC</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0D1424] border border-cyan-900/20 rounded-xl p-6 flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">VALOR DE TU POSICION</span>
              <div className="text-3xl font-bold text-white mt-1">${userAssetsNum.toFixed(2)}</div>
            </div>
            <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-800/40">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>aaUSDC</span>
            </div>
          </div>

          <div className="h-56 w-full relative my-4 overflow-hidden rounded-lg">
            <svg className="w-full h-full overflow-hidden" viewBox="0 0 500 150">
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d={currentTF.path}
                fill="url(#gradient)"
              />
              <path
                d={currentTF.path.replace(' L 485 150 L 0 150 Z', '')}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="3"
              />
              <circle cx="485" cy={currentTF.endY} r="4" fill="#06b6d4" />
              <circle cx="485" cy={currentTF.endY} r="3" fill="#ffffff" />
            </svg>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800/60 text-xs text-slate-400">
            <div className="flex gap-4 md:gap-6 overflow-x-auto">
              {currentTF.dates.map((date) => (
                <span key={date}>{date}</span>
              ))}
            </div>
            <div className="flex bg-[#070B14] p-1 rounded-lg border border-slate-800">
              {['1D', '7D', '30D', '90D', 'Todo'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    timeframe === tf ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50' : 'hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#0D1424] border border-cyan-900/20 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex border-b border-slate-800 pb-3 mb-6">
              <button
                onClick={() => setAction('deposit')}
                className={`flex-1 text-center font-medium text-sm pb-2 relative ${
                  action === 'deposit' ? 'text-cyan-400' : 'text-slate-400'
                }`}
              >
                Depositar
                {action === 'deposit' && <span className="absolute bottom-[-13px] left-0 w-full h-[2px] bg-cyan-400" />}
              </button>
              <button
                onClick={() => setAction('withdraw')}
                className={`flex-1 text-center font-medium text-sm pb-2 relative ${
                  action === 'withdraw' ? 'text-cyan-400' : 'text-slate-400'
                }`}
              >
                Retirar
                {action === 'withdraw' && <span className="absolute bottom-[-13px] left-0 w-full h-[2px] bg-cyan-400" />}
              </button>
            </div>

            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>{action === 'deposit' ? 'Monto a depositar' : 'Posicion disponible'}</span>
              <span className="text-white font-mono">{metrics.userAssets} USDC</span>
            </div>

            <div className="bg-[#070B14] border border-slate-800 rounded-xl p-3 flex items-center justify-between mb-3 relative">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent text-xl font-mono text-white outline-none w-1/2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg text-xs">
                  <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-[10px]">$</div>
                  <span>USDC</span>
                </div>
                <button
                  onClick={() => handlePreset('MAX')}
                  className="text-xs text-cyan-400 font-medium px-2 py-1 bg-cyan-950/50 rounded hover:bg-cyan-900/50 transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
              {['100', '500', '1,000', '50%'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePreset(preset)}
                  className="bg-[#070B14] border border-slate-800 hover:border-cyan-500/40 text-xs py-1.5 rounded-lg text-slate-300 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800/60 pt-4">
              <div className="flex justify-between">
                <span>Shares estimadas ({action === 'deposit' ? 'a recibir' : 'a quemar'})</span>
                <span className="text-slate-200 font-mono">
                  {amount ? (parseFloat(amount) / CONVERSION_RATE).toFixed(4) : '0.0000'} aaUSDC
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">Tasa de conversion <Info className="w-3 h-3" /></span>
                <span className="text-slate-200 font-mono">1 aaUSDC = {CONVERSION_RATE} USDC</span>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-800/50 rounded-lg flex items-center gap-2 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {txHash && (
              <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Transaccion enviada correctamente</span>
                </div>
                <a
                  href={`${ARBITRUM_SEPOLIA_EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:underline"
                >
                  <span>Arbiscan</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={handleAction}
              disabled={isProcessing || !amount || parseFloat(amount) <= 0}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>
                {isProcessing
                  ? 'Procesando transaccion...'
                  : action === 'deposit'
                  ? 'Depositar USDC'
                  : 'Retirar USDC'}
              </span>
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              Modo Arbitrum Sepolia Testnet. Operaciones {wallet.isDemo ? 'demostrativas (Wallet Simulada)' : 'en red de pruebas'}.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#070B14] border border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span><strong className="text-slate-200">MODO DEMO:</strong> Esta aplicacion utiliza datos simulados y contratos de prueba en Arbitrum Sepolia.</span>
        </div>
        <a href="#info" className="text-cyan-400 hover:underline flex items-center gap-1">
          Mas informacion <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
