import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useWeb3 } from "../hooks/useWeb3";
import { BridgeState, BridgeStatus } from "../types";
import {
  connectStellarSnap,
  getStellarUsdcBalance,
  claimUsdcOnArbitrum,
} from "../services/stellarBridgeService";
import { depositForBurn } from "../services/stellarService";
import { fetchCctpAttestation } from "../services/cctpRelayerService";
import { ethers } from "ethers";

const BRIDGE_CONTRACT_ID = import.meta.env.VITE_BRIDGE_CONTRACT_ID || 'CD2JE4VYB45A7YHDIODCRGZYUPGPPXCWQBH46I7MQBV3UAM6FRYGWXLG';

export interface BridgeContextType extends BridgeState {
  isRefreshingBalance: boolean;
  connectStellarAccount: () => Promise<void>;
  disconnectStellarAccount: () => void;
  bridgeUsdcToArbitrum: (amountUsdc: string) => Promise<void>;
  refreshStellarBalance: () => Promise<void>;
  resetBridge: () => void;
}

export const BridgeContext = createContext<BridgeContextType | undefined>(undefined);

export const useBridgeContext = (): BridgeContextType => {
  const context = useContext(BridgeContext);
  if (!context) throw new Error("useBridgeContext must be used within a BridgeProvider");
  return context;
};

export const BridgeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { wallet } = useWeb3();
  const [stellarAccount, setStellarAccount] = useState<string | null>(null);
  const [stellarUsdcBalance, setStellarUsdcBalance] = useState<string>("0.00");
  const [status, setStatus] = useState<BridgeStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [messageHash, setMessageHash] = useState<string | null>(null);
  const [arbitrumTxHash, setArbitrumTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  const refreshStellarBalance = useCallback(async () => {
    if (!stellarAccount) return;
    setIsRefreshingBalance(true);
    try {
      const balance = await getStellarUsdcBalance(stellarAccount);
      setStellarUsdcBalance(balance);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "No se pudo leer el saldo USDC de Stellar Testnet.");
    } finally {
      setIsRefreshingBalance(false);
    }
  }, [stellarAccount]);

  const connectStellarAccount = useCallback(async () => {
    setStatus("idle");
    setError(null);
    try {
      const address = await connectStellarSnap();
      if (!address) throw new Error("Stellar Snap no devolvió una dirección.");
      setStellarAccount(address);
      localStorage.setItem("arbiagent_stellar_account", address);
      setIsRefreshingBalance(true);
      const balance = await getStellarUsdcBalance(address);
      setStellarUsdcBalance(balance);
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Error al conectar Stellar Snap.");
    } finally {
      setIsRefreshingBalance(false);
    }
  }, []);

  const disconnectStellarAccount = useCallback(() => {
    setStellarAccount(null);
    setStellarUsdcBalance("0.00");
    setStatus("idle");
    setError(null);
    localStorage.removeItem("arbiagent_stellar_account");
  }, []);

  const bridgeUsdcToArbitrum = useCallback(async (amountUsdc: string) => {
    if (!stellarAccount) {
      setError("Conecta tu cuenta de Stellar primero.");
      return;
    }
    if (!wallet.account) {
      setError("Conecta tu wallet de Arbitrum primero.");
      return;
    }

    const amount = Number(amountUsdc);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Ingresa un monto USDC válido.");
      return;
    }
    if (amount > Number(stellarUsdcBalance)) {
      setError("El monto excede el saldo USDC disponible en Stellar Testnet.");
      return;
    }

    try {
      setError(null);
      setStatus("building");

      const burnResult = await depositForBurn(
        BRIDGE_CONTRACT_ID,
        stellarAccount,
        amountUsdc,
        wallet.account,
        () => setStatus("signing"),
        () => setStatus("submitting")
      );

      setTxHash(burnResult.txHash);
      const fallbackMessageHash = ethers.keccak256(
        ethers.toUtf8Bytes(`stellar:${burnResult.txHash}`)
      );
      setMessageHash(fallbackMessageHash);

      setStatus("attesting");
      const attestation = await fetchCctpAttestation(fallbackMessageHash);

      setStatus("claiming");
      if (attestation.status !== "complete" || attestation.attestation === "0x") {
        setStatus("attesting");
        setError("La attestación CCTP aún está pendiente. Puedes volver a intentar en unos minutos.");
        return;
      }

      const messageHex = ethers.hexlify(ethers.toUtf8Bytes(burnResult.txHash));
      const claimed = await claimUsdcOnArbitrum(messageHex, attestation.attestation);
      setArbitrumTxHash(claimed.arbitrumTxHash);
      setStatus(claimed.arbitrumTxHash ? "completed" : "attesting");

      await refreshStellarBalance();
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Error durante el flujo del puente.");
    }
  }, [stellarAccount, wallet.account, stellarUsdcBalance, refreshStellarBalance]);

  const resetBridge = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setMessageHash(null);
    setArbitrumTxHash(null);
    setError(null);
  }, []);

  useEffect(() => {
    const savedAccount = localStorage.getItem("arbiagent_stellar_account");
    if (!savedAccount) return;
    setStellarAccount(savedAccount);
  }, []);

  useEffect(() => {
    if (!stellarAccount) return;
    refreshStellarBalance();
    const interval = window.setInterval(refreshStellarBalance, 30_000);
    return () => window.clearInterval(interval);
  }, [stellarAccount, refreshStellarBalance]);

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
        isRefreshingBalance,
        connectStellarAccount,
        disconnectStellarAccount,
        bridgeUsdcToArbitrum,
        refreshStellarBalance,
        resetBridge,
      }}
    >
      {children}
    </BridgeContext.Provider>
  );
};
