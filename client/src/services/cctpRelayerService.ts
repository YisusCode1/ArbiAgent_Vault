const IRIS_API_URL = import.meta.env.VITE_CIRCLE_IRIS_API_URL || 'https://iris-api-sandbox.circle.com';

export interface CctpAttestationResult {
  status: 'complete' | 'pending' | 'error';
  attestation: string;
  messageHash: string;
}

export async function fetchCctpAttestation(
  messageHash: string,
  maxAttempts = 3,
  intervalMs = 2000
): Promise<CctpAttestationResult> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(messageHash)) {
    throw new Error('Message hash CCTP invalido.');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${IRIS_API_URL}/attestations/${messageHash}`);
      if (response.ok) {
        const data = await response.json();
        if (data?.status === 'complete' && data.attestation && data.attestation !== 'PENDING') {
          return { status: 'complete', attestation: data.attestation, messageHash };
        }
      }
    } catch {
      // Reintentar en caso de error transitorio de red
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => window.setTimeout(r, intervalMs));
    }
  }

  return { status: 'pending', attestation: '0x', messageHash };
}
