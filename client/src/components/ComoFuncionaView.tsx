import React from 'react';
import { Database, Brain, Compass, FileSignature, TrendingUp, ShieldCheck, Eye, Zap, Bot, User, Cpu, FileCheck2, ArrowRight } from 'lucide-react';

interface ComoFuncionaViewProps {
  // Opcional: si App.tsx lo pasa, se muestra el botón para empezar
  onNavigate?: (tab: string) => void;
}

const steps = [
  {
    num: 1,
    title: 'Lectura de datos',
    desc: 'El agente IA consulta datos de mercado de Aave V3: tasas, uso del pool y volatilidad.',
    icon: Database,
  },
  {
    num: 2,
    title: 'Análisis con IA',
    desc: 'Evalúa rendimiento y riesgo según el modo que elegiste: conservador, moderado o agresivo.',
    icon: Brain,
  },
  {
    num: 3,
    title: 'Recomendación',
    desc: 'Decide si depositar más en Aave, retirar o mantener, con su nivel de confianza.',
    icon: Compass,
  },
  {
    num: 4,
    title: 'Firma y verificación',
    desc: 'La IA firma la señal. Cualquiera puede enviarla, pero el contrato verifica la firma antes de mover fondos.',
    icon: FileSignature,
  },
  {
    num: 5,
    title: 'Seguimiento',
    desc: 'Tu valor actual, tu rendimiento y tu actividad se leen del contrato y se ven en Vault y Actividad.',
    icon: TrendingUp,
  },
];

const roles = [
  {
    who: 'Tú',
    icon: User,
    items: ['Depositas y retiras USDC cuando quieras', 'Eliges el modo de riesgo', 'Conservas tus shares del vault, que representan tu parte'],
  },
  {
    who: 'La IA',
    icon: Cpu,
    items: ['Analiza el mercado', 'Recomienda depositar, retirar o mantener', 'Firma la señal; no puede mover fondos fuera del vault'],
  },
  {
    who: 'El contrato',
    icon: FileCheck2,
    items: ['Verifica que la firma es del agente registrado', 'Rechaza señales repetidas o vencidas', 'Exige al menos 8 h entre rebalanceos', 'Solo mueve fondos entre el vault y Aave'],
  },
];

const pillars = [
  { title: 'Seguridad primero', desc: 'La IA solo puede mover fondos entre el vault y Aave. Tú retiras cuando quieras.', icon: ShieldCheck },
  { title: 'Transparencia total', desc: 'Cada acción queda en la blockchain y puedes verla en el explorer.', icon: Eye },
  { title: 'Eficiencia DeFi', desc: 'Usamos la infraestructura de Aave V3 en Arbitrum.', icon: Zap },
  { title: 'IA con límites', desc: 'La IA solo recomienda y firma; el contrato decide si la señal es válida.', icon: Bot },
];

export const ComoFuncionaView: React.FC<ComoFuncionaViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 text-white font-sans">
      <div>
        <h2 className="text-3xl font-bold">¿Cómo funciona ArbiAgent?</h2>
        <p className="text-xs text-slate-400 mt-1">La IA recomienda y firma, y el contrato verifica antes de ejecutar. Así se optimiza tu rendimiento en Arbitrum.</p>
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.num} className="bg-[#0D1424] border border-cyan-900/20 p-5 rounded-xl hover:border-cyan-500/40 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-7 h-7 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-xs">
                  {step.num}
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="font-bold text-sm text-white mb-2">{step.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
            </li>
          );
        })}
      </ol>

      <section>
        <h3 className="text-xl font-bold mb-1">Quién hace qué</h3>
        <p className="text-xs text-slate-400 mb-4">Ninguna parte tiene control total: por eso puedes confiar en el proceso.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.who} className="bg-[#0D1424] border border-cyan-900/20 p-5 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white">{r.who}</h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  {r.items.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className="text-cyan-400">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="bg-[#0D1424] border border-cyan-900/20 p-4 rounded-xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white mb-0.5">{p.title}</h4>
                <p className="text-[11px] text-slate-400 leading-snug">{p.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {onNavigate && (
        <div className="flex justify-center">
          <button
            onClick={() => onNavigate('vault')}
            className="inline-flex items-center gap-2 rounded-full bg-[#d4af5f] px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-[#d4af5f]/20 transition hover:bg-[#c9a94a]"
          >
            Ir al vault y empezar
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
