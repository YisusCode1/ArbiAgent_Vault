export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
export const ARBITRUM_SEPOLIA_HEX_CHAIN_ID = '0x66eee';
export const ARBITRUM_SEPOLIA_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';
export const ARBITRUM_SEPOLIA_EXPLORER = 'https://sepolia.arbiscan.io';

export const VAULT_CONTRACT_ADDRESS = '0x9271faFfEa4e430352F9d6a585b712b0922102C3';
export const USDC_CONTRACT_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';

export const VAULT_ABI = [
  'function deposit(uint256 assets, address receiver) external returns (uint256 shares)',
  'function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)',
  'function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)',
  'function totalAssets() external view returns (uint256)',
  'function balanceOf(address user) external view returns (uint256)',
  'function convertToAssets(uint256 shares) external view returns (uint256)',
  'function convertToShares(uint256 assets) external view returns (uint256)',
  'function executeSignal(uint256 amountToSupply, uint256 amountToWithdraw, uint256 profitGenerated, uint256 nonce, uint256 deadline, bytes calldata signature) external',
  'event SignalExecuted(uint256 amountToSupply, uint256 amountToWithdraw, uint256 profitGenerated, uint256 nonce)',
  'event FeeCollected(address indexed treasury, uint256 amount)',
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
  'event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)'
];

export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)'
];
