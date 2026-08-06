import React from 'react';
import { Info, Zap, Shield, Scale, Flame, ExternalLink, RefreshCw, CheckCircle, Award, Check } from 'lucide-react';
import { useStrategy } from '../hooks/useStrategy';
import { ARBITRUM_SEPOLIA_EXPLORER } from '../config/constants';
import { RiskMode, RiskModeInfo } from '../types';

export const EstrategiaIAView: React.FC = () => {
  const {
    riskMode,
    setRiskMode,
    riskModes,
    strategy,
    isLoading,
    isExecuting,
    executionResult,
    executeStrategy,
    fetchStrategy,
    fetchError
  } = useStrategy();

  const defaultModes: RiskModeInfo[] = [
    {
      id: 'conservador',
      name: 'Conservador',
      description: 'Preserva capital, minima volatilidad y baja exposicion.',
      max_exposure: 0.60,
      risk_level: 'Bajo',
      color: 'emerald',
      cooldown_hours: 24
    },
    {
      id: 'moderado',
      name: 'Moderado',
      description: 'Balance optimo entre rendimiento y riesgo (ratio Sharpe).',
      max_exposure: 0.80,
      risk_level: 'Medio',
      color: 'cyan',
      cooldown_hours: 8
    },
    {
      id: 'agresivo',
      name: 'Agresivo',
      description: 'Maximo rendimiento buscando capturar todo el yield disponible.',
      max_exposure: 0.95,
      risk_level: 'Alto',
      color: 'amber',
      cooldown_hours: 2
    }
  ];

  const modesToRender = riskModes.length > 0 ? riskModes : defaultModes;
  const currentModeInfo = modesToRender.find((m) => m.id === riskMode) || defaultModes[1];

  const getModeIcon = (modeId: RiskMode) => {
    switch (modeId) {
      case 'conservador':
        return <Shield className="w-5 h-5 text-emerald-400" />;
      case 'agresivo':
        return <Flame className="w-5 h-5 text-amber-400" />;
      case 'moderado':
      default:
        return <Scale className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getCardStyle = (modeId: RiskMode, isSelected: boolean) => {
    if (isSelected) {
      switch (modeId) {
        case 'conservador':
          return 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50';
        case 'agresivo':
          return 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50';
        case 'moderado':
        default:
          return 'bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50';
      }
    }
    return 'bg-[#0D1424] border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100';
  };

  const getBadgeStyle = (modeId: RiskMode) => {
    switch (modeId) {
      case 'conservador':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'agresivo':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'moderado':
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
  };

  const getProgressBarColor = (modeId: RiskMode) => {
    switch (modeId) {
      case 'conservador':
        return 'bg-emerald-400';
      case 'agresivo':
        return 'bg-amber-400';
      case 'moderado':
      default:
        return 'bg-cyan-400';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 text-white font-sans">
      
      {/* ALERTA DE ERROR CRITICO DE NODO/API */}
      {fetchError && (
        <div className="bg-red-950/40 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-red-400">Alerta de Sistema</h3>
            <p className="text-sm text-red-200/80 mt-1">{fetchError}</p>
          </div>
        </div>
      )}

      {/* SECCION DE SELECCION DE MODO DE RIESGO */}
      <div className="bg-[#0D1424] border border-cyan-900/20 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">CONFIGURACION DEL AGENTE IA</span>
            <h2 className="text-2xl font-bold text-white mt-0.5">Modo de Operacion de IA</h2>
            <p className="text-xs text-slate-400 mt-1">
              Selecciona el perfil de riesgo con el que trabajara el agente para optimizar la boveda.
            </p>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-800/40 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>IA Reevaluando estrategia...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modesToRender.map((modeItem) => {
            const isSelected = riskMode === modeItem.id;
            return (
              <div
                key={modeItem.id}
                onClick={() => setRiskMode(modeItem.id as RiskMode)}
                className={`cursor-pointer rounded-xl p-5 border transition-all duration-300 relative flex flex-col justify-between ${getCardStyle(
                  modeItem.id as RiskMode,
                  isSelected
                )}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50">
                        {getModeIcon(modeItem.id as RiskMode)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white leading-tight">{modeItem.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getBadgeStyle(modeItem.id as RiskMode)}`}>
                          Riesgo {modeItem.risk_level}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-cyan-500 text-black flex items-center justify-center font-bold">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed my-3">{modeItem.description}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800/60">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Exposicion maxima</span>
                      <span className="font-bold text-slate-200">{Math.round(modeItem.max_exposure * 100)}% TVL</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(modeItem.id as RiskMode)} transition-all duration-500`}
                        style={{ width: `${modeItem.max_exposure * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Cooldown de rebalanceo</span>
                    <span className="font-mono text-slate-300">{modeItem.cooldown_hours}h</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-[#070B14] border border-slate-800 rounded-lg flex items-center gap-3 text-xs text-slate-400">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            Modo activo: <strong className="text-white capitalize">{currentModeInfo.name}</strong>. {currentModeInfo.description}
          </span>
        </div>
      </div>

      {/* DASHBOARD PRINCIPAL DE ESTRATEGIA */}
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
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">ULTIMA RECOMENDACION DE IA</span>
                <h3 className="text-xl font-bold text-white">
                  {strategy.action === 'HOLD'
                    ? 'Mantener posicion en Aave'
                    : strategy.action === 'SUPPLY'
                    ? 'Incrementar suministro en Aave V3'
                    : 'Retirar parte del capital a Reserva'}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              {strategy.mode_description || currentModeInfo.description} Evaluacion generada por el agente IA para el perfil{' '}
              <strong className="text-cyan-400 capitalize">{strategy.active_mode || riskMode}</strong>.
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
    </div>
  );
};
