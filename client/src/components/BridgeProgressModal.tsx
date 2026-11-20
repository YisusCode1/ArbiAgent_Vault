import React from 'react';
import { Check, Clock3, ExternalLink, RefreshCw, XCircle } from 'lucide-react';
import { BridgeStatus } from '../types';

interface BridgeProgressModalProps {
  open: boolean;
  status: BridgeStatus;
  error: string | null;
  stellarTxHash: string | null;
  arbitrumTxHash: string | null;
  vaultTxHash?: string | null;
  onClose: () => void;
}

const STELLAR_EXPERT_URL = 'https://stellar.expert/explorer/testnet/tx';
const ARBISCAN_TX_URL = 'https://sepolia.arbiscan.io/tx';

const steps = [
  { key: 'stellar', label: 'Stellar Burn' },
  { key: 'attesting', label: 'CCTP Attestation' },
  { key: 'claiming', label: 'Arbitrum Claim' },
  { key: 'depositing', label: 'Vault Deposit' },
];

export const BridgeProgressModal: React.FC<BridgeProgressModalProps> = ({
  open,
  status,
  error,
  stellarTxHash,
  arbitrumTxHash,
  vaultTxHash,
  onClose,
}) => {
  if (!open) return null;

  const busy = ['building', 'signing', 'submitting', 'attesting', 'claiming', 'depositing'].includes(status);
  const activeIndex =
    status === 'completed' ? 4 :
    status === 'depositing' ? 3 :
    status === 'claiming' ? 2 :
    status === 'attesting' ? 1 :
    ['submitting', 'signing', 'building'].includes(status) ? 0 :
    -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#070b16] p-6 shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#d4af5f]">CCTP cross-chain + Auto-Deposit</p>
            <h2 className="mt-1 text-xl font-bold text-white">
              {status === 'completed'
                ? 'USDC deposited in ArbiAgent Vault'
                : status === 'depositing'
                ? 'Depositing into ArbiAgent Vault...'
                : status === 'error'
                ? 'Transfer could not complete'
                : 'Processing transfer'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white" aria-label="Close">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-7 grid grid-cols-4 gap-2">
          {steps.map((step, index) => {
            const complete = status === 'completed' || index < activeIndex;
            const current = busy && index === activeIndex;
            return (
              <div key={step.key} className="text-center">
                <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border transition ${
                  complete ? 'border-[#d4af5f] bg-[#d4af5f] text-slate-950' :
                  current ? 'border-[#d4af5f]/70 bg-[#d4af5f]/10 text-[#d4af5f]' :
                  'border-white/10 bg-[#08111f] text-slate-500'
                }`}>
                  {complete ? <Check className="h-4 w-4" /> : current ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
                </div>
                <p className={`mt-2 text-[10px] leading-tight ${complete || current ? 'text-zinc-200' : 'text-zinc-500'}`}>{step.label}</p>
              </div>
            );
          })}
        </div>

        {status === 'error' && error && (
          <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>
        )}

        <div className="mt-6 space-y-3">
          {stellarTxHash && (
            <a href={`${STELLAR_EXPERT_URL}/${stellarTxHash}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-zinc-300 hover:border-cyan-500/30">
              <span>View Stellar burn transaction</span>
              <ExternalLink className="h-4 w-4 text-cyan-400" />
            </a>
          )}
          {arbitrumTxHash && (
            <a href={`${ARBISCAN_TX_URL}/${arbitrumTxHash}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-zinc-300 hover:border-cyan-500/30">
              <span>View Arbitrum CCTP claim</span>
              <ExternalLink className="h-4 w-4 text-cyan-400" />
            </a>
          )}
          {vaultTxHash && (
            <a href={`${ARBISCAN_TX_URL}/${vaultTxHash}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#d4af5f]/30 bg-[#d4af5f]/10 px-4 py-3 text-xs text-[#d4af5f] hover:border-[#d4af5f]/60">
              <span>View ArbiAgent Vault deposit</span>
              <ExternalLink className="h-4 w-4 text-[#d4af5f]" />
            </a>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          {busy ? 'Close progress' : 'Close'}
        </button>
      </div>
    </div>
  );
};
