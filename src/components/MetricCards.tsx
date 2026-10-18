import React from 'react';
import { Flame, Clock, CreditCard, Target, TrendingDown } from 'lucide-react';
import { BurnRateMetrics, DebtRecord, SystemSettings } from '../types/sentinela';
import { formatCurrency } from '../lib/format';

interface MetricCardsProps {
  metrics: BurnRateMetrics;
  settings: SystemSettings;
  debts: DebtRecord[];
  showValues: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ 
  metrics, 
  settings, 
  debts, 
  showValues = true 
}) => {
  const isHidden = !showValues;
  const totalDividasRestantes = debts.reduce(
    (acc, d) => acc + Math.max(0, d.valor_total - d.valor_pago),
    0
  );

  const deltaTeto = metrics.teto_diario_atual - metrics.teto_diario_ideal;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
      {/* TILE 1: TETO MÓVEL DIÁRIO */}
      <div className="border border-[#00ff66]/70 bg-[#030c07]/90 p-3.5 relative shadow-lg shadow-[#00ff66]/10">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#00ff66] text-black font-extrabold text-[10px] tracking-wider uppercase mb-2">
          <Target className="w-3 h-3 text-black" />
          <span>Teto Móvel Diário</span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <span className="text-2xl font-black text-[#00ff66] tracking-tight">
            {formatCurrency(metrics.teto_diario_atual, isHidden)}
          </span>
          <span className="text-[10px] text-neutral-400">/dia</span>
        </div>

        <div className="mt-3 pt-2 border-t border-[#00ff66]/30 text-[11px] flex items-center justify-between">
          <span className="text-neutral-400">
            {metrics.dias_restantes}d restantes
          </span>
          <span className={`font-bold ${deltaTeto >= 0 ? 'text-[#00ff66]' : 'text-[#ff0055]'}`}>
            {isHidden ? '••••' : `${deltaTeto >= 0 ? '+' : ''}${deltaTeto.toFixed(2)} vs meta`}
          </span>
        </div>
      </div>

      {/* TILE 2: SALDO LIVRE (COM ESTADO GLOBAL DE PRIVACIDADE) */}
      <div className="border border-[#ffe600]/70 bg-[#0f0e03]/90 p-3.5 relative shadow-lg shadow-[#ffe600]/10">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#ffe600] text-black font-extrabold text-[10px] tracking-wider uppercase mb-2">
          <TrendingDown className="w-3 h-3 text-black" />
          <span>Saldo Livre Restante</span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <span className="text-2xl font-black text-[#ffe600] tracking-tight">
            {formatCurrency(metrics.saldo_restante, isHidden)}
          </span>
          <span className="text-[10px] text-neutral-400">
            de {formatCurrency(metrics.saldo_disponivel_inicial, isHidden)}
          </span>
        </div>

        {/* Cyberpunk Stepped Progress */}
        <div className="w-full h-1.5 bg-neutral-900 mt-3 border border-[#ffe600]/40 overflow-hidden">
          <div
            className="h-full bg-[#ffe600] transition-all duration-500"
            style={{ width: `${Math.max(0, 100 - metrics.burn_rate_percent)}%` }}
          />
        </div>

        <div className="mt-2 text-[10px] text-neutral-400 flex justify-between">
          <span>QUEIMADO: {metrics.burn_rate_percent.toFixed(0)}%</span>
          <span className="text-[#ffe600]">{isHidden ? 'PROTEGIDO' : 'DISPONÍVEL'}</span>
        </div>
      </div>

      {/* TILE 3: GASTOS IMPULSIVOS & HORAS PCD */}
      <div className="border border-[#ff0055]/80 bg-[#140309]/90 p-3.5 relative shadow-lg shadow-[#ff0055]/15">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#ff0055] text-black font-extrabold text-[10px] tracking-wider uppercase mb-2">
          <Flame className="w-3 h-3 text-black" />
          <span>Vazamento Impulsivo</span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <span className="text-2xl font-black text-[#ff0055] tracking-tight">
            {formatCurrency(metrics.total_gasto_impulsivo, isHidden)}
          </span>
          <span className="text-[10px] text-[#ff3377] uppercase font-bold animate-pulse">
            CUSTO EM VIDA
          </span>
        </div>

        <div className="mt-3 pt-2 border-t border-[#ff0055]/30 flex items-center gap-1.5 text-[11px] text-[#ff6699]">
          <Clock className="w-3.5 h-3.5 flex-shrink-0 text-[#ff0055]" />
          <span className="font-bold">
            {isHidden ? '•••• horas de trabalho' : `${metrics.horas_trabalhadas_perdidas.toFixed(1)}h de trabalho PCD`}
          </span>
        </div>
      </div>

      {/* TILE 4: FATURA DO CARTÃO / PASSIVO */}
      <div className="border border-[#00f0ff]/70 bg-[#030e14]/90 p-3.5 relative shadow-lg shadow-[#00f0ff]/10">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#00f0ff] text-black font-extrabold text-[10px] tracking-wider uppercase">
            <CreditCard className="w-3 h-3 text-black" />
            <span>Fatura do Cartão (Passivo)</span>
          </div>
          <span className="text-[10px] text-[#00f0ff] font-bold">
            VIRA: 17 // VENCE: 23
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <span className="text-2xl font-black text-[#00f0ff] tracking-tight">
            {formatCurrency(totalDividasRestantes, isHidden)}
          </span>
          <span className="text-[10px] text-neutral-400">saldo da fatura</span>
        </div>

        <div className="mt-3 pt-2 border-t border-[#00f0ff]/30 text-[11px] flex items-center justify-between text-[#00f0ff]/80">
          <span>
            {(() => {
              const diaHoje = new Date().getDate();
              const diaVenc = settings.dia_vencimento_cartao || 23;
              const diaFech = settings.dia_fechamento_cartao || 17;
              if (diaHoje === diaFech) return '⚡ Vira Hoje (Dia 17) • Melhores compras!';
              if (diaHoje > diaFech && diaHoje <= diaVenc) return `⚠️ Vencimento em ${diaVenc - diaHoje}d (Dia ${diaVenc})`;
              if (diaHoje === diaVenc) return '🚨 Vence Hoje (Dia 23)!';
              if (diaHoje < diaFech) return `Fecha em ${diaFech - diaHoje}d (Dia ${diaFech})`;
              return `Próx. fatura vira dia ${diaFech}`;
            })()}
          </span>
          <span className="text-[10px] text-[#00ff66] font-bold">[SALÁRIO DIA 05]</span>
        </div>
      </div>
    </div>
  );
};
