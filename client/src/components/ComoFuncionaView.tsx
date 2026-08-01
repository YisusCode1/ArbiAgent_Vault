import React from 'react';
import { Database, Brain, Compass, Box, TrendingUp, ShieldCheck, Eye, Zap, Bot, ExternalLink } from 'lucide-react';

export const ComoFuncionaView: React.FC = () => {
  const steps = [
    {
      num: 1,
      title: 'Recoleccion de datos',
      desc: 'Nuestro agente IA recopila y analiza datos on-chain y de mercado en tiempo real.',
      icon: Database,
    },
    {
      num: 2,
      title: 'Analisis con IA',
      desc: 'La IA evalua condiciones del mercado, riesgo y oportunidades usando modelos entrenados.',
      icon: Brain,
    },
    {
      num: 3,
      title: 'Generacion de estrategia',
      desc: 'Se genera una recomendacion (mantener, ajustar o rebalancear) con nivel de confianza.',
      icon: Compass,
    },
    {
      num: 4,
      title: 'Ejecucion on-chain',
      desc: 'Si la senal es aprobada, el contrato ejecuta la estrategia en Aave V3 de forma segura.',
      icon: Box,
    },
    {
      num: 5,
      title: 'Monitoreo continuo',
      desc: 'El sistema monitorea el rendimiento y vuelve a evaluar para maximizar tu retorno ajustado al riesgo.',
      icon: TrendingUp,
    },
  ];

  const pillars = [
    {
      title: 'Seguridad primero',
      desc: 'Smart contracts auditables y ejecucion controlada por el usuario.',
      icon: ShieldCheck,
    },
    {
      title: 'Transparencia total',
      desc: 'Todas las acciones y datos son visibles en tiempo real.',
      icon: Eye,
    },
    {
      title: 'Eficiencia DeFi',
      desc: 'Aprovechamos la infraestructura de Aave V3 en Arbitrum.',
      icon: Zap,
    },
    {
      title: 'IA responsable',
      desc: 'Modelos entrenados para maximizar rendimiento con gestion de riesgo.',
      icon: Bot,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 text-white font-sans">
      <div>
        <h2 className="text-3xl font-bold">¿Como funciona ArbiAgent?</h2>
        <p className="text-xs text-slate-400 mt-1">IA + DeFi trabajando juntos para optimizar tu rendimiento en Arbitrum.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
        {steps.map((step) => {
          const IconComponent = step.icon;
          return (
            <div key={step.num} className="bg-[#0D1424] border border-cyan-900/20 p-5 rounded-xl flex flex-col justify-between relative group hover:border-cyan-500/40 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-7 h-7 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-xs">
                    {step.num}
                  </div>
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">
                    <IconComponent className="w-5 h-5" />
                  </div>
                </div>

                <h3 className="font-bold text-sm text-white mb-2">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pillars.map((p, idx) => {
          const IconComp = p.icon;
          return (
            <div key={idx} className="bg-[#0D1424] border border-cyan-900/20 p-4 rounded-xl flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 flex-shrink-0">
                <IconComp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white mb-0.5">{p.title}</h4>
                <p className="text-[11px] text-slate-400 leading-snug">{p.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#070B14] border border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span><strong className="text-slate-200">MODO DEMO:</strong> Arquitectura impulsada por agentes inteligentes en Arbitrum.</span>
        </div>
        <a href="#info" className="text-cyan-400 hover:underline flex items-center gap-1">
          Mas informacion <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
