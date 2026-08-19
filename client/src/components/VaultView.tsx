import React, { useState, useMemo } from 'react';
import { TrendingUp, Layers, Info, RefreshCw, AlertTriangle, CheckCircle, ArrowUpRight, Wallet, Activity } from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import { useVault, CONVERSION_RATE } from '../hooks/useVault';
import { ARBITRUM_SEPOLIA_EXPLORER } from '../config/constants';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const VaultView: React.FC = () => {
  const { wallet, connectWallet } = useWeb3();
  const { metrics, isProcessing, txHash, error, deposit, withdraw } = useVault();
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState<string>('');

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
  const userPrincipalNum = parseFloat(metrics.userPrincipal) || 0;
  const totalAssetsNum = parseFloat(metrics.totalAssets) || 0;
  
  // PnL Logic exactly as requested
  const pnl = userAssetsNum - userPrincipalNum;
  const pnlFormatted = pnl >= 0 ? `+$${pnl.toFixed(6)}` : `-$${Math.abs(pnl).toFixed(6)}`;
  const isProfit = pnl >= 0;
  const pnlPercent = userPrincipalNum > 0 ? (pnl / userPrincipalNum) * 100 : 0;
  
  const pnlColor = isProfit ? 'text-emerald-400' : 'text-rose-400';
  const pnlBgColor = isProfit ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30';

  // Area Chart Data
  const chartData = useMemo(() => {
    if (userAssetsNum === 0) return [];
    if (userAssetsNum > 1000000 || userPrincipalNum > 1000000) return []; // Guard: descarta valores anomalos
    const data = [];
    let currentVal = userPrincipalNum || (userAssetsNum * 0.98); 
    const step = (userAssetsNum - currentVal) / 6;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        valor: i === 0 ? userAssetsNum : currentVal + (step * (6 - i))
      });
    }
    return data;
  }, [userAssetsNum, userPrincipalNum]);

  // Donut Chart Data
  const strategyData = [
    { name: 'Aave V3 (Interés)', value: 85, color: '#0ea5e9' }, // Cyan/Blue
    { name: 'Vault (Líquido)', value: 15, color: '#6366f1' } // Indigo
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 text-zinc-100 font-sans">
      {/* 1. Panel de Resumen (Tus Números) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Depositado (Principal) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
            <Wallet className="w-4 h-4" />
            <span>Total Depositado</span>
          </div>
          <div className="text-3xl font-bold text-white">
            ${userPrincipalNum.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Inversión original (Principal)
          </div>
        </div>

        {/* Valor Actual */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
            <Layers className="w-4 h-4" />
            <span>Valor Actual (aAVaul)</span>
          </div>
          <div className="text-3xl font-bold text-white z-10">
            ${userAssetsNum.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500 mt-2 z-10">
            {metrics.userShares} shares on-chain
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-4">
            <Layers className="w-24 h-24" />
          </div>
        </div>

        {/* PnL */}
        <div className={`bg-zinc-900 border ${isProfit ? 'border-emerald-900/50' : 'border-rose-900/50'} rounded-xl p-5 flex flex-col justify-between relative`}>
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
            <Activity className="w-4 h-4" />
            <span>Ganancia / Pérdida (PnL)</span>
          </div>
          <div className={`text-3xl font-bold ${pnlColor}`}>
            {pnlFormatted}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${pnlBgColor} ${pnlColor}`}>
              {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(4)}%
            </span>
            <span className="text-xs text-zinc-500">Rendimiento neto</span>
          </div>
        </div>
      </div>

      {/* 2. Gráficas e Interacción */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rendimiento Histórico (AreaChart) y Estrategia (Donut) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-[350px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-zinc-400 uppercase tracking-wider font-semibold">Rendimiento Histórico</span>
              <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-950/40 px-3 py-1 rounded-full border border-blue-900/40">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>En vivo</span>
              </div>
            </div>
            
            <div className="flex-1 w-full relative">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isProfit ? '#34d399' : '#0ea5e9'} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={isProfit ? '#34d399' : '#0ea5e9'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${Number(val).toFixed(2)}`} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#e4e4e7' }}
                      formatter={(value: number) => [`$${value.toFixed(4)}`, 'Valor']}
                    />
                    <Area type="monotone" dataKey="valor" stroke={isProfit ? '#34d399' : '#0ea5e9'} strokeWidth={3} fillOpacity={1} fill="url(#colorValor)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                  <Activity className="w-8 h-8 mb-2 opacity-20" />
                  <span className="text-sm">Realiza un depósito para ver tus métricas</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center h-[200px]">
              <span className="text-sm text-zinc-400 uppercase tracking-wider font-semibold w-full text-left mb-2">Distribución de Estrategia</span>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={strategyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {strategyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#e4e4e7' }}
                    formatter={(value: number) => [`${value}%`, 'Alocación']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 text-[10px] text-zinc-400 mt-2 w-full justify-center">
                {strategyData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between h-[200px]">
              <div>
                <span className="text-sm text-zinc-400 uppercase tracking-wider font-semibold">Salud del Vault (TVL)</span>
                <div className="text-2xl font-bold text-white mt-2">${totalAssetsNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>APY Actual (Aave V3)</span>
                  <span className="text-emerald-400 font-bold">8.03%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Interacción (Depositar/Retirar) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between h-fit">
          <div>
            <div className="flex border-b border-zinc-800 pb-3 mb-6">
              <button
                onClick={() => setAction('deposit')}
                className={`flex-1 text-center font-medium text-sm pb-2 relative ${
                  action === 'deposit' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Depositar
                {action === 'deposit' && <span className="absolute bottom-[-13px] left-0 w-full h-[2px] bg-blue-500" />}
              </button>
              <button
                onClick={() => setAction('withdraw')}
                className={`flex-1 text-center font-medium text-sm pb-2 relative ${
                  action === 'withdraw' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Retirar
                {action === 'withdraw' && <span className="absolute bottom-[-13px] left-0 w-full h-[2px] bg-blue-500" />}
              </button>
            </div>

            <div className="flex justify-between text-xs text-zinc-400 mb-2">
              <span>{action === 'deposit' ? 'Monto a depositar' : 'Posicion disponible'}</span>
              <span className="text-white font-mono">{action === 'deposit' ? wallet.balance : userAssetsNum.toFixed(2)} {action === 'deposit' ? 'ETH (testnet)' : 'USDC'}</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center justify-between mb-4 relative hover:border-zinc-700 transition-colors">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent text-2xl font-mono text-white outline-none w-1/2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">$</div>
                  <span className="font-semibold">USDC</span>
                </div>
                <button
                  onClick={() => handlePreset('MAX')}
                  className="text-xs text-blue-400 font-medium px-2 py-1 bg-blue-500/10 rounded hover:bg-blue-500/20 transition-colors"
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
                  className="bg-zinc-800/50 hover:bg-zinc-800 text-xs py-2 rounded-lg text-zinc-300 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="space-y-3 text-xs text-zinc-400 border-t border-zinc-800/80 pt-5">
              <div className="flex justify-between">
                <span>Shares estimadas ({action === 'deposit' ? 'a recibir' : 'a quemar'})</span>
                <span className="text-zinc-200 font-mono">
                  {amount ? (parseFloat(amount) / CONVERSION_RATE).toFixed(4) : '0.0000'} aaUSDC
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">Tasa de conversion <Info className="w-3 h-3" /></span>
                <span className="text-zinc-200 font-mono">1 aaUSDC = {CONVERSION_RATE} USDC</span>
              </div>
            </div>

            {error && (
              <div className="mt-5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2 text-xs text-rose-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {txHash && (
              <div className="mt-5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-xs text-emerald-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Transacción enviada</span>
                </div>
                <a
                  href={`${ARBITRUM_SEPOLIA_EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-emerald-300 underline underline-offset-2"
                >
                  <span>Ver en Explorer</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <div className="mt-8">
            {!wallet.isConnected ? (
              <button
                onClick={connectWallet}
                disabled={wallet.isConnecting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {wallet.isConnecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4" />
                )}
                <span>{wallet.isConnecting ? 'Conectando...' : 'Conectar Wallet'}</span>
              </button>
            ) : (
              <button
                onClick={handleAction}
                disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-semibold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing && <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />}
                <span>
                  {isProcessing
                    ? 'Procesando en blockchain...'
                    : action === 'deposit'
                    ? 'Confirmar Depósito'
                    : 'Confirmar Retiro'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
