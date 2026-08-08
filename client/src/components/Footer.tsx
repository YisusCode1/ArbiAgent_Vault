export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#08101f]/90">
      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">ArbiAgent</span>
          <span className="text-xs text-slate-500">· AI DeFi Vault</span>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Construido para el EthLima Hackathon 2026 · Arbitrum Sepolia (testnet) · Sin valor monetario real
        </p>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          
            href="https://github.com/YisusCode1/ArbiAgent_Vault"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#d4af5f] transition-colors"
          >
            GitHub
          </a>
          
            href="https://sepolia.arbiscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#d4af5f] transition-colors"
          >
            Arbiscan
          </a>
        </div>
      </div>
    </footer>
  );
}
