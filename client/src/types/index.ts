export interface WalletState {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  isDemo: boolean;
  error: string | null;
  balance: string;
}

export interface StrategyResponse {
  action: string;
  confidence: number;
  estimated_apy: number;
  risk_level: string;
  volatility_7d: number;
  recommended_protocol: string;
  timestamp: string;
  startbase_score: number;
}

export interface VaultMetrics {
  totalAssets: string;
  userShares: string;
  userAssets: string;
  performanceFee: number;
  assetSymbol: string;
}

export interface TransactionRecord {
  date: string;
  type: 'IA' | 'EJECUCIÓN' | 'DEPÓSITO' | 'RETIRO' | 'RENDIMIENTO' | 'SISTEMA';
  typeBadge: string;
  description: string;
  detail: string;
  protocol: string;
  amount: string;
  subAmount?: string;
  amountColor?: string;
  status: string;
  hash: string;
}
