import React, { createContext, useState, useCallback, ReactNode } from "react";
import { useWeb3 } from "../hooks/useWeb3";
import {
  connectStellarSnap,
  getStellarUsdcBalance,
  buildAndSubmitBridgeTx,
  pollCircleAttestation,
  claimUsdcOnArbitrum,
} from "../services/stellarBridgeService";

export type BridgeStatus =
  | "idle"
  | "building"
  | "signing"
  | "submitting"
  | "attesting"
  | "claiming"
  | "completed"
  | "error";

export interface BridgeContextType {
  stellarAccount: string | null;
  stellarUsdcBalance: string;
  status: BridgeStatus;
  txHash: string | null;
  messageHash: string | null;
  arbitrumTxHash: string | null;
  error: string | null;
  connectStellarAccount: () => Promise<void>;
  bridgeUsdcToArbitrum: (amountUsdc: string) => Promise<void>;
  refreshStellarBalance: () => Promise<void>;
  resetBridge: () => void;
}

export const BridgeContext = createContext<BridgeContextType | undefined>(undefined);

export const BridgeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { wallet } = useWeb3();
  const [stellarAccount, setStellarAccount] = useState<string | null>(null);
  const [stellarUsdcBalance, setStellarUsdcBalance] = useState<string>("0.00");
  const [status, setStatus] = useState<BridgeStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [messageHash, setMessageHash] = useState<string | null>(null);
  const [arbitrumTxHash, setArbitrumTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStellarBalance = useCallback(async (addr?: string) => {
    const target = addr || stellarAccount;
    if (!target) return;
    const bal = await getStellarUsdcBalance(target);
    setStellarUsdcBalance(bal);
  }, [stellarAccount]);

  const connectStellarAccount = useCallback(async () => {
    try {
      setError(null);
      const addr = await connectStellarSnap();
      setStellarAccount(addr);
      await refreshStellarBalance(addr);
    } catch (err: any) {
      setError(err.message || "Error al conectar Stellar Snap.");
    }
  }, [refreshStellarBalance]);

  const bridgeUsdcToArbitrum = useCallback(async (amountUsdc: string) => {
    if (!stellarAccount) return setError("Conecta tu cuenta de Stellar primero.");
    if (!wallet.account) return setError("Conecta tu wallet de Arbitrum primero.");

    try {
      setError(null);
      setStatus("building");

      const { txHash: sHash, messageHex, messageHash: mHash } = await buildAndSubmitBridgeTx(
        stellarAccount,
        amountUsdc,
        wallet.account,
        () => setStatus("signing"),
        () => setStatus("submitting")
      );

      setTxHash(sHash);
      setMessageHash(mHash);

      setStatus("attesting");
      const { attestation } = await pollCircleAttestation(mHash);

      setStatus("claiming");
      const { arbitrumTxHash: arbHash } = await claimUsdcOnArbitrum(messageHex, attestation);
      setArbitrumTxHash(arbHash);

      setStatus("completed");
      await refreshStellarBalance();
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Error durante el flujo del puente.");
    }
  }, [stellarAccount, wallet.account, refreshStellarBalance]);

  const resetBridge = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setMessageHash(null);
    setArbitrumTxHash(null);
    setError(null);
  }, []);

  return (
    <BridgeContext.Provider
      value={{
        stellarAccount,
        stellarUsdcBalance,
        status,
        txHash,
        messageHash,
        arbitrumTxHash,
        error,
        connectStellarAccount,
        bridgeUsdcToArbitrum,
        refreshStellarBalance: () => refreshStellarBalance(),
        resetBridge,
      }}
    >
      {children}
    </BridgeContext.Provider>
  );
};
