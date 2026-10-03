import React from 'react';
import { Info, Zap, Shield, Scale, Flame, ExternalLink, RefreshCw, CheckCircle, AlertTriangle, Award, Check } from 'lucide-react';
import { useStrategy } from '../hooks/useStrategy';
import { ARBITRUM_SEPOLIA_EXPLORER } from '../config/constants';
import { formatPercent, riskLabel, modeLabel, modeDescription } from '../utils/format';
import { RiskMode, RiskModeInfo } from '../types';

const MODE_STYLES: Record<RiskMode, { icon: React.ReactNode; selected: string; badge: string; bar: string }> = {
  conservador: {
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
    selected: 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bar: 'bg-emerald-400',
  },
  moderado: {
    icon: <Scale className="w-5 h-5 text-cyan-400" />,
    selected: 'bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    bar: 'bg-cyan-400',
  },
  agresivo: {
    icon: <Flame className="w-5 h-5 text-amber-400" />,
    selected: 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    bar: 'bg-amber-400',
  },
};
const modeStyle = (id: string) => MODE_STYLES[id as RiskMode] ?? MODE_STYLES.moderado;
const UNSELECTED_CARD = 'bg-[#0D1424] border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100';

const RISK_STYLES: Record<string, { text: string; bar: string; filled: number }> = {
  Bajo: { text: 'text-emerald-400', bar: 'bg-emerald-400', filled: 1 },
  Medio: { text: 'text-cyan-400', bar: 'bg-cyan-400', filled: 3 },
  Alto: { text: 'text-amber-400', bar: 'bg-amber-400', filled: 5 },
};

const ACTION_TITLES: Record<string, string> = {
  HOLD: 'Hold position in Aave',
  SUPPLY: 'Increase supply to Aave V3',
  WITHDRAW: 'Move part of the capital to reserve',
};

// En esta versión del buildathon solo el modo Moderado está activo
const ENABLED_MODE: RiskMode = 'moderado';

// El contrato exige este mínimo entre rebalanceos, sea cual sea el modo (REBALANCE_COOLDOWN = 8 hours)
const CONTRACT_COOLDOWN_HOURS = 8;

const defaultModes: RiskModeInfo[] = [
  { id: 'conservador', name: 'Conservador', description: 'Preserva capital, mínima volatilidad y baja exposición.', max_exposure: 0.6, risk_level: 'Bajo', color: 'emerald', cooldown_hours: 24 },
  { id: 'moderado', name: 'Moderado', description: 'Balance óptimo entre rendimiento y riesgo (ratio Sharpe).', max_exposure: 0.8, risk_level: 'Medio', color: 'cyan', cooldown_hours: 8 },
  { id: 'agresivo', name: 'Agresivo', description: 'Máximo rendimiento buscando capturar todo el yield disponible.', max_exposure: 0.95, risk_level: 'Alto', color: 'amber', cooldown_hours: 2 },
];

// Medidor de 5 segmentos: solo se usa donde el nivel refleja un dato real.
const Meter: React.FC<{ filled: number; barClass: string }> = ({ filled, barClass }) => (
  <div className="flex justify-center gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className={`w-3 h-1 rounded-full ${i <= filled ? barClass : 'bg-slate-800'}`} />
    ))}
  </div>
);

export const EstrategiaIAView: React.FC = () => {
  const {
    riskMode,
    setRiskMode,
    riskModes,
    strategy,
    hasLoaded,
    isLoading,
    isExecuting,
    executionResult,
    executeStrategy,
    fetchStrategy,
    fetchError,
  } = useStrategy();

  const modesToRender = riskModes.length > 0 ? riskModes : defaultModes;
  const currentModeInfo = modesToRender.find((m) => m.id === riskMode) || defaultModes[1];

  // Límite real del modo activo: máximo del vault que puede estar en Aave
  const maxExposurePct = Math.round(currentModeInfo.max_exposure * 100);
  const reservePct = 100 - maxExposurePct;
  const RING_LENGTH = 471; // circunferencia con r=75
  const ringOffset = RING_LENGTH * (1 - currentModeInfo.max_exposure);

  const riskStyle = RISK_STYLES[strategy.risk_level] ?? RISK_STYLES.Medio;
  const confidencePct = Math.min(Math.round(strategy.confidence * 100), 100);
  const dash = '—';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 text-white font-sans">
      {fetchError && (
        <div className="bg-red-950/40 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-red-400">Could not reach the AI</h3>
            <p className="text-sm text-red-200/80 mt-1">{fetchError}</p>
            <p className="text-xs text-red-200/60 mt-1">Check that the backend is running and try again.</p>
          </div>
        </div>
      )}

      {/* Selección de modo de riesgo */}
      <div className="bg-[#0D1424] border border-cyan-900/20 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">AI agent settings</span>
            <h2 className="text-2xl font-bold text-white mt-0.5">AI operating mode</h2>
            <p className="text-xs text-slate-400 mt-1">
              Only Moderate mode is active in this version. The other profiles are coming soon.
            </p>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-800/40 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>The AI is re-evaluating the strategy...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modesToRender.map((modeItem) => {
            const isSelected = riskMode === modeItem.id;
            const isDisabled = modeItem.id !== ENABLED_MODE;
            const style = modeStyle(modeItem.id);
            return (
              <div
                key={modeItem.id}
                role="button"
                tabIndex={isDisabled ? -1 : 0}
                aria-pressed={isSelected}
                aria-disabled={isDisabled}
                title={isDisabled ? 'Only Moderate mode is active' : undefined}
                onClick={() => {
                  if (!isDisabled) setRiskMode(modeItem.id as RiskMode);
                }}
                onKeyDown={(e) => {
                  if (isDisabled) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setRiskMode(modeItem.id as RiskMode);
                  }
                }}
                className={`group rounded-xl p-5 border transition-all duration-300 relative flex flex-col justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  isDisabled
                    ? 'cursor-not-allowed bg-[#0D1424] border-slate-800 opacity-50'
                    : `cursor-pointer ${isSelected ? style.selected : UNSELECTED_CARD}`
                }`}
              >
                {isDisabled && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/70 p-4 text-center text-xs font-semibold text-slate-100 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    Only Moderate mode is active
                  </div>
                )}
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50">{style.icon}</div>
                      <div>
                        <h3 className="font-bold text-lg text-white leading-tight">{modeLabel(modeItem.id)}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${style.badge}`}>
                          {riskLabel(modeItem.risk_level)} risk
                        </span>
                        {isDisabled && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Coming soon</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-cyan-500 text-black flex items-center justify-center font-bold">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed my-3">{modeDescription(modeItem.id, modeItem.description)}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800/60">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Max exposure</span>
                      <span className="font-bold text-slate-200">{Math.round(modeItem.max_exposure * 100)}% of vault</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div className={`h-full ${style.bar} transition-all duration-500`} style={{ width: `${modeItem.max_exposure * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Wait between rebalances</span>
                    <span className="font-mono text-slate-300">{modeItem.cooldown_hours} h</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-[#070B14] border border-slate-800 rounded-lg flex items-center gap-3 text-xs text-slate-400">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            Active mode: <strong className="text-white capitalize">{modeLabel(currentModeInfo.id)}</strong>. {modeDescription(currentModeInfo.id, currentModeInfo.description)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exposure limit (dato real del modo activo) */}
        <div className="bg-[#0D1424] border border-cyan-900/20 rounded-xl p-6 relative">
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Exposure limit</span>
              <h2 className="text-2xl font-bold text-white mt-1">Vault strategy</h2>
            </div>
            <div className="flex items-center gap-1.5 bg-[#070B14] border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300">
              <span>{hasLoaded ? strategy.recommended_protocol : 'Aave V3'}</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-around my-8 gap-6">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                <circle cx="96" cy="96" r="75" stroke="#121927" strokeWidth="16" fill="transparent" />
                <circle
                  cx="96"
                  cy="96"
                  r="75"
                  stroke="#06b6d4"
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-white">{maxExposurePct}%</span>
                <span className="text-xs text-cyan-400 font-medium">max in Aave</span>
                <span className="text-[10px] text-slate-500">{modeLabel(currentModeInfo.id)} mode</span>
              </div>
            </div>

            <div className="w-full md:w-auto space-y-3">
              <div className="flex items-center justify-between md:justify-start gap-4 p-3 bg-[#070B14] border border-slate-800 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 font-bold text-xs">A</div>
                <div>
                  <div className="font-semibold text-sm">Aave V3</div>
                  <div className="text-xs text-slate-500">Yield via lending</div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-bold text-cyan-400 text-sm">up to {maxExposurePct}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-start gap-4 p-3 bg-[#070B14] border border-slate-800 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-slate-500/10 border border-slate-500/30 flex items-center justify-center text-slate-300 font-bold text-xs">R</div>
                <div>
                  <div className="font-semibold text-sm">Liquid reserve</div>
                  <div className="text-xs text-slate-500">Available for withdrawals</div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-bold text-slate-300 text-sm">min. {reservePct}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 p-3 bg-[#070B14] border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-300">ArbiAgent score</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {hasLoaded ? `${strategy.arbiagent_score.toFixed(1)} / 100` : dash}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 p-3 bg-[#070B14] border border-slate-800/80 rounded-lg flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>This vault uses Aave V3 on Arbitrum Sepolia. The AI decides how much capital to move within the limit of your mode.</span>
            </div>
            <button
              onClick={() => fetchStrategy()}
              title="Refresh recommendation"
              aria-label="Refresh recommendation"
              className="p-1 hover:text-cyan-400 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Última recomendación */}
        <div className="bg-[#0D1424] border border-cyan-900/20 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 font-bold">AI</div>
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Latest AI recommendation</span>
                <h3 className="text-xl font-bold text-white">
                  {hasLoaded ? ACTION_TITLES[strategy.action] ?? strategy.action : 'Recommendation not available'}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              {modeDescription(strategy.active_mode || riskMode, strategy.mode_description || currentModeInfo.description)} Generated by the AI agent. Profile:{' '}
              <strong className="text-cyan-400 capitalize">{modeLabel(strategy.active_mode || riskMode)}</strong>.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-[#070B14] border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase">Confidence</span>
                <div className="text-lg font-bold text-emerald-400 my-1">{hasLoaded ? `${confidencePct}%` : dash}</div>
                <Meter filled={hasLoaded ? Math.round(strategy.confidence * 5) : 0} barClass="bg-emerald-400" />
              </div>

              <div className="bg-[#070B14] border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase">Estimated APY</span>
                <div className="text-lg font-bold text-cyan-400 my-1">{hasLoaded ? formatPercent(strategy.estimated_apy) : dash}</div>
                <span className="text-[10px] text-slate-500">Annual, variable</span>
              </div>

              <div className="bg-[#070B14] border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase">Risk</span>
                <div className={`text-lg font-bold my-1 ${riskStyle.text}`}>{hasLoaded ? riskLabel(strategy.risk_level) : dash}</div>
                <Meter filled={hasLoaded ? riskStyle.filled : 0} barClass={riskStyle.bar} />
              </div>

              <div className="bg-[#070B14] border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase">Volatility (7 d)</span>
                <div className="text-lg font-bold text-cyan-400 my-1">{hasLoaded ? formatPercent(strategy.volatility_7d) : dash}</div>
                <span className="text-[10px] text-slate-500">Last 7 days</span>
              </div>
            </div>

            {executionResult && (
              <div
                className={`mb-6 p-4 rounded-xl text-xs space-y-2 border ${
                  executionResult.success
                    ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                    : 'bg-red-950/40 border-red-800/50 text-red-300'
                }`}
              >
                <div className="flex items-start gap-2 font-semibold">
                  {executionResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
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

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
              Your wallet sends the transaction and pays the gas. The contract verifies that the signal comes from the registered AI agent and requires at least {CONTRACT_COOLDOWN_HOURS} h between rebalances.
            </p>
            <button
              onClick={executeStrategy}
              disabled={isExecuting || !hasLoaded}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-xs disabled:opacity-50 shrink-0"
            >
              {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span>{isExecuting ? 'Executing rebalance...' : 'Execute strategy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
