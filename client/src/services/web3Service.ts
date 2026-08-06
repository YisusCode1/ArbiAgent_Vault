import { ethers } from 'ethers';
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  ARBITRUM_SEPOLIA_HEX_CHAIN_ID,
  ARBITRUM_SEPOLIA_RPC,
  ARBITRUM_SEPOLIA_EXPLORER,
  VAULT_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  VAULT_ABI,
  ERC20_ABI
} from '../config/constants';
import { RebalanceSignalResponse, TransactionRecord } from '../types';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class Web3Service {
  public static hasMetaMask(): boolean {
    return typeof window !== 'undefined' && Boolean(window.ethereum);
  }

  public static async connectWallet(): Promise<{ account: string; chainId: number; balance: string; isDemo: boolean }> {
    if (!this.hasMetaMask()) {
      throw new Error('MetaMask no está instalado en tu navegador.');
    }

    const ethereum = window.ethereum;
    const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });

    if (!accounts || accounts.length === 0) {
      throw new Error('No se seleccionó ninguna cuenta en MetaMask.');
    }

    const account = accounts[0];
    const chainIdHex: string = await ethereum.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);

    const provider = new ethers.BrowserProvider(ethereum);
    const rawBalance = await provider.getBalance(account);
    const balance = ethers.formatEther(rawBalance);

    return { account, chainId, balance, isDemo: false };
  }

  public static async switchToArbitrumSepolia(): Promise<boolean> {
    if (!this.hasMetaMask()) return false;
    const ethereum = window.ethereum;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARBITRUM_SEPOLIA_HEX_CHAIN_ID }]
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: ARBITRUM_SEPOLIA_HEX_CHAIN_ID,
              chainName: 'Arbitrum Sepolia Testnet',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: [ARBITRUM_SEPOLIA_RPC],
              blockExplorerUrls: [ARBITRUM_SEPOLIA_EXPLORER]
            }
          ]
        });
        return true;
      }
      throw switchError;
    }
  }

  public static async deposit(amountUsdc: string): Promise<string> {
    if (!this.hasMetaMask()) {
      throw new Error('MetaMask es requerido para depositar.');
    }

    const ethereum = window.ethereum;
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const parsedAmount = ethers.parseUnits(amountUsdc, 6);

    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, signer);
    const vaultContract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, signer);

    const allowance = await usdcContract.allowance(await signer.getAddress(), VAULT_CONTRACT_ADDRESS);

    if (allowance < parsedAmount) {
      const approveTx = await usdcContract.approve(VAULT_CONTRACT_ADDRESS, parsedAmount);
      await approveTx.wait();
    }

    const depositTx = await vaultContract.deposit(parsedAmount, await signer.getAddress());
    const receipt = await depositTx.wait();
    return receipt.hash;
  }

  public static async withdraw(amountUsdc: string): Promise<string> {
    if (!this.hasMetaMask()) {
      throw new Error('MetaMask es requerido para retirar.');
    }

    const ethereum = window.ethereum;
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
    const parsedAmount = ethers.parseUnits(amountUsdc, 6);

    const vaultContract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, signer);
    const withdrawTx = await vaultContract.withdraw(parsedAmount, userAddress, userAddress);
    const receipt = await withdrawTx.wait();
    return receipt.hash;
  }

  public static async executeSignalOnChain(signalPayload: RebalanceSignalResponse): Promise<string> {
    if (!this.hasMetaMask()) {
      throw new Error('MetaMask es requerido para ejecutar rebalanceo on-chain.');
    }

    const ethereum = window.ethereum;
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();

    const vaultContract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, signer);
    const tx = await vaultContract.executeSignal(
      signalPayload.amountToSupply,
      signalPayload.amountToWithdraw,
      signalPayload.profitGenerated,
      signalPayload.nonce,
      signalPayload.deadline,
      signalPayload.signature
    );

    const receipt = await tx.wait();
    return receipt.hash;
  }

  public static async getVaultTotalAssets(): Promise<string> {
    try {
      const ethereum = this.hasMetaMask() ? window.ethereum : null;
      const provider = ethereum ? new ethers.BrowserProvider(ethereum) : new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
      const vaultContract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, provider);
      const total = await vaultContract.totalAssets();
      return ethers.formatUnits(total, 6);
    } catch {
      return '0.00';
    }
  }

  public static async getUserShares(account: string): Promise<{ shares: string; assets: string }> {
    try {
      if (this.hasMetaMask() && account) {
        const ethereum = window.ethereum;
        const provider = new ethers.BrowserProvider(ethereum);
        const vaultContract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, provider);

        const shares = await vaultContract.balanceOf(account);
        const assets = await vaultContract.convertToAssets(shares);

        return {
          shares: ethers.formatUnits(shares, 6),
          assets: ethers.formatUnits(assets, 6)
        };
      }
    } catch (err) {
      console.error('Error fetching user shares:', err);
    }
    return { shares: '0.0000', assets: '0.00' };
  }

  public static async fetchOnChainEvents(): Promise<TransactionRecord[]> {
    try {
      const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
      const vaultContract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, provider);

      const filter = vaultContract.filters.SignalExecuted();
      const events = await vaultContract.queryFilter(filter, -5000);

      if (events && events.length > 0) {
        return events.map((ev: any) => ({
          date: new Date().toLocaleString('es-ES'),
          type: 'IA',
          typeBadge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          description: 'Ejecución de Señal EIP-712',
          detail: `Rebalanceo on-chain confirmado`,
          protocol: 'Aave V3',
          amount: `${ethers.formatUnits(ev.args[0], 6)} USDC`,
          status: 'Completado (On-Chain)',
          hash: ev.transactionHash ? `${ev.transactionHash.substring(0, 6)}...${ev.transactionHash.substring(ev.transactionHash.length - 4)}` : '-'
        }));
      }
    } catch (err) {
      console.error('Error fetching on-chain events:', err);
    }
    return [];
  }
}
