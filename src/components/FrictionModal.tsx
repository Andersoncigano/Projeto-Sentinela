import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Flame, Shield, ArrowRight, UserX, XOctagon, Zap } from 'lucide-react';
import { ExpenseRecord, BurnRateMetrics, SystemSettings } from '../types/sentinela';
import { SentinelaBurnEngine } from '../lib/burnEngine';
import { sound } from '../lib/sound';

interface FrictionModalProps {
  expense: ExpenseRecord | null;
  metrics: BurnRateMetrics;
  settings: SystemSettings;
  onAbort: () => void;
  onConfirm: (expense: ExpenseRecord) => void;
}

export const FrictionModal: React.FC<FrictionModalProps> = ({
  expense,
  metrics,
  settings,
  onAbort,
  onConfirm,
}) => {
  const [countdown, setCountdown] = useState(10);
  const [canConfirm, setCanConfirm] = useState(false);

  useEffect(() => {
    if (!expense) return;
    setCountdown(10);
    setCanConfirm(false);

    sound.playFrictionAlert();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanConfirm(true);
          return 0;
        }
        sound.playTick();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [expense]);

  if (!expense) return null;

  const impact = SentinelaBurnEngine.simulateImpact(metrics, expense.valor, settings);
  const isCartaoMae = expense.metodo_pagamento === 'cartao_mae';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-mono animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#070308] border-2 border-[#ff0055] shadow-2xl neon-glow-pink relative">
        {/* Top Cyberpunk Hazard Header (Inspired by KDE Daemon box in image) */}
        <div className="bg-[#ff0055] text-black px-4 py-2 flex items-center justify-between font-black text-xs tracking-widest uppercase">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 fill-black text-black" />
            <span>[ ICE_CONTAINMENT // OVERRIDE DETECTADO ]</span>
          </div>
          <span className="bg-black text-[#ff0055] px-1.5 py-0.2 text-[10px] font-bold">
            DEFCON_1
          </span>
        </div>

        <div className="p-6 space-y-5">
          {/* Main Psychological Impact Warning */}
          <div className="text-center space-y-1.5">
            <h3 className="text-lg font-black text-[#ff0055] tracking-tight uppercase">
              // ATENÇÃO: VOCÊ ESTÁ PRESTES A CANIBALIZAR SEU MÊS
            </h3>
            <p className="text-xs text-neutral-300">
              Gatilho de gasto impulsivo interceptado em:{' '}
              <span className="text-[#ffe600] font-bold">
                "{expense.descricao}"
              </span>{' '}
              no valor de{' '}
              <span className="text-[#00f0ff] font-bold text-sm">
                R$ {expense.valor.toFixed(2)}
              </span>
              .
            </p>
          </div>

          {/* Mother's Card Special Alert */}
          {isCartaoMae && (
            <div className="bg-black border border-[#ff0055] p-3 text-xs text-[#ff6699] flex items-start gap-3">
              <UserX className="w-5 h-5 text-[#ff0055] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[#ff0055] uppercase">
                  [ VIOLAÇÃO DE SOBERANIA: CARTÃO DA MÃE ]
                </p>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Usar o cartão de terceiros destrói sua independência. Sua mãe terá que pagar essa fatura com o dinheiro dela no final do mês.
                </p>
              </div>
            </div>
          )}

          {/* Real-time Loss Aversion Grids */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Hours of Life Lost */}
            <div className="bg-black border border-[#ff0055]/50 p-3.5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[#ff0055] font-bold mb-1 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-[#ff0055]" />
                <span>[ CUSTO EM TEMPO DE VIDA ]</span>
              </div>
              <div className="my-1">
                <span className="text-3xl font-black text-[#ff0055]">
                  {impact.horas_trabalho_equivalentes.toFixed(1)}h
                </span>
                <span className="text-[10px] text-neutral-400 block mt-1">
                  equivalentes a {impact.horas_trabalho_equivalentes.toFixed(1)} horas de trabalho PCD em pé!
                </span>
              </div>
            </div>

            {/* Ceiling Penalty */}
            <div className="bg-black border border-[#ffe600]/50 p-3.5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[#ffe600] font-bold mb-1 text-[11px]">
                <Flame className="w-3.5 h-3.5 text-[#ffe600]" />
                <span>[ MUTILAÇÃO DO TETO DIÁRIO ]</span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs line-through text-neutral-600">
                    R$ {metrics.teto_diario_atual.toFixed(2)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-neutral-500 inline" />
                  <span className="text-2xl font-black text-[#ffe600]">
                    R$ {impact.novo_teto_diario.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-neutral-400">/dia</span>
                </div>
                <span className="text-[10px] text-neutral-400 block mt-1">
                  Redução de <strong>R$ {impact.reducao_teto_diario.toFixed(2)}/dia</strong> pelos próximos {metrics.dias_restantes} dias.
                </span>
              </div>
            </div>
          </div>

          {/* Cooling-off Countdown Box */}
          <div className="bg-black border border-neutral-800 p-3.5 text-center space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">
              // PROTOCOLO DE DESACELERAÇÃO DOPAMINÉRGICA (COOLING-OFF)
            </span>

            <div className="flex items-center justify-center gap-3">
              <div className="w-9 h-9 border-2 border-[#00f0ff] flex items-center justify-center font-bold text-base text-[#00f0ff] neon-glow-cyan">
                {countdown}
              </div>
              <p className="text-[11px] text-neutral-300 text-left max-w-xs">
                {countdown > 0
                  ? `Buffer neural de ${countdown}s. Espere o cérebro reflexivo assumir o controle.`
                  : 'Buffer concluído. Se este gasto não for essencial à sobrevivência, aborte.'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Nudge heavily prioritizes Aborting */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {/* Primary Anti-Impulse Action (Cyber Neon Green Button) */}
            <button
              type="button"
              onClick={onAbort}
              className="w-full sm:flex-1 py-3 px-4 bg-[#00ff66] hover:bg-[#00f0ff] text-black font-black text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer neon-glow-green"
            >
              <Shield className="w-4 h-4 text-black" />
              <span>[ 🛡️ ABORTAR COMPRA // SALVAR TETO ]</span>
            </button>

            {/* Secondary De-emphasized Confirm Action */}
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => onConfirm(expense)}
              className="w-full sm:w-auto py-2.5 px-3 border border-neutral-700 bg-black text-neutral-500 hover:text-[#ff0055] hover:border-[#ff0055] disabled:opacity-20 text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase"
            >
              <XOctagon className="w-3.5 h-3.5" />
              <span>{canConfirm ? 'Gastar sob penalidade' : `Trava: ${countdown}s`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
