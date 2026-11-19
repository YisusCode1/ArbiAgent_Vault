import {
  Address,
  Contract,
  nativeToScVal,
  rpc,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

const STELLAR_RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const TOKEN_MESSENGER_ID = import.meta.env.VITE_STELLAR_TOKEN_MESSENGER_ID || 'CD6DGLSQNOVDMDPUWDHWMLW3TFKIJ44WZK3KJF4IVXJZ76BDA5TTN7IP';
const USDC_CONTRACT_ID = import.meta.env.VITE_STELLAR_USDC_CONTRACT_ID || 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
const ARBITRUM_DOMAIN_ID = Number(import.meta.env.VITE_ARBITRUM_DOMAIN_ID || 3);

export function evmAddressToBytes32(evmAddress: string): Uint8Array {
  const cleanHex = evmAddress.trim().replace(/^0x/i, '');
  if (!/^([0-9a-fA-F]{40})$/.test(cleanHex)) {
    throw new Error('Direccion EVM invalida (debe tener 20 bytes).');
  }
  const paddedHex = cleanHex.padStart(64, '0');
  return Uint8Array.from(
    paddedHex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
}

export async function depositForBurn(
  bridgeContractId: string,
  stellarSender: string,
  amountUsdc: string,
  evmRecipient: string,
  onSigning?: () => void,
  onSubmitting?: () => void
): Promise<{ txHash: string }> {
  const server = new rpc.Server(STELLAR_RPC_URL);
  const source = await server.getAccount(stellarSender);
  const bridge = new Contract(bridgeContractId);
  const amountBaseUnits = BigInt(Math.round(parseFloat(amountUsdc) * 1e7));

  if (amountBaseUnits <= 0n) throw new Error('El monto USDC debe ser mayor que cero.');

  const recipientBytes = evmAddressToBytes32(evmRecipient);
  const transaction = new TransactionBuilder(source, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      bridge.call(
        'deposit_for_burn',
        new Address(TOKEN_MESSENGER_ID).toScVal(),
        new Address(stellarSender).toScVal(),
        nativeToScVal(amountBaseUnits, { type: 'i128' }),
        nativeToScVal(ARBITRUM_DOMAIN_ID, { type: 'u32' }),
        nativeToScVal(Buffer.from(recipientBytes), { type: 'bytes' }),
        new Address(USDC_CONTRACT_ID).toScVal()
      )
    )
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(transaction);
  onSigning?.();

  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error('MetaMask no detectado para firmar en Stellar.');

  const signedXdr = await ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: 'npm:@metamask/stellar-snap',
      request: {
        method: 'signTransaction',
        params: { transaction: prepared.toXDR(), network: 'testnet' },
      },
    },
  });

  onSubmitting?.();
  const signedTransaction = TransactionBuilder.fromXDR(
    signedXdr.signedTransaction || signedXdr,
    NETWORK_PASSPHRASE
  );
  const sendResult = await server.sendTransaction(signedTransaction);

  if (sendResult.status === 'ERROR') {
    throw new Error('Stellar rechazo la transaccion deposit_for_burn.');
  }

  let transactionResult: any = await server.getTransaction(sendResult.hash);
  while (transactionResult.status === 'NOT_FOUND') {
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
    transactionResult = await server.getTransaction(sendResult.hash);
  }

  if (transactionResult.status !== 'SUCCESS') {
    throw new Error(`La transaccion en Stellar fallo: ${transactionResult.status}`);
  }

  return { txHash: sendResult.hash };
}
