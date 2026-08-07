export type RiskMode = 'conservador' | 'moderado' | 'agresivo';

export interface RiskModeInfo {
  id: RiskMode;
  name: string;
  description: string;
  max_exposure: number;
  risk_level: string;
  color: string;
  cooldown_hours: number;
}

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
  active_mode?: string;
  mode_description?: string;
}

export interface RebalanceSignalResponse {
  success: boolean;
  txHash: string;
  message: string;
  timestamp: string;
  amountToSupply: number;
  amountToWithdraw: number;
  profitGenerated: number;
  nonce: number;
  deadline: number;
  signature: string;
  target_allocation?: number;
  confidence?: number;
}

export interface VaultMetrics {
  totalAssets: string;
  userShares: string;
  userAssets: string;
  userPrincipal: string;
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
