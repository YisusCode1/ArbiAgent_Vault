import React, { useState, useMemo } from 'react';
import { Layers, Info, RefreshCw, AlertTriangle, CheckCircle, ArrowUpRight, Wallet, Activity } from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import { useVault, CONVERSION_RATE } from '../hooks/useVault';
import { useStrategy } from '../hooks/useStrategy';
import { ARBITRUM_SEPOLIA_EXPLORER, ARBITRUM_SEPOLIA_CHAIN_ID } from '../config/constants';
import { formatUSD, formatPercent, riskLabel, modeLabel } from '../utils/format';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ACTION_LABELS: Record<string, string> = {
  SUPPLY: 'Supply to Aave',
  WITHDRAW: 'Withdraw from Aave',
  HOLD: 'Hold position',
};

// El backend puede devolver 0.9 o 90: normaliza a porcentaje
const toPercent = (v: number) => (v <= 1 ? v * 100 : v);

export const VaultView: React.FC = () => {
  const { wallet, connectWallet, switchNetwork } = useWeb3();
  const isWrongNetwork = wallet.isConnected && wallet.chainId !== ARBITRUM_SEPOLIA_CHAIN_ID;
  const { metrics, usdcBalance, isProcessing, txHash, error, deposit, withdraw } = useVault();
  const { strategy, hasLoaded, riskMode, riskModes } = useStrategy();
  const actionLabel = ACTION_LABELS[strategy.action] ?? strategy.action;
  const confidencePct = Math.min(Math.round(toPercent(strategy.confidence)), 100);
  const activeModeInfo = riskModes.find((m) => m.id === riskMode);
  const maxExposurePct = activeModeInfo ? Math.round(toPercent(activeModeInfo.max_exposure)) : null;
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState<string>('');

  const userAssetsNum = parseFloat(metrics.userAssets) || 0;
  const userSharesNum = parseFloat(metrics.userShares) || 0;
  const userPrincipalNum = parseFloat(metrics.userPrincipal) || 0;
  const totalAssetsNum = parseFloat(metrics.totalAssets) || 0;
  const usdcBalanceNum = parseFloat(usdcBalance) || 0;

  // Lo máximo que puedes mover según la pestaña: saldo de tu wallet (depositar) o tu posición (retirar)
  const availableNum = action === 'deposit' ? usdcBalanceNum : userAssetsNum;
  const amountNum = parseFloat(amount) || 0;
  const exceedsAvailable = amountNum > availableNum;

  // Tasa real: USDC por share según tu posición on-chain.
  // Si aún no tienes shares, cae a la constante como referencia.
  const conversionRate = userSharesNum > 0 && userAssetsNum > 0 ? userAssetsNum / userSharesNum : CONVERSION_RATE;

  const changeAction = (next: 'deposit' | 'withdraw') => {
    setAction(next);
    setAmount('');
  };

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (action === 'deposit') {
      await deposit(amount);
    } else {
      await withdraw(amount);
    }
    setAmount('');
  };

  // Depositar: montos fijos. Retirar: porcentajes de tu posición.
  const presets = action === 'deposit' ? ['10', '100', '500', '1000'] : ['25%', '50%', '75%'];

  const handlePreset = (preset: string) => {
    if (preset.endsWith('%')) {
      const pct = parseFloat(preset) / 100;
      setAmount((userAssetsNum * pct).toFixed(2));
    } else {
      setAmount(preset);
    }
  };

  const handleMax = () => setAmount(action === 'deposit' ? usdcBalance : metrics.userAssets);

  // PnL
  const pnl = userAssetsNum - userPrincipalNum;
  const isProfit = pnl >= 0;
  const pnlFormatted = `${isProfit ? '+' : '-'}${formatUSD(Math.abs(pnl), 6)}`;
  const pnlPercent = userPrincipalNum > 0 ? (pnl / userPrincipalNum) * 100 : 0;

  const pnlColor = isProfit ? 'text-emerald-400' : 'text-rose-400';
  const pnlBgColor = isProfit ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30';

  // Curva estimada entre el principal y el valor actual (no es historial on-chain)
  const chartData = useMemo(() => {
    if (userAssetsNum === 0) return [];
    if (userAssetsNum > 1000000 || userPrincipalNum > 1000000) return []; // Guard: descarta valores anómalos
    const data = [];
    const currentVal = userPrincipalNum || userAssetsNum * 0.98;
    const step = (userAssetsNum - currentVal) / 6;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        valor: i === 0 ? userAssetsNum : currentVal + step * (6 - i),
      });
    }
    return data;
  }, [userAssetsNum, userPrincipalNum]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 text-zinc-100 font-sans">
      {/* 1. Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
            <Wallet className="w-4 h-4" />
            <span>Total deposited</span>
          </div>
          <div className="text-3xl font-bold text-white">{formatUSD(userPrincipalNum)}</div>
          <div className="text-xs text-zinc-500 mt-2">What you have put into the vault (principal)</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
            <Layers className="w-4 h-4" />
            <span>Current value</span>
          </div>
          <div className="text-3xl font-bold text-white z-10">{formatUSD(userAssetsNum)}</div>
          <div className="text-xs text-zinc-500 mt-2 z-10">{userSharesNum.toFixed(4)} shares on-chain</div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-4">
            <Layers className="w-24 h-24" />
          </div>
        </div>

        <div className={`bg-zinc-900 border ${isProfit ? 'border-emerald-900/50' : 'border-rose-900/50'} rounded-xl p-5 flex flex-col justify-between relative`}>
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
            <Activity className="w-4 h-4" />
            <span>Profit / loss (PnL)</span>
          </div>
          <div className={`text-3xl font-bold ${pnlColor}`}>{pnlFormatted}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${pnlBgColor} ${pnlColor}`}>
              {pnlPercent >= 0 ? '+' : ''}
              {pnlPercent.toFixed(4)}%
            </span>
            <span className="text-xs text-zinc-500">Net return</span>
          </div>
        </div>
      </div>

      {/* 2. Gráficas e interacción */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-[350px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-zinc-400 uppercase tracking-wider font-semibold">Your position over time</span>
              <div
                className="flex items-center gap-2 text-xs text-blue-400 bg-blue-950/40 px-3 py-1 rounded-full border border-blue-900/40 cursor-help"
                title="Estimated curve between your deposit and your current value. Your current value is read from the contract."
              >
                <Info className="w-3 h-3" />
                <span>Estimated</span>
              </div>
            </div>

            <div className="flex-1 w-full relative">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isProfit ? '#34d399' : '#0ea5e9'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={isProfit ? '#34d399' : '#0ea5e9'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#52525b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => formatUSD(val)}
                      domain={['dataMin - 0.5', 'dataMax + 0.5']}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#e4e4e7' }}
                      formatter={(value) => [formatUSD(Number(value), 4), 'Value']}
                    />
                    <Area type="monotone" dataKey="valor" stroke={isProfit ? '#34d399' : '#0ea5e9'} strokeWidth={3} fillOpacity={1} fill="url(#colorValor)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 text-center px-6">
                  <Activity className="w-8 h-8 mb-2 opacity-30" />
                  <span className="text-sm">
                    {wallet.isConnected
                      ? 'No deposits yet. Make your first deposit and you will see your position grow here.'
                      : 'Connect your wallet to see your position.'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col min-h-[200px]">
              <span className="text-sm text-zinc-400 uppercase tracking-wider font-semibold">What the AI recommends now</span>
              {hasLoaded ? (
                <div className="mt-3 space-y-3">
                  <div className="text-xl font-bold text-white">{actionLabel}</div>
                  <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                      <span>Confidence</span>
                      <span className="text-zinc-200 font-medium">{confidencePct}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-1.5 rounded-full"
                        style={{ width: `${confidencePct}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-zinc-500">
                    <div className="flex justify-between">
                      <span>Volatility (7 days)</span>
                      <span className="text-zinc-200">{strategy.volatility_7d.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ArbiAgent score</span>
                      <span className="text-zinc-200">{strategy.arbiagent_score.toFixed(1)} / 100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max. Aave exposure ({modeLabel(riskMode)})</span>
                      <span className="text-zinc-200">{maxExposurePct !== null ? `${maxExposurePct}%` : '—'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">
                  The AI recommendation is not available right now. Check that the backend is running.
                </p>
              )}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between min-h-[200px]">
              <div>
                <span className="text-sm text-zinc-400 uppercase tracking-wider font-semibold">Vault TVL</span>
                <div className="text-2xl font-bold text-white mt-2">{formatUSD(totalAssetsNum)}</div>
                <div className="text-xs text-zinc-500 mt-1">Total deposited by all users</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>AI-estimated APY</span>
                  <span className="text-emerald-400 font-bold">
                    {hasLoaded ? formatPercent(strategy.estimated_apy) : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Risk level</span>
                  <span className="text-zinc-200 font-medium">{hasLoaded ? riskLabel(strategy.risk_level) : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de interacción */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between h-fit">
          <div>
            {isWrongNetwork && (
              <div className="mb-5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Your wallet is not on Arbitrum Sepolia.</span>
                </div>
                <button
                  onClick={switchNetwork}
                  className="rounded-full border border-amber-500/30 px-3 py-1 font-medium hover:bg-amber-500/20 transition-colors whitespace-nowrap"
                >
                  Switch network
                </button>
              </div>
            )}

            <div className="flex border-b border-zinc-800 pb-3 mb-6">
              <button
                onClick={() => changeAction('deposit')}
                className={`flex-1 text-center font-medium text-sm pb-2 relative ${action === 'deposit' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Deposit
                {action === 'deposit' && <span className="absolute bottom-[-13px] left-0 w-full h-[2px] bg-blue-500" />}
              </button>
              <button
                onClick={() => changeAction('withdraw')}
                className={`flex-1 text-center font-medium text-sm pb-2 relative ${action === 'withdraw' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Withdraw
                {action === 'withdraw' && <span className="absolute bottom-[-13px] left-0 w-full h-[2px] bg-blue-500" />}
              </button>
            </div>

            <div className="flex justify-between text-xs text-zinc-400 mb-2">
              <span>{action === 'deposit' ? 'Amount to deposit' : 'Available position'}</span>
              <span className="text-white font-mono">
                {wallet.isConnected ? `Balance: ${availableNum.toFixed(2)} USDC` : ''}
              </span>
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
                  onClick={handleMax}
                  className="text-xs text-blue-400 font-medium px-2 py-1 bg-blue-500/10 rounded hover:bg-blue-500/20 transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            {wallet.isConnected && exceedsAvailable && (
              <p className="-mt-2 mb-4 text-xs text-rose-400">
                {action === 'deposit' ? 'Exceeds your USDC balance.' : 'Exceeds your available position.'}
              </p>
            )}
            {wallet.isConnected && !isWrongNetwork && action === 'deposit' && usdcBalanceNum === 0 && (
              <p className="-mt-2 mb-4 text-xs text-zinc-400">
                You have no USDC on Arbitrum Sepolia. You need testnet USDC to deposit.
              </p>
            )}

            <div className={`grid ${presets.length === 4 ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mb-6`}>
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePreset(preset)}
                  className="bg-zinc-800/50 hover:bg-zinc-800 text-xs py-2 rounded-lg text-zinc-300 transition-colors"
                >
                  {preset.endsWith('%') ? preset : `$${preset}`}
                </button>
              ))}
            </div>

            <div className="space-y-3 text-xs text-zinc-400 border-t border-zinc-800/80 pt-5">
              <div className="flex justify-between">
                <span>Estimated shares ({action === 'deposit' ? 'to receive' : 'to burn'})</span>
                <span className="text-zinc-200 font-mono">
                  {amount ? (parseFloat(amount) / conversionRate).toFixed(4) : '0.0000'} aaUSDC
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span
                  className="flex items-center gap-1 cursor-help"
                  title="Each share represents a part of the vault. Its value rises as the vault earns yield."
                >
                  Conversion rate <Info className="w-3 h-3" />
                </span>
                <span className="text-zinc-200 font-mono">1 aaUSDC = {conversionRate.toFixed(4)} USDC</span>
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
                  <span>Transaction sent</span>
                </div>
                <a
                  href={`${ARBITRUM_SEPOLIA_EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-emerald-300 underline underline-offset-2"
                >
                  <span>View on Explorer</span>
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
                {wallet.isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                <span>{wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            ) : (
              <button
                onClick={handleAction}
                disabled={isProcessing || !amount || amountNum <= 0 || exceedsAvailable}
                className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-semibold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing && <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />}
                <span>
                  {isProcessing ? 'Processing on-chain...' : action === 'deposit' ? 'Confirm deposit' : 'Confirm withdrawal'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
