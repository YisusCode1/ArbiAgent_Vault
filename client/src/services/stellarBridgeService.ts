import {
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  Address,
  rpc,
} from "@stellar/stellar-sdk";

const RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const BRIDGE_CONTRACT_ID = import.meta.env.VITE_BRIDGE_CONTRACT_ID;
const USDC_CONTRACT_ID = import.meta.env.VITE_STELLAR_USDC_CONTRACT_ID;
const TOKEN_MESSENGER_ID = import.meta.env.VITE_STELLAR_TOKEN_MESSENGER_ID;
const ARBITRUM_DOMAIN = Number(import.meta.env.VITE_ARBITRUM_DOMAIN_ID || 3);

// ID del Snap de Stellar en MetaMask (puedes sobreescribirlo en .env si usas el ID específico de Varial)
const STELLAR_SNAP_ID = import.meta.env.VITE_STELLAR_SNAP_ID || "npm:stellar-snap";

export const sorobanServer = new rpc.Server(RPC_URL);

/**
 * Conecta el Snap de Stellar dentro de MetaMask y devuelve la dirección G...
 */
export async function connectStellarInMetaMask(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask no está disponible.");
  }

  await window.ethereum.request({
    method: "wallet_requestSnaps",
    params: { [STELLAR_SNAP_ID]: {} },
  });

  const response = await window.ethereum.request({
    method: "wallet_invokeSnap",
    params: {
      snapId: STELLAR_SNAP_ID,
      request: {
        method: "getAddress",
        params: { network: "testnet" },
      },
    },
  });

  return typeof response === "string" ? response : response?.address;
}

/**
 * Firma el XDR de Soroban directamente desde MetaMask
 */
export async function signStellarTxWithMetaMask(xdr: string): Promise<string> {
  const response = await window.ethereum.request({
    method: "wallet_invokeSnap",
    params: {
      snapId: STELLAR_SNAP_ID,
      request: {
        method: "signTransaction",
        params: {
          transaction: xdr,
          networkPassphrase: Networks.TESTNET,
        },
      },
    },
  });

  return typeof response === "string" ? response : response?.signedTxXdr || response?.signedTransaction;
}

/**
 * Consulta el balance de USDC en Stellar Testnet para sincronización multi-cadena
 */
export async function getStellarUsdcBalance(stellarAddress: string): Promise<string> {
  try {
    const account = await sorobanServer.getAccount(stellarAddress);
    const usdcContract = new Contract(USDC_CONTRACT_ID);

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(usdcContract.call("balance", new Address(stellarAddress).toScVal()))
      .setTimeout(30)
      .build();

    const sim = await sorobanServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const rawBalance = scValToNative(sim.result.retval);
      return (Number(rawBalance) / 1e7).toFixed(2);
    }
    return "0.00";
  } catch {
    return "0.00";
  }
}

/**
 * Convierte una dirección EVM (0x... de 20 bytes) a Uint8Array de 32 bytes para CCTP
 */
export function evmAddressToBytes32(evmAddress: string): Uint8Array {
  const cleanHex = evmAddress.replace(/^0x/i, "").toLowerCase();
  if (cleanHex.length !== 40) {
    throw new Error("Dirección EVM inválida: debe tener 40 caracteres hexadecimales.");
  }
  const paddedHex = cleanHex.padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(paddedHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export interface BuildDepositParams {
  stellarSender: string;
  amountUsdc: string;
  evmRecipient: string;
}

export async function buildDepositForBurnTx({
  stellarSender,
  amountUsdc,
  evmRecipient,
}: BuildDepositParams): Promise<string> {
  const sourceAccount = await sorobanServer.getAccount(stellarSender);
  const contract = new Contract(BRIDGE_CONTRACT_ID);

  const scaledAmount = BigInt(Math.round(parseFloat(amountUsdc) * 1e7));
  const recipientBytes32 = evmAddressToBytes32(evmRecipient);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "10000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        "deposit_for_burn",
        new Address(stellarSender).toScVal(),
        nativeToScVal(scaledAmount, { type: "i128" }),
        nativeToScVal(ARBITRUM_DOMAIN, { type: "u32" }),
        nativeToScVal(recipientBytes32, { type: "bytes" }),
        new Address(USDC_CONTRACT_ID).toScVal(),
        new Address(TOKEN_MESSENGER_ID).toScVal()
      )
    )
    .setTimeout(60)
    .build();

  const preparedTx = await sorobanServer.prepareTransaction(tx);
  return preparedTx.toXDR();
}