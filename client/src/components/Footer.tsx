import { ARBITRUM_SEPOLIA_EXPLORER, VAULT_CONTRACT_ADDRESS } from '../config/constants';

const linkClass = 'hover:text-[#d4af5f] transition-colors';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#08101f]/90">
      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">ArbiAgent</span>
          <span className="text-xs text-slate-500">· AI DeFi Vault</span>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-slate-300">
            Competing in Arbitrum Open House Singapore · Online Buildathon
          </p>
          <p className="text-xs text-slate-500">
            Born at EthLima Hackathon 2026 · Arbitrum Sepolia (testnet) · No real monetary value
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <a
            href="https://github.com/YisusCode1/ArbiAgent_Vault"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            GitHub
          </a>
          <a
            href={`${ARBITRUM_SEPOLIA_EXPLORER}/address/${VAULT_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Vault contract
          </a>
          <a href={ARBITRUM_SEPOLIA_EXPLORER} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Arbiscan
          </a>
        </div>
      </div>
    </footer>
  );
}
