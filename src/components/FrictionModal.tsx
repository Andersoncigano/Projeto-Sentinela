import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Flame, 
  Shield, 
  ArrowRight, 
  XOctagon, 
  Zap, 
  RotateCcw, 
  X,
  CreditCard 
} from 'lucide-react';
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

    // ESC key listener to abort/clear
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onAbort();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expense, onAbort]);

  if (!expense) return null;

  const impact = SentinelaBurnEngine.simulateImpact(metrics, expense.valor, settings);
  const isCard = expense.metodo_pagamento === 'cartao_credito' || 
                 expense.metodo_pagamento === 'cartao_proprio' || 
                 expense.metodo_pagamento === 'cartao_mae';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-mono animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#070308] border-2 border-[#ff0055] shadow-2xl neon-glow-pink relative max-h-[92vh] overflow-y-auto">
        {/* Top Cyberpunk Hazard Header com Botão de Voltar / Fechar */}
        <div className="bg-[#ff0055] text-black px-4 py-2 flex items-center justify-between font-black text-xs tracking-widest uppercase">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 fill-black text-black" />
            <span>[ ICE_CONTAINMENT // OVERRIDE DETECTADO ]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-black text-[#ff0055] px-1.5 py-0.2 text-[10px] font-bold">
              DEFCON_1
            </span>
            <button
              type="button"
              onClick={onAbort}
              className="p-0.5 bg-black text-[#ff0055] hover:bg-white hover:text-black transition-colors cursor-pointer"
              title="Voltar / Cancelar e limpar terminal (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Main Psychological Impact Warning */}
          <div className="text-center space-y-1.5">
            <h3 className="text-lg font-black text-[#ff0055] tracking-tight uppercase">
              // ATENÇÃO: GASTO IMPULSIVO INTERCEPTADO
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

          {/* Credit Card Alert */}
          {isCard && (
            <div className="bg-black border border-[#00f0ff]/70 p-3 text-xs text-[#00f0ff] flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-[#00f0ff] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#00f0ff] uppercase">
                    [ COMPROMISSO DE FATURA: CARTÃO DE CRÉDITO ]
                  </p>
                  <span className="text-[10px] bg-[#00f0ff]/20 text-[#00f0ff] px-1.5 py-0.2 font-bold">
                    VIRA 17 // VENCE 23
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Este valor será acumulado na fatura do cartão. A fatura <strong>vira no dia 17</strong> e tem <strong>prazo fatal até dia 23</strong>. Como seu salário cai no dia 05, certifique-se de manter o saldo reservado para quitar essa fatura em dia.
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
                  : 'Buffer concluído. Se este gasto não for estritamente necessário, clique em Voltar / Cancelar.'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Voltar / Cancelar (limpar terminal) + Abortar + Gastar sob penalidade */}
          <div className="space-y-2 pt-1">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {/* Botão VOLTAR / CANCELAR (apaga a informação e limpa o terminal) */}
              <button
                type="button"
                onClick={onAbort}
                className="w-full sm:flex-1 py-3 px-4 bg-[#00ff66] hover:bg-[#00f0ff] text-black font-black text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer neon-glow-green"
                title="Voltar à tela anterior, cancelar compra e limpar o terminal"
              >
                <RotateCcw className="w-4 h-4 text-black" />
                <span>[ ↩ VOLTAR / CANCELAR // LIMPAR TERMINAL ]</span>
              </button>

              {/* Botão Secundário de Abortar */}
              <button
                type="button"
                onClick={onAbort}
                className="w-full sm:w-auto py-3 px-4 border border-neutral-700 bg-black text-[#00ff66] hover:border-[#00ff66] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase"
              >
                <Shield className="w-3.5 h-3.5 text-[#00ff66]" />
                <span>SALVAR TETO</span>
              </button>
            </div>

            {/* Terceiro Botão: Gastar sob penalidade (desbloqueado após contagem) */}
            <div className="flex justify-center">
              <button
                type="button"
                disabled={!canConfirm}
                onClick={() => onConfirm(expense)}
                className="w-full py-2 px-3 border border-neutral-800 bg-black text-neutral-500 hover:text-[#ff0055] hover:border-[#ff0055] disabled:opacity-20 text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase font-mono"
              >
                <XOctagon className="w-3.5 h-3.5" />
                <span>{canConfirm ? 'Gastar mesmo assim sob penalidade' : `Trava de segurança: ${countdown}s restantes`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
