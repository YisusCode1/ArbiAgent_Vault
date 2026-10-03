// utils/format.ts
// Un solo lugar para formatear montos: evita que "4.000871" se lea como millones.

export function formatUSD(
  value: number | string | null | undefined,
  maxDecimals?: number
): string {
  const n = typeof value === 'string' ? Number(value) : value ?? 0;
  if (!Number.isFinite(n)) return '$0.00';
  // Por defecto: 2 decimales; montos menores a $1 muestran hasta 4.
  const max = maxDecimals ?? (n > 0 && n < 1 ? 4 : 2);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Math.min(2, max),
    maximumFractionDigits: max,
  }).format(n);
}

export function formatPercent(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value ?? 0;
  return Number.isFinite(n) ? `${n.toFixed(2)}%` : '0.00%';
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

// Etiquetas para mostrar: el backend devuelve identificadores en español.
const RISK_LABELS: Record<string, string> = { Bajo: 'Low', Medio: 'Medium', Alto: 'High' };
export const riskLabel = (level: string): string => RISK_LABELS[level] ?? level;

const MODE_LABELS: Record<string, string> = { conservador: 'Conservative', moderado: 'Moderate', agresivo: 'Aggressive' };
export const modeLabel = (id: string): string => MODE_LABELS[id] ?? id;

const MODE_DESCRIPTIONS: Record<string, string> = {
  conservador: 'Preserves capital with minimal volatility and low exposure.',
  moderado: 'Balanced trade-off between yield and risk (Sharpe ratio).',
  agresivo: 'Maximum yield, aiming to capture all available yield.',
};
export const modeDescription = (id: string, fallback = ''): string => MODE_DESCRIPTIONS[id] ?? fallback;
