import React, { useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { useVault } from '../hooks/useVault';
import { useWeb3 } from '../hooks/useWeb3';
import { ARBITRUM_SEPOLIA_EXPLORER } from '../config/constants';

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'DEPÓSITO', label: 'Depósitos' },
  { id: 'RETIRO', label: 'Retiros' },
  { id: 'IA', label: 'Rebalanceos IA' },
];

const statusStyle = (status: string) => {
  if (status.startsWith('Completado')) return { text: 'text-emerald-400', dot: 'bg-emerald-400' };
  if (status === 'Pendiente') return { text: 'text-amber-400', dot: 'bg-amber-400' };
  return { text: 'text-slate-400', dot: 'bg-slate-400' };
};

// Cada campo entre comillas: las fechas y descripciones contienen comas y rompían las columnas.
const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const fmtUSDC = (n: number) =>
  `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;

export const ActividadView: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const { history } = useVault();
  const { wallet } = useWeb3();

  const sumByType = (type: string) =>
    history
      .filter((item) => item.type === type && item.amount !== '-')
      .reduce((acc, item) => {
        const val = parseFloat(item.amount); // "4.00 USDC" -> 4
        return acc + (isNaN(val) ? 0 : val);
      }, 0);

  const totalDeposits = sumByType('DEPÓSITO');
  const totalWithdrawals = sumByType('RETIRO');

  const exportCSV = () => {
    if (history.length === 0) return;
    const headers = ['Fecha', 'Tipo', 'Descripción', 'Protocolo', 'Monto', 'Estado', 'Tx hash'];
    const rows = history.map((item) => [
      item.date,
      item.type,
      item.description,
      item.protocol,
      item.amount,
      item.status,
      item.fullHash ?? item.hash,
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
    // BOM inicial para que Excel respete los acentos
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'arbiagent_actividad.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredHistory = history.filter((item) => filter === 'all' || item.type === filter);

  const emptyMessage = !wallet.isConnected
    ? 'Conecta tu wallet para ver tu actividad.'
    : history.length === 0
    ? 'Aún no hay actividad. Cuando hagas un depósito o un retiro, o la IA rebalancee el vault, aparecerá aquí con su enlace al explorer.'
    : 'No hay registros para este filtro.';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 text-white font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Actividad reciente</h2>
          <p className="text-xs text-slate-400">Tus depósitos y retiros, y los rebalanceos que la IA ejecutó en el vault, verificables en Arbitrum Sepolia.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full md:w-auto">
          <div className="bg-[#0D1424] border border-cyan-900/20 px-4 py-2 rounded-xl">
            <div className="text-[10px] text-slate-400">Total de movimientos</div>
            <div className="text-lg font-bold">{history.length}</div>
            <div className="text-[10px] text-slate-500">Incluye rebalanceos de la IA</div>
          </div>
          <div className="bg-[#0D1424] border border-cyan-900/20 px-4 py-2 rounded-xl">
            <div className="text-[10px] text-slate-400">Depósitos totales</div>
            <div className="text-lg font-bold">{fmtUSDC(totalDeposits)}</div>
            <div className="text-[10px] text-slate-500">Suma de tus depósitos</div>
          </div>
          <div className="bg-[#0D1424] border border-cyan-900/20 px-4 py-2 rounded-xl">
            <div className="text-[10px] text-slate-400">Retiros totales</div>
            <div className="text-lg font-bold">{fmtUSDC(totalWithdrawals)}</div>
            <div className="text-[10px] text-slate-500">Suma de tus retiros</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0D1424] border border-cyan-900/20 p-4 rounded-xl">
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                filter === f.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                  : 'bg-[#070B14] text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={exportCSV}
          disabled={history.length === 0}
          className="flex items-center gap-2 bg-[#070B14] border border-slate-800 hover:border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs text-slate-300 transition-colors w-full sm:w-auto justify-center disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Exportar CSV</span>
        </button>
      </div>

      <div className="bg-[#0D1424] border border-cyan-900/20 rounded-xl overflow-hidden">
        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">{emptyMessage}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070B14] text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Fecha y hora</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Descripción</th>
                  <th className="p-4">Protocolo</th>
                  <th className="p-4">Monto</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Transacción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-sans">
                {filteredHistory.map((item, index) => {
                  const st = statusStyle(item.status);
                  return (
                    <tr key={`${item.fullHash ?? item.hash}-${item.type}-${index}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 whitespace-nowrap text-slate-400 font-mono">{item.date}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.typeBadge}`}>{item.type}</span>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-white">{item.description}</div>
                        <div className="text-[11px] text-slate-500">{item.detail}</div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {item.protocol !== '-' ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[9px]">A</div>
                            <span>{item.protocol}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {item.amount !== '-' ? (
                          <div>
                            <div className={`font-semibold ${item.amountColor || 'text-white'}`}>{item.amount}</div>
                            {item.subAmount && <div className="text-[10px] text-slate-500 font-mono">{item.subAmount}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap font-mono text-cyan-400">
                        {item.hash === '-' ? (
                          <span className="text-slate-600">-</span>
                        ) : item.fullHash ? (
                          // El link usa el hash completo; `item.hash` es solo la versión abreviada para mostrar
                          <a
                            href={`${ARBITRUM_SEPOLIA_EXPLORER}/tx/${item.fullHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 hover:underline"
                          >
                            <span>{item.hash}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span>{item.hash}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
