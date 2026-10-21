import React, { useState } from 'react';
import { Calculator, AlertTriangle, ArrowRight, Target } from 'lucide-react';
import { BurnRateMetrics, SystemSettings } from '../types/sentinela';
import { SentinelaBurnEngine } from '../lib/burnEngine';

interface SimulatorTabProps {
  metrics: BurnRateMetrics;
  settings: SystemSettings;
}

export const SimulatorTab: React.FC<SimulatorTabProps> = ({ metrics, settings }) => {
  const [simValue, setSimValue] = useState<number>(45);
  const [simMethod, setSimMethod] = useState<'pix' | 'cartao_credito' | 'dinheiro'>('pix');

  const impact = SentinelaBurnEngine.simulateImpact(metrics, simValue, settings);
  const isCartao = simMethod === 'cartao_credito';

  const handleReset = () => {
    setSimValue(45);
    setSimMethod('pix');
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Title & Concept Card */}
      <div className="border border-[#ffe600]/40 bg-[#070602]/95 p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#ffe600] text-black font-extrabold text-[11px] tracking-wider uppercase mb-1">
            <Calculator className="w-3.5 h-3.5 text-black" />
            <span>[ SIMULADOR DE QUEIMA // MOVING CEILING ALGORITHM ]</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Requisito de Engenharia #2: Calcule a punição instantânea no teto diário antes de autorizar qualquer desembolso.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1 border border-neutral-700 bg-black text-neutral-400 hover:text-[#00f0ff] hover:border-[#00f0ff] text-xs font-bold uppercase transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
        >
          [ ✕ REDEFINIR SIMULAÇÃO ]
        </button>
      </div>

      {/* Simulator Interactive Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Controls Column */}
        <div className="lg:col-span-5 border border-neutral-800 bg-[#04060d]/95 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#ffe600]">
              // PARÂMETROS DO GASTO SIMULADO
            </h3>
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] text-neutral-500 hover:text-white uppercase"
            >
              LIMPAR
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <label className="text-neutral-400">VALOR DO GASTO:</label>
              <span className="text-xl font-black text-[#ffe600]">
                R$ {simValue.toFixed(2)}
              </span>
            </div>

            <input
              type="range"
              min="5"
              max={Math.max(100, metrics.saldo_restante)}
              step="5"
              value={simValue}
              onChange={(e) => setSimValue(parseFloat(e.target.value))}
              className="w-full accent-[#ffe600] cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
              <span>R$ 5 (Café)</span>
              <span>R$ 45 (Lanche/iFood)</span>
              <span>R$ {metrics.saldo_restante.toFixed(0)} (Saldo Livre)</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 block mb-2 uppercase">
              FORMA DE PAGAMENTO SIMULADA:
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSimMethod('pix')}
                className={`py-1.5 px-2 border text-center transition-all cursor-pointer ${
                  simMethod === 'pix'
                    ? 'bg-[#00f0ff] border-[#00f0ff] text-black font-bold'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                PIX
              </button>
              <button
                type="button"
                onClick={() => setSimMethod('cartao_credito')}
                className={`py-1.5 px-2 border text-center transition-all cursor-pointer ${
                  simMethod === 'cartao_credito'
                    ? 'bg-[#00f0ff] border-[#00f0ff] text-black font-black'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:text-[#00f0ff]'
                }`}
              >
                CARTÃO CRÉDITO
              </button>
              <button
                type="button"
                onClick={() => setSimMethod('dinheiro')}
                className={`py-1.5 px-2 border text-center transition-all cursor-pointer ${
                  simMethod === 'dinheiro'
                    ? 'bg-[#00ff66] border-[#00ff66] text-black font-bold'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                DINHEIRO
              </button>
            </div>
          </div>

          {!metrics.tem_saldo_real && (simMethod === 'pix' || simMethod === 'dinheiro') && (
            <div className="p-3 bg-[#1e030a] border-2 border-[#ff0055] text-xs text-[#ff0055] space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#ff0055] animate-pulse" />
                // ALERTA DE FLUXO DE CAIXA: SALDO PIX = R$ 0,00
              </p>
              <p className="text-[10px] text-white leading-relaxed">
                {metrics.motivo_sem_saldo || 'O dinheiro ainda não entrou na conta.'} <strong className="text-[#ff3366] underline">Sem saldo: gastos vão para o cartão.</strong>
              </p>
              <button
                type="button"
                onClick={() => setSimMethod('cartao_credito')}
                className="w-full py-1.5 bg-[#ff0055] hover:bg-white text-black font-black text-[10px] uppercase transition-all cursor-pointer shadow-md"
              >
                → DIRECIONAR SIMULAÇÃO PARA CARTÃO DE CRÉDITO
              </button>
            </div>
          )}

          {isCartao && (
            <div className="p-3 bg-[#031118] border border-[#00f0ff] text-xs text-[#00f0ff] space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#00f0ff]" />
                // AVISO: FATURA DO CARTÃO DE CRÉDITO
              </p>
              <p className="text-[10px] text-neutral-300">
                Gastar R$ {simValue.toFixed(2)} no cartão de crédito entrará na sua próxima fatura, que você precisará pagar no vencimento.
              </p>
            </div>
          )}
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 border border-neutral-800 bg-[#04060d]/95 p-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#00ff66] flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#00ff66]" />
            // TELEMETRIA DE PENALIDADE NO TETO MÓVEL
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 bg-black border border-neutral-800">
              <span className="text-[9px] text-neutral-500 block uppercase">TETO HOJE</span>
              <span className="text-lg font-bold text-[#e0f2fe]">
                R$ {metrics.teto_diario_atual.toFixed(2)}
              </span>
              <span className="text-[9px] text-neutral-500 block">
                {metrics.dias_restantes}d restantes
              </span>
            </div>

            <div className="p-2.5 bg-black border border-[#ff0055] neon-glow-pink">
              <span className="text-[9px] text-[#ff0055] font-black block uppercase">
                NOVO TETO AMANHÃ
              </span>
              <span className="text-lg font-black text-[#ff0055]">
                R$ {impact.novo_teto_diario.toFixed(2)}
              </span>
              <span className="text-[9px] text-neutral-400 block">
                -R$ {impact.reducao_teto_diario.toFixed(2)}/dia a menos
              </span>
            </div>

            <div className="p-2.5 bg-black border border-[#ffe600]/40">
              <span className="text-[9px] text-[#ffe600] block uppercase">HORAS PCD PERDIDAS</span>
              <span className="text-lg font-bold text-[#ffe600]">
                {impact.horas_trabalho_equivalentes.toFixed(1)}h
              </span>
              <span className="text-[9px] text-neutral-500 block">
                de esforço em pé
              </span>
            </div>
          </div>

          {/* Stepped Visual Comparison Bar */}
          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex justify-between text-neutral-400 text-[10px]">
              <span>SALDO APÓS DISSIPAÇÃO:</span>
              <span>
                R$ {impact.novo_saldo.toFixed(2)} / R$ {metrics.saldo_restante.toFixed(2)}
              </span>
            </div>

            <div className="w-full h-2.5 bg-black border border-neutral-800 flex overflow-hidden">
              <div
                className="bg-[#00ff66] h-full transition-all duration-300"
                style={{
                  width: `${Math.max(
                    0,
                    (impact.novo_saldo / Math.max(1, metrics.saldo_disponivel_inicial)) * 100
                  )}%`,
                }}
              />
              <div
                className="bg-[#ff0055] h-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    (simValue / Math.max(1, metrics.saldo_disponivel_inicial)) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-neutral-500">
              <span className="text-[#00ff66]">VERDE: PRESERVADO</span>
              <span className="text-[#ff0055]">VERMELHO: QUEIMADO</span>
            </div>
          </div>

          {/* Nudge Conclusion */}
          <div className="p-3 bg-black border border-neutral-800 text-[11px] text-neutral-300 space-y-1">
            <p className="font-bold text-[#ffe600]">
              // ANÁLISE COMPORTAMENTAL:
            </p>
            <p className="text-neutral-400 leading-relaxed text-[10px]">
              Este gasto de <strong>R$ {simValue.toFixed(2)}</strong> mutilará{' '}
              <strong>R$ {impact.reducao_teto_diario.toFixed(2)}</strong> do seu orçamento de sobrevivência por{' '}
              <strong>{impact.dias_de_teto_consumidos.toFixed(1)} dias consecutivos</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
