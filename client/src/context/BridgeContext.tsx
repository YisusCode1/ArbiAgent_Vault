import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { TransactionBuilder, Networks } from "@stellar/stellar-sdk";
import { Web3Context } from "./Web3Context";
import {
  buildDepositForBurnTx,
  connectStellarInMetaMask,
  getStellarUsdcBalance,
  signStellarTxWithMetaMask,
  sorobanServer,
} from "../services/stellarBridgeService";

export type BridgeStatus =
  | "idle"
  | "building"
  | "signing"
  | "submitting"
  | "completed"
  | "error";

interface BridgeContextType {
  stellarAccount: string | null;
  stellarUsdcBalance: string;
  status: BridgeStatus;
  txHash: string | null;
  error: string | null;
  connectStellarAccount: () => Promise<void>;
  refreshStellarBalance: () => Promise<void>;
  bridgeUsdcToArbitrum: (amountUsdc: string, customSignFn?: (xdr: string) => Promise<string>) => Promise<void>;
  resetBridge: () => void;
}

const BridgeContext = createContext<BridgeContextType | undefined>(undefined);

export const BridgeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const web3 = useContext(Web3Context);
  const [stellarAccount, setStellarAccount] = useState<string | null>(null);
  const [stellarUsdcBalance, setStellarUsdcBalance] = useState<string>("0.00");
  const [status, setStatus] = useState<BridgeStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectStellarAccount = useCallback(async () => {
    try {
      setError(null);
      const address = await connectStellarInMetaMask();
      setStellarAccount(address);
      const bal = await getStellarUsdcBalance(address);
      setStellarUsdcBalance(bal);
    } catch (err: any) {
      setError(err?.message || "No se pudo conectar la cuenta de Stellar en MetaMask.");
    }
  }, []);

  const refreshStellarBalance = useCallback(async () => {
    if (!stellarAccount) return;
    const bal = await getStellarUsdcBalance(stellarAccount);
    setStellarUsdcBalance(bal);
  }, [stellarAccount]);

  const bridgeUsdcToArbitrum = async (
    amountUsdc: string,
    customSignFn?: (xdr: string) => Promise<string>
  ) => {
    try {
      setError(null);
      setTxHash(null);

      const evmRecipient = web3?.wallet.account;
      if (!evmRecipient) {
        throw new Error("Conecta primero tu wallet EVM en MetaMask (Arbitrum).");
      }
      if (!stellarAccount) {
        throw new Error("Activa primero tu cuenta Stellar dentro de MetaMask.");
      }

      setStatus("building");
      const unsignedXdr = await buildDepositForBurnTx({
        stellarSender: stellarAccount,
        amountUsdc,
        evmRecipient,
      });

      setStatus("signing");
      const signFn = customSignFn || signStellarTxWithMetaMask;
      const signedXdr = await signFn(unsignedXdr);

      setStatus("submitting");
      const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
      const sendResponse = await sorobanServer.sendTransaction(tx);

      if (sendResponse.status === "ERROR") {
        throw new Error(`Error al enviar transacción: ${sendResponse.errorResult}`);
      }

      let getResponse = await sorobanServer.getTransaction(sendResponse.hash);
      while (getResponse.status === "NOT_FOUND") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        getResponse = await sorobanServer.getTransaction(sendResponse.hash);
      }

      if (getResponse.status === "SUCCESS") {
        setTxHash(sendResponse.hash);
        setStatus("completed");
        await refreshStellarBalance();
      } else {
        throw new Error(`Transacción fallida en Soroban: ${getResponse.status}`);
      }
    } catch (err: any) {
      setError(err?.message || "Error inesperado al ejecutar el puente.");
      setStatus("error");
    }
  };

  const resetBridge = () => {
    setStatus("idle");
    setTxHash(null);
    setError(null);
  };

  return (
    <BridgeContext.Provider
      value={{
        stellarAccount,
        stellarUsdcBalance,
        status,
        txHash,
        error,
        connectStellarAccount,
        refreshStellarBalance,
        bridgeUsdcToArbitrum,
        resetBridge,
      }}
    >
      {children}
    </BridgeContext.Provider>
  );
};

export const useBridgeContext = () => {
  const context = useContext(BridgeContext);
  if (!context) {
    throw new Error("useBridgeContext debe usarse dentro de un BridgeProvider");
  }
  return context;
};