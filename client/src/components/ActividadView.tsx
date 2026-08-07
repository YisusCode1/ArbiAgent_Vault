import React, { useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { useVault } from '../hooks/useVault';
import { ARBITRUM_SEPOLIA_EXPLORER } from '../config/constants';

export const ActividadView: React.FC = () => {
  const [filter, setFilter] = useState('Todos');
  const { history } = useVault();

  const totalDeposits = history
    .filter((item) => item.type === 'DEPÓSITO' && item.amount !== '-')
    .reduce((acc, item) => {
      const val = parseFloat(item.amount.replace(' USDC', '').replace(',', ''));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

  const totalWithdrawals = history
    .filter((item) => item.type === 'RETIRO' && item.amount !== '-')
    .reduce((acc, item) => {
      const val = parseFloat(item.amount.replace(' USDC', '').replace(',', ''));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

  const exportCSV = () => {
    if (history.length === 0) return;
    const headers = ['Fecha', 'Tipo', 'Descripcion', 'Protocolo', 'Monto', 'Estado', 'Hash'];
    const rows = history.map((item) => [
      item.date,
      item.type,
      item.description,
      item.protocol,
      item.amount,
      item.status,
      item.hash
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'arbiagent_actividad.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistory = history.filter((item) => {
    if (filter === 'Todos') return true;
    if (filter === 'Depositos') return item.type === 'DEPÓSITO';
    if (filter === 'Retiros') return item.type === 'RETIRO';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 text-white font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Actividad reciente</h2>
          <p className="text-xs text-slate-400">Historial de acciones y eventos de tu vault en Arbitrum Sepolia.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full md:w-auto">
          <div className="bg-[#0D1424] border border-cyan-900/20 px-4 py-2 rounded-xl">
            <div className="text-[10px] text-slate-400">Total de acciones</div>
            <div className="text-lg font-bold">{history.length}</div>
            <div className="text-[10px] text-slate-500">Registradas</div>
          </div>
          <div className="bg-[#0D1424] border border-cyan-900/20 px-4 py-2 rounded-xl">
            <div className="text-[10px] text-slate-400">Depositos totales</div>
            <div className="text-lg font-bold">{totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</div>
            <div className="text-[10px] text-slate-500">Sumatoria real</div>
          </div>
          <div className="bg-[#0D1424] border border-cyan-900/20 px-4 py-2 rounded-xl">
            <div className="text-[10px] text-slate-400">Retiros totales</div>
            <div className="text-lg font-bold">{totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</div>
            <div className="text-[10px] text-slate-500">Sumatoria real</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0D1424] border border-cyan-900/20 p-4 rounded-xl">
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
          {['Todos', 'Depositos', 'Retiros'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                  : 'bg-[#070B14] text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {f}
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
          <div className="p-12 text-center text-slate-500 text-xs">
            No hay registros de actividad aun. Realiza un deposito o retiro para registrar transacciones.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070B14] text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Fecha y hora</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Descripcion</th>
                  <th className="p-4">Protocolo</th>
                  <th className="p-4">Monto</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-sans">
                {filteredHistory.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 whitespace-nowrap text-slate-400 font-mono">{item.date}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.typeBadge}`}>
                        {item.type}
                      </span>
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
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap font-mono text-cyan-400">
                      {item.hash !== '-' ? (
                        <a
                          href={`${ARBITRUM_SEPOLIA_EXPLORER}/tx/${item.hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 hover:underline"
                        >
                          <span>{item.hash}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
