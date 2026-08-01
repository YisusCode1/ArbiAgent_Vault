import React from 'react';
import { Info, Zap, Shield, ExternalLink, RefreshCw, CheckCircle, Award } from 'lucide-react';
import { useStrategy } from '../hooks/useStrategy';
import { ARBITRUM_SEPOLIA_EXPLORER } from '../config/constants';

export const EstrategiaIAView: React.FC = () => {
  const { strategy, isLoading, isExecuting, executionResult, executeStrategy, fetchStrategy } = useStrategy();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 text-white font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0D1424] border border-cyan-900/20 rounded-xl p-6 relative">
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">DISTRIBUCION ACTUAL</span>
              <h2 className="text-2xl font-bold text-white mt-1">Estrategia del Vault</h2>
            </div>
            <div className="flex items-center gap-1.5 bg-[#070B14] border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300">
              <span>{strategy.recommended_protocol}</span>
              <Info className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-around my-8 gap-6">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="75" stroke="#121927" strokeWidth="16" fill="transparent" />
                <circle
                  cx="96"
                  cy="96"
                  r="75"
                  stroke="#06b6d4"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray="471"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-white">100%</span>
                <span className="text-xs text-cyan-400 font-medium">{strategy.recommended_protocol}</span>
                <span className="text-[10px] text-slate-500">Exposicion actual</span>
              </div>
            </div>

            <div className="w-full md:w-auto space-y-3">
              <div className="flex items-center justify-between md:justify-start gap-4 p-3 bg-[#070B14] border border-slate-800 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                  A
                </div>
                <div>
                  <div className="font-semibold text-sm">{strategy.recommended_protocol}</div>
                  <div className="text-xs text-slate-500">Protocolo optimizado por IA</div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-bold text-cyan-400 text-sm">100%</div>
                  <div className="text-xs text-slate-400">$125,446.51</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 p-3 bg-[#070B14] border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-300">Puntaje Startbase</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">{strategy.startbase_score} / 100</span>
              </div>
            </div>
          </div>

          <div className="mt-8 p-3 bg-[#070B14] border border-slate-800/80 rounded-lg flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>Este vault integra de forma directa Aave V3 en la red Arbitrum Sepolia.</span>
            </div>
            <button onClick={fetchStrategy} className="p-1 hover:text-cyan-400 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="bg-[#0D1424] border border-cyan-900/20 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 font-bold">
                AI
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">ULTIMA RECOMENDACION</span>
                <h3 className="text-xl font-bold text-white">
                  {strategy.action === 'HOLD' ? 'Mantener posicion en Aave' : 'Rebalancear a nuevo protocolo'}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Las condiciones evaluadas por el modelo de Inteligencia Artificial sugieren mantener la exposicion en {strategy.recommended_protocol}. Estrategia estable con bajo riesgo y rendimiento consistente.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-[#070B14] border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase">Confianza</span>
                <div className="text-lg font-bold text-emerald-400 my-1">{Math.round(strategy.confidence * 100)}%</div>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-3 h-1 rounded-full bg-emerald-400" />
                  ))}
                  <div className="w-3 h-1 rounded-full bg-slate-800" />
                </div>
              </div>

              <div className="bg-[#070B14] border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase">APY Estimado</span>
                <div className="text-lg font-bold text-cyan-400 my-1">{strategy.estimated_apy}%</div>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-3 h-1 rounded-full bg-cyan-400" />
                  ))}
                  {[1, 2].map((i) => (
                    <div key={i} className="w-3 h-1 rounded-full bg-slate-800" />
                  ))}
                </div>
              </div>

              <div className="bg-[#070B14] border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase">Riesgo</span>
                <div className="text-lg font-bold text-emerald-400 my-1">{strategy.risk_level}</div>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-3 h-1 rounded-full bg-emerald-400" />
                  ))}
                  <div className="w-3 h-1 rounded-full bg-slate-800" />
                </div>
              </div>

              <div className="bg-[#070B14] border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase">Volatilidad (7D)</span>
                <div className="text-lg font-bold text-cyan-400 my-1">{strategy.volatility_7d}%</div>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-3 h-1 rounded-full bg-cyan-400" />
                  ))}
                  {[1, 2].map((i) => (
                    <div key={i} className="w-3 h-1 rounded-full bg-slate-800" />
                  ))}
                </div>
              </div>
            </div>

            {executionResult && (
              <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-xs text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>{executionResult.message}</span>
                </div>
                {executionResult.txHash && (
                  <a
                    href={`${ARBITRUM_SEPOLIA_EXPLORER}/tx/${executionResult.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-mono"
                  >
                    <span>Hash: {executionResult.txHash.substring(0, 10)}...</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={executeStrategy}
              disabled={isExecuting}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-xs disabled:opacity-50"
            >
              {isExecuting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{isExecuting ? 'Ejecutando rebalanceo...' : 'Ejecutar estrategia'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#070B14] border border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span><strong className="text-slate-200">MODO DEMO:</strong> Esta aplicacion utiliza modelos predictivos y firmas EIP-712 en Arbitrum Sepolia.</span>
        </div>
        <a href="#info" className="text-cyan-400 hover:underline flex items-center gap-1">
          Mas informacion <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
