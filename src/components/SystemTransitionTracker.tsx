import React from 'react';
import { 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Briefcase, 
  ShieldCheck, 
  RotateCcw,
  Zap,
  Info
} from 'lucide-react';
import { SystemSettings, ExpenseRecord } from '../types/sentinela';
import { formatCurrency } from '../lib/format';
import { sound } from '../lib/sound';

interface SystemTransitionTrackerProps {
  settings: SystemSettings;
  expenses: ExpenseRecord[];
  selectedMonth: string;
  showValues: boolean;
  onToggleFaturaNovembroPaga: (paga: boolean) => void;
  onSelectMonth: (month: string) => void;
  onUpdateRescisao?: (valor: number) => void;
}

export const SystemTransitionTracker: React.FC<SystemTransitionTrackerProps> = ({
  settings,
  expenses,
  selectedMonth,
  showValues,
  onToggleFaturaNovembroPaga,
  onSelectMonth,
}) => {
  const isHidden = !showValues;
  const isFaturaNovPaga = Boolean(settings.fatura_novembro_paga);
  const isDezembroAtivo = selectedMonth === '2026-12';

  // Total acumulado no cartão com vencimento em 23/11 (compras após virada do dia 17/10)
  const cartaoNovExpenses = expenses.filter((e) => {
    const isCartao =
      e.metodo_pagamento === 'cartao_credito' ||
      e.metodo_pagamento === 'cartao_proprio' ||
      e.metodo_pagamento === 'cartao_mae';
    return isCartao && (!e.fatura_mes || e.fatura_mes === '2026-11' || e.data >= '2026-10-17');
  });

  const totalFaturaNovembro = cartaoNovExpenses.reduce((sum, e) => sum + e.valor, 0);

  const temRescisao = Boolean(
    settings.rescisao_prevista?.status === 'recebido' && (settings.rescisao_prevista?.valor ?? 0) > 0
  );
  const valorRescisao = temRescisao ? (settings.rescisao_prevista?.valor ?? settings.reserva_emergencia) : 0;
  const saldoLiquidoReserva = temRescisao ? Math.max(0, valorRescisao - totalFaturaNovembro) : null;

  return (
    <div className="bg-[#040810] border-2 border-[#00f0ff] p-4 neon-glow-cyan shadow-xl space-y-4">
      {/* Cabeçalho do Cronograma de Virada */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#00f0ff]/10 border border-[#00f0ff] text-[#00f0ff]">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">
                CRONOGRAMA DE VIRADA DO SISTEMA (23/11 ➔ 05/12)
              </span>
              <span className="px-1.5 py-0.2 bg-[#00f0ff] text-black font-black text-[9px] uppercase">
                PLANEJAMENTO OFICIAL
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Etapa 1: Liquidação do cartão com a rescisão (23/11) • Etapa 2: Entrada do novo salário e virada do ciclo (05/12).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isFaturaNovPaga ? (
            <span className="px-2.5 py-1 bg-[#00ff66]/15 border border-[#00ff66] text-[#00ff66] text-xs font-black flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>FATURA 23/11 QUITADA</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-[#ffe600]/15 border border-[#ffe600] text-[#ffe600] text-xs font-black flex items-center gap-1.5 animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span>AGUARDANDO QUITAÇÃO 23/11</span>
            </span>
          )}
        </div>
      </div>

      {/* Linha do Tempo / Timeline Interativa em 4 Passos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        {/* PASSO 1: 30/10 - SEXTA-FEIRA */}
        <div className="p-3 bg-[#080d1a] border border-neutral-800 relative space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 bg-[#bd00ff] text-black font-black text-[9px] uppercase">
              PASSO 1 • 30/10
            </span>
            <Briefcase className="w-3.5 h-3.5 text-[#bd00ff]" />
          </div>
          <div>
            <div className="font-black text-white text-xs">RESCISÃO NA CONTA</div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Homologação da Reserva</div>
          </div>
          <p className="text-[10.5px] text-neutral-300 leading-snug">
            Cai o dinheiro da rescisão. Constitui 100% da sua Reserva de Emergência inicial.
          </p>
          <div className="pt-1.5 border-t border-neutral-800 text-[10px] text-[#00f0ff] font-bold">
            {temRescisao ? `✓ R$ ${valorRescisao.toFixed(2)} registrado` : 'A definir na sexta (30/10)'}
          </div>
        </div>

        {/* PASSO 2: 17/11 - CORTE DA FATURA */}
        <div className="p-3 bg-[#080d1a] border border-neutral-800 relative space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 bg-neutral-700 text-neutral-200 font-black text-[9px] uppercase">
              PASSO 2 • 17/11
            </span>
            <Calendar className="w-3.5 h-3.5 text-[#00f0ff]" />
          </div>
          <div>
            <div className="font-black text-white text-xs">BANDEIRA VIRA P/ DEZ</div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Fechamento da Fatura</div>
          </div>
          <p className="text-[10.5px] text-neutral-300 leading-snug">
            A fatura de 23/11 congela. Compras feitas a partir daqui vencem só em <strong>23/12</strong>.
          </p>
          <div className="pt-1.5 border-t border-neutral-800 text-[10px] text-neutral-400">
            Fatura 23/11: {formatCurrency(totalFaturaNovembro, isHidden)}
          </div>
        </div>

        {/* PASSO 3: 23/11 - LIQUIDAÇÃO COM RESCISÃO (ETAPA 1) */}
        <div className={`p-3 border-2 relative space-y-2.5 transition-all ${
          isFaturaNovPaga 
            ? 'bg-[#02180d] border-[#00ff66]' 
            : 'bg-[#0f1105] border-[#ffe600] shadow-md shadow-[#ffe600]/10'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`px-1.5 py-0.5 text-black font-black text-[9px] uppercase ${
              isFaturaNovPaga ? 'bg-[#00ff66]' : 'bg-[#ffe600]'
            }`}>
              ETAPA 1 • 23/11
            </span>
            <CreditCard className={`w-3.5 h-3.5 ${isFaturaNovPaga ? 'text-[#00ff66]' : 'text-[#ffe600]'}`} />
          </div>
          <div>
            <div className={`font-black text-xs ${isFaturaNovPaga ? 'text-[#00ff66]' : 'text-white'}`}>
              LIQUIDAR CARTÃO
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Pagar Fatura c/ Rescisão</div>
          </div>
          <p className="text-[10.5px] text-neutral-300 leading-snug">
            Pague o boleto do cartão (<strong>{formatCurrency(totalFaturaNovembro, isHidden)}</strong>) usando a rescisão já em conta.
          </p>

          <button
            type="button"
            onClick={() => {
              sound.playSuccess();
              onToggleFaturaNovembroPaga(!isFaturaNovPaga);
            }}
            className={`w-full py-1.5 px-2 font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow ${
              isFaturaNovPaga
                ? 'bg-[#00ff66] hover:bg-[#ff0055] text-black hover:text-white'
                : 'bg-[#ffe600] hover:bg-[#00ff66] text-black'
            }`}
            title={isFaturaNovPaga ? 'Clique para desmarcar se necessário' : 'Clique para registrar que a fatura foi paga com a rescisão'}
          >
            {isFaturaNovPaga ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>✓ PAGA C/ RESCISÃO</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>LIQUIDAR FATURA (23/11)</span>
              </>
            )}
          </button>
        </div>

        {/* PASSO 4: 05/12 - VIRADA DO SISTEMA (ETAPA 2) */}
        <div className={`p-3 border-2 relative space-y-2.5 transition-all ${
          isDezembroAtivo
            ? 'bg-[#031d10] border-[#00ff66]'
            : 'bg-[#031522] border-[#00f0ff] shadow-md shadow-[#00f0ff]/10'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`px-1.5 py-0.5 text-black font-black text-[9px] uppercase ${
              isDezembroAtivo ? 'bg-[#00ff66]' : 'bg-[#00f0ff]'
            }`}>
              ETAPA 2 • 05/12
            </span>
            <Sparkles className={`w-3.5 h-3.5 ${isDezembroAtivo ? 'text-[#00ff66]' : 'text-[#00f0ff]'}`} />
          </div>
          <div>
            <div className={`font-black text-xs ${isDezembroAtivo ? 'text-[#00ff66]' : 'text-white'}`}>
              VIRADA DO SISTEMA
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Novo Ciclo Salário PCD</div>
          </div>
          <p className="text-[10.5px] text-neutral-300 leading-snug">
            Cai o novo salário de R$ 850. Sistema libera R$ 200 de Pix livre e teto diário de ~R$ 6,50/dia.
          </p>

          <button
            type="button"
            onClick={() => {
              sound.playTick();
              onSelectMonth(isDezembroAtivo ? '2026-10' : '2026-12');
            }}
            className={`w-full py-1.5 px-2 font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow ${
              isDezembroAtivo
                ? 'bg-[#00ff66] text-black hover:bg-neutral-800 hover:text-white'
                : 'bg-[#00f0ff] hover:bg-white text-black'
            }`}
            title="Alternar entre o mês de transição atual e o ciclo de Dezembro/2026"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>{isDezembroAtivo ? 'VOLTAR P/ OUTUBRO' : 'VIRAR P/ DEZEMBRO'}</span>
          </button>
        </div>
      </div>

      {/* Caixa Informativa com o Racional de Transição */}
      <div className="p-3 bg-[#020b14] border border-[#00f0ff]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2 text-neutral-300 text-[11px] leading-relaxed">
          <Info className="w-4 h-4 text-[#00f0ff] flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Por que virar em 05/12 e não logo após o dia 23/11?</strong>
            <p className="text-neutral-400 text-[10.5px] mt-0.5">
              Entre 23/11 e 04/12 você já pagou a fatura, mas o salário novo só cai no dia 05. Se o sistema virasse o mês antes de 05/12, a margem de Pix do salário ficaria zerada (R$ 0,00). No dia <strong>05/12</strong>, com o salário em mãos, a virada é limpa e 100% calibrada.
            </p>
          </div>
        </div>

        {saldoLiquidoReserva !== null && (
          <div className="px-3 py-1.5 bg-black border border-[#00ff66] text-right flex-shrink-0">
            <div className="text-[9px] uppercase font-mono text-neutral-400">Reserva Líquida Pós-23/11</div>
            <div className="text-sm font-black text-[#00ff66]">
              {formatCurrency(saldoLiquidoReserva, isHidden)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
