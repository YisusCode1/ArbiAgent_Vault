const IRIS_API_URL = import.meta.env.VITE_CIRCLE_IRIS_API_URL || 'https://iris-api-sandbox.circle.com';

export interface CctpAttestationResult {
  status: 'complete' | 'pending' | 'error';
  attestation: string;
  messageHash: string;
}

export async function fetchCctpAttestation(
  messageHash: string,
  maxAttempts = 30,
  intervalMs = 3000
): Promise<CctpAttestationResult> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(messageHash)) {
    throw new Error('Message hash CCTP invalido.');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${IRIS_API_URL}/v2/messages/421614?transactionHash=${messageHash}`);
      if (response.ok) {
        const data = await response.json();
        const message = data?.messages?.[0];
        if (message?.status === 'complete' && message.attestation && message.attestation !== 'PENDING') {
          return {
            status: 'complete',
            attestation: message.attestation,
            messageHash,
          };
        }
        if (message?.status === 'complete' && message.attestation) {
          return { status: 'complete', attestation: message.attestation, messageHash };
        }
      } else {
        const legacyResponse = await fetch(`${IRIS_API_URL}/attestations/${messageHash}`);
        if (legacyResponse.ok) {
          const legacy = await legacyResponse.json();
          if (legacy.status === 'complete' && legacy.attestation && legacy.attestation !== 'PENDING') {
            return { status: 'complete', attestation: legacy.attestation, messageHash };
          }
        }
      }
    } catch {
      // El servicio puede tardar en indexar la transaccion. Se reintenta.
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    }
  }

  return { status: 'pending', attestation: '0x', messageHash };
}
