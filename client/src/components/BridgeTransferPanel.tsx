import React, { useMemo, useState } from 'react';
import { ArrowDown, AlertTriangle, CheckCircle, Clock3, RefreshCw, Route, Wallet } from 'lucide-react';
import { useBridge } from '../hooks/useBridge';
import { useWeb3 } from '../hooks/useWeb3';
import { BridgeProgressModal } from './BridgeProgressModal';

const BRIDGE_FEE_PERCENT = Number(import.meta.env.VITE_STELLAR_BRIDGE_FEE_PERCENT || 0);
const ESTIMATED_STELLAR_FEE = Number(import.meta.env.VITE_STELLAR_NETWORK_FEE_XLM || 0.00001);

const formatUsdc = (value: number) => value.toFixed(2);

export const BridgeTransferPanel: React.FC = () => {
  const { wallet, switchNetwork } = useWeb3();
  const {
    stellarAccount,
    stellarUsdcBalance,
    status,
    txHash,
    arbitrumTxHash,
    vaultTxHash,
    error,
    connectStellarAccount,
    bridgeUsdcToArbitrum,
  } = useBridge();

  const [amount, setAmount] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);

  const available = Number(stellarUsdcBalance) || 0;
  const amountNumber = Number(amount) || 0;
  const feePercent = Number.isFinite(BRIDGE_FEE_PERCENT) ? Math.max(BRIDGE_FEE_PERCENT, 0) : 0;
  const bridgeFee = amountNumber * feePercent / 100;
  const amountReceived = Math.max(amountNumber - bridgeFee, 0);

  const validationError = useMemo(() => {
    if (!stellarAccount) return 'Connect your Stellar Testnet account first.';
    if (!wallet.account) return 'Connect your Arbitrum wallet first.';
    if (!amount) return 'Enter an amount to continue.';
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return 'Enter a valid amount greater than zero.';
    if (amountNumber > available) return `Insufficient Stellar USDC balance. Available: ${formatUsdc(available)} USDC.`;
    if (amountNumber < 0.01) return 'The minimum transfer amount is 0.01 USDC.';
    return null;
  }, [stellarAccount, wallet.account, amount, amountNumber, available]);

  const isWrongNetwork = wallet.isConnected && wallet.chainId !== 421614;
  const isBusy = ['building', 'signing', 'submitting', 'attesting', 'claiming'].includes(status);

  const setPercentage = (percentage: number) => {
    setConfirmed(false);
    setAmount((available * percentage / 100).toFixed(2));
  };

  const handleConfirm = async () => {
    if (validationError || isWrongNetwork) return;
    setConfirmed(true);
  };

  const handleSubmit = async () => {
    setProgressOpen(true);
    await bridgeUsdcToArbitrum(amount);
  };

  return (
    <>
    <section className="rounded-[28px] border border-white/10 bg-[#070b16]/95 p-5 shadow-[0_40px_80px_rgba(0,0,0,0.25)] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#d4af5f]">Stellar to Arbitrum</p>
          <h2 className="mt-1 text-lg font-bold text-white">Bridge USDC</h2>
        </div>
        <div className="rounded-full border border-[#d4af5f]/20 bg-[#d4af5f]/10 px-3 py-1 text-xs text-[#d4af5f]">
          Testnet transfer
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>Amount</span>
              <span>Available: <strong className="text-white">{formatUsdc(available)} USDC</strong></span>
            </div>

            <div className="flex items-center rounded-2xl border border-white/10 bg-[#08111f] p-4 focus-within:border-[#d4af5f]/50">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setConfirmed(false);
                }}
                disabled={!stellarAccount || isBusy}
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent text-2xl font-mono text-white outline-none"
              />
              <span className="ml-3 text-sm font-semibold text-zinc-300">USDC</span>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((percentage) => (
                <button
                  key={percentage}
                  type="button"
                  onClick={() => setPercentage(percentage)}
                  disabled={!stellarAccount || isBusy}
                  className="rounded-lg border border-white/10 bg-[#0a1722] py-2 text-xs text-slate-300 transition hover:border-[#d4af5f]/40 hover:text-[#d4af5f] disabled:opacity-50"
                >
                  {percentage === 100 ? 'Max' : `${percentage}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-[#08111f] p-4 text-xs">
            <div className="flex justify-between gap-4 text-zinc-400">
              <span>Estimated bridge fee ({feePercent}%):</span>
              <span className="font-mono text-zinc-200">{formatUsdc(bridgeFee)} USDC</span>
            </div>
            <div className="flex justify-between gap-4 text-zinc-400">
              <span>Estimated Stellar network fee:</span>
              <span className="font-mono text-zinc-200">{ESTIMATED_STELLAR_FEE} XLM</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-zinc-800 pt-2 text-zinc-300">
              <span>You receive approximately:</span>
              <strong className="font-mono text-emerald-400">{formatUsdc(amountReceived)} USDC</strong>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-[#d4af5f]/15 bg-[#08111f] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Route className="h-4 w-4 text-[#d4af5f]" />
            Operation summary
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <p className="text-zinc-500">Source</p>
              <p className="mt-1 flex items-center gap-2 text-zinc-200"><Wallet className="h-3.5 w-3.5 text-cyan-400" /> Stellar Testnet</p>
              <p className="mt-1 truncate font-mono text-zinc-500">{stellarAccount || 'Not connected'}</p>
            </div>

            <ArrowDown className="h-4 w-4 text-zinc-600" />

            <div>
              <p className="text-zinc-500">Destination</p>
              <p className="mt-1 text-zinc-200">Arbitrum Sepolia</p>
              <p className="mt-1 truncate font-mono text-zinc-500">{wallet.account || 'No EVM wallet connected'}</p>
            </div>

            <div className="flex items-center justify-between border-t border-cyan-900/30 pt-3 text-zinc-400">
              <span className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" /> Estimated time</span>
              <strong className="text-zinc-200">10–20 minutes</strong>
            </div>
          </div>

          {!stellarAccount && (
            <button
              type="button"
              onClick={() => void connectStellarAccount()}
              className="w-full rounded-lg border border-[#d4af5f]/20 bg-[#d4af5f]/10 py-2.5 text-xs font-medium text-[#d4af5f] hover:bg-[#d4af5f]/15"
            >
              Connect Stellar Snap
            </button>
          )}

          {isWrongNetwork && wallet.account && (
            <button
              type="button"
              onClick={() => void switchNetwork()}
              className="w-full rounded-lg border border-amber-500/20 bg-amber-500/10 py-2.5 text-xs font-medium text-amber-300"
            >
              Switch to Arbitrum Sepolia
            </button>
          )}

          {validationError && amount && (
            <p className="flex items-start gap-2 text-xs text-rose-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {validationError}
            </p>
          )}

          {error && (
            <p className="flex items-start gap-2 text-xs text-rose-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          {status === 'completed' && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <p className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Transfer completed</p>
              {txHash && <p className="mt-2 break-all font-mono text-[10px]">Stellar: {txHash}</p>}
              {arbitrumTxHash && <p className="mt-1 break-all font-mono text-[10px]">Arbitrum: {arbitrumTxHash}</p>}
            </div>
          )}

          {!confirmed ? (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={Boolean(validationError) || isWrongNetwork || isBusy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4a6aa3] to-[#d4af5f] py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Review operation
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? <><RefreshCw className="h-4 w-4 animate-spin" /> Processing bridge...</> : 'Confirm transfer'}
            </button>
          )}
        </div>
      </div>

      <BridgeProgressModal
        open={progressOpen}
        status={status}
        error={error}
        stellarTxHash={txHash}
        arbitrumTxHash={arbitrumTxHash}
        vaultTxHash={vaultTxHash}
        onClose={() => setProgressOpen(false)}
      />
    </section>
    </>
  );
};
