import {
  Address,
  Contract,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { ethers } from "ethers";

const STELLAR_RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
const BRIDGE_CONTRACT_ID = import.meta.env.VITE_BRIDGE_CONTRACT_ID || "CD2JE4VYB45A7YHDIODCRGZYUPGPPXCWQBH46I7MQBV3UAM6FRYGWXLG";
const TOKEN_MESSENGER_ID = import.meta.env.VITE_STELLAR_TOKEN_MESSENGER_ID || "CD6DGLSQNOVDMDPUWDHWMLW3TFKIJ44WZK3KJF4IVXJZ76BDA5TTN7IP";
const USDC_CONTRACT_ID = import.meta.env.VITE_STELLAR_USDC_CONTRACT_ID || "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const ARBITRUM_DOMAIN_ID = Number(import.meta.env.VITE_ARBITRUM_DOMAIN_ID || 3);
const IRIS_API_URL = import.meta.env.VITE_CIRCLE_IRIS_API_URL || "https://iris-api-sandbox.circle.com";
const ARBITRUM_MESSAGE_TRANSMITTER = import.meta.env.VITE_ARBITRUM_MESSAGE_TRANSMITTER || "0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872";
const STELLAR_SNAP_ID = "npm:@metamask/stellar-snap";

export function evmAddressToBytes32(evmAddress: string): Uint8Array {
  const cleanHex = evmAddress.trim().replace(/^0x/i, "");
  if (cleanHex.length !== 40) throw new Error("Direccion EVM invalida (debe tener 20 bytes).");
  const paddedHex = cleanHex.padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(paddedHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function connectStellarSnap(): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask no detectado.");
  await eth.request({ method: "wallet_requestSnaps", params: { [STELLAR_SNAP_ID]: {} } });
  const res = await eth.request({
    method: "wallet_invokeSnap",
    params: { snapId: STELLAR_SNAP_ID, request: { method: "getAddress", params: { network: "testnet" } } },
  });
  return typeof res === "string" ? res : res?.address;
}

export async function getStellarUsdcBalance(stellarAddress: string): Promise<string> {
  try {
    const server = new rpc.Server(STELLAR_RPC_URL);
    const source = await server.getAccount(stellarAddress);
    const contract = new Contract(USDC_CONTRACT_ID);
    const tx = new TransactionBuilder(source, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("balance", new Address(stellarAddress).toScVal()))
      .setTimeout(30)
      .build();
    const sim: any = await server.simulateTransaction(tx);
    if (!sim?.result?.retval) return "0.00";
    const raw = BigInt(scValToNative(sim.result.retval));
    return (Number(raw) / 1e7).toFixed(2);
  } catch {
    return "0.00";
  }
}

export async function buildAndSubmitBridgeTx(
  stellarSender: string,
  amountUsdc: string,
  evmRecipient: string,
  onSigning?: () => void,
  onSubmitting?: () => void
): Promise<{ txHash: string; messageHex: string; messageHash: string }> {
  const server = new rpc.Server(STELLAR_RPC_URL);
  const source = await server.getAccount(stellarSender);
  const bridge = new Contract(BRIDGE_CONTRACT_ID);
  const amountStroops = BigInt(Math.round( parseFloat(amountUsdc) * 1e7 ));
  const recipientBytes = evmAddressToBytes32(evmRecipient);

  const tx = new TransactionBuilder(source, { fee: "100000", networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(
      bridge.call(
        "bridge_to_arbitrum",
        new Address(TOKEN_MESSENGER_ID).toScVal(),
        new Address(stellarSender).toScVal(),
        nativeToScVal(amountStroops, { type: "i128" }),
        nativeToScVal(ARBITRUM_DOMAIN_ID, { type: "u32" }),
        nativeToScVal(Buffer.from(recipientBytes), { type: "bytes" }),
        new Address(USDC_CONTRACT_ID).toScVal()
      )
    )
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  if (onSigning) onSigning();

  const eth = (window as any).ethereum;
  const signedXdr = await eth.request({
    method: "wallet_invokeSnap",
    params: {
      snapId: STELLAR_SNAP_ID,
      request: { method: "signTransaction", params: { transaction: prepared.toXDR(), network: "testnet" } },
    },
  });

  if (onSubmitting) onSubmitting();
  const signedTx = TransactionBuilder.fromXDR(signedXdr.signedTransaction || signedXdr, NETWORK_PASSPHRASE);
  const sendRes = await server.sendTransaction(signedTx);
  if (sendRes.status === "ERROR") throw new Error("Error al enviar TX a Stellar Testnet.");

  let txRes: any = await server.getTransaction(sendRes.hash);
  while (txRes.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    txRes = await server.getTransaction(sendRes.hash);
  }
  if (txRes.status !== "SUCCESS") throw new Error("La transaccion en Stellar fallo: " + txRes.status);

  const messageHex = ethers.hexlify(ethers.toUtf8Bytes(sendRes.hash));
  const messageHash = ethers.keccak256(messageHex);
  return { txHash: sendRes.hash, messageHex, messageHash };
}

export async function pollCircleAttestation(
  messageHash: string,
  maxRetries = 3,
  intervalMs = 2000
): Promise<{ status: "complete" | "pending_mock"; attestation: string }> {
  for (let i = 1; i <= maxRetries; i++) {
    const res = await fetch(`${IRIS_API_URL}/attestations/${messageHash}`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "complete" && data.attestation && data.attestation !== "PENDING") {
        return { status: "complete", attestation: data.attestation };
      }
    }
    if (i < maxRetries) await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { status: "pending_mock", attestation: "0x" };
}

export async function claimUsdcOnArbitrum(
  messageHex: string,
  attestationHex: string
): Promise<{ arbitrumTxHash: string | null; verifiedDomain: number }> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask no disponible para Arbitrum.");
  const provider = new ethers.BrowserProvider(eth);
  const signer = await provider.getSigner();
  const abi = [
    "function localDomain() view returns (uint32)",
    "function receiveMessage(bytes message, bytes attestation) external returns (bool success)",
  ];
  const transmitter = new ethers.Contract(ARBITRUM_MESSAGE_TRANSMITTER, abi, signer);
  const domain = Number(await transmitter.localDomain());

  if (attestationHex && attestationHex !== "0x") {
    const tx = await transmitter.receiveMessage(messageHex, attestationHex);
    const receipt = await tx.wait();
    return { arbitrumTxHash: receipt.hash, verifiedDomain: domain };
  }
  return { arbitrumTxHash: null, verifiedDomain: domain };
}
