import React from 'react';
import { Flame, Clock, CreditCard, Target, TrendingDown, AlertTriangle } from 'lucide-react';
import { BurnRateMetrics, DebtRecord, SystemSettings, ExpenseRecord } from '../types/sentinela';
import { formatCurrency } from '../lib/format';

interface MetricCardsProps {
  metrics: BurnRateMetrics;
  settings: SystemSettings;
  debts: DebtRecord[];
  expenses?: ExpenseRecord[];
  selectedMonth?: string;
  showValues: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ 
  metrics, 
  settings, 
  debts, 
  expenses = [],
  selectedMonth,
  showValues = true 
}) => {
  const isHidden = !showValues;
  const semSaldo = !metrics.tem_saldo_real;
  
  // Total da Fatura do Cartão: Faturas cadastradas + compras do cartão no ciclo
  const diaFechamento = settings.dia_fechamento_cartao || 17;
  const faturaOutubroPaga = settings.fatura_outubro_paga !== false;

  // Separação por ciclo de fatura:
  // Gastos a partir do dia 17 pertencem à fatura do mês seguinte (Novembro, vence 23/11)
  const cartaoExpensesNov = expenses.filter(
    (e) => {
      const isCard = e.metodo_pagamento === 'cartao_credito' ||
        e.metodo_pagamento === 'cartao_proprio' ||
        e.metodo_pagamento === 'cartao_mae';
      if (!isCard) return false;
      const day = parseInt(e.data.split('-')[2] || '0', 10);
      const isOct = e.data.startsWith('2026-10');
      const isNov = e.data.startsWith('2026-11');
      return (isOct && day >= diaFechamento) || (isNov && day < diaFechamento);
    }
  );
  const totalCartaoNov = cartaoExpensesNov.reduce((acc, e) => acc + e.valor, 0);

  const cartaoExpensesOut = expenses.filter(
    (e) => {
      const isCard = e.metodo_pagamento === 'cartao_credito' ||
        e.metodo_pagamento === 'cartao_proprio' ||
        e.metodo_pagamento === 'cartao_mae';
      if (!isCard) return false;
      const day = parseInt(e.data.split('-')[2] || '0', 10);
      return e.data.startsWith('2026-10') && day < diaFechamento;
    }
  );
  const totalCartaoOut = faturaOutubroPaga ? 0 : cartaoExpensesOut.reduce((acc, e) => acc + e.valor, 0);

  const passivoDebts = debts
    .filter(d => (d.valor_total - d.valor_pago) > 0 && (
      d.credor.toLowerCase().includes('cart') || 
      d.credor.toLowerCase().includes('fatura') ||
      d.observacao.toLowerCase().includes('cart')
    ))
    .reduce((acc, d) => acc + d.meta_amortizacao_mes, 0);

  // No mês de Outubro, se a fatura de Outubro já foi paga, a fatura a vencer no dia 23/10 é R$ 0,00!
  // A fatura aberta para Novembro (23/11) acumula os gastos pós-dia 17
  const isOutubro = (selectedMonth || '2026-10') === '2026-10';
  const totalFaturaAtual = isOutubro 
    ? totalCartaoNov // Saldo acumulado na fatura nova que vence em Novembro
    : totalCartaoNov + passivoDebts;

  const deltaTeto = metrics.teto_diario_atual - metrics.teto_diario_ideal;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
      {/* TILE 1: TETO MÓVEL DIÁRIO */}
      <div className={`p-3.5 relative shadow-lg transition-all ${
        semSaldo 
          ? 'border-2 border-[#ff0055] bg-[#140309]/95 shadow-[#ff0055]/20' 
          : 'border border-[#00ff66]/70 bg-[#030c07]/90 shadow-[#00ff66]/10'
      }`}>
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-black font-extrabold text-[10px] tracking-wider uppercase mb-2 ${
          semSaldo ? 'bg-[#ff0055]' : 'bg-[#00ff66]'
        }`}>
          {semSaldo ? <AlertTriangle className="w-3 h-3 text-black" /> : <Target className="w-3 h-3 text-black" />}
          <span>Teto Móvel Diário</span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <span className={`text-2xl font-black tracking-tight ${
            semSaldo ? 'text-[#ff0055]' : 'text-[#00ff66]'
          }`}>
            {formatCurrency(metrics.teto_diario_atual, isHidden)}
          </span>
          <span className="text-[10px] text-neutral-400">/dia</span>
        </div>

        {semSaldo ? (
          <div className="mt-2.5 space-y-1.5">
            <div className="p-1.5 bg-[#25030b] border border-[#ff0055] text-[#ff0055] text-[10px] font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 animate-pulse text-[#ff0055]" />
              <span className="leading-tight">Sem saldo: gastos vão para o cartão</span>
            </div>
            <div className="text-[10px] text-neutral-400 flex items-center justify-between">
              <span>{metrics.motivo_sem_saldo || 'Dinheiro ainda não entrou'}</span>
              <span className="text-neutral-500">{metrics.dias_restantes}d rest.</span>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-2 border-t border-[#00ff66]/30 text-[11px] flex items-center justify-between">
            <span className="text-neutral-400">
              {metrics.dias_restantes}d restantes
            </span>
            <span className={`font-bold ${deltaTeto >= 0 ? 'text-[#00ff66]' : 'text-[#ff0055]'}`}>
              {isHidden ? '••••' : `${deltaTeto >= 0 ? '+' : ''}${deltaTeto.toFixed(2)} vs meta`}
            </span>
          </div>
        )}
      </div>

      {/* TILE 2: SALDO LIVRE (COM ESTADO GLOBAL DE PRIVACIDADE) */}
      <div className={`p-3.5 relative shadow-lg transition-all ${
        semSaldo 
          ? 'border-2 border-[#ff0055] bg-[#140309]/95 shadow-[#ff0055]/20' 
          : 'border border-[#ffe600]/70 bg-[#0f0e03]/90 shadow-[#ffe600]/10'
      }`}>
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-black font-extrabold text-[10px] tracking-wider uppercase mb-2 ${
          semSaldo ? 'bg-[#ff0055]' : 'bg-[#ffe600]'
        }`}>
          {semSaldo ? <AlertTriangle className="w-3 h-3 text-black" /> : <TrendingDown className="w-3 h-3 text-black" />}
          <span>Saldo Livre (Pix / À Vista)</span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <span className={`text-2xl font-black tracking-tight ${
            semSaldo ? 'text-[#ff0055]' : 'text-[#ffe600]'
          }`}>
            {formatCurrency(metrics.saldo_restante, isHidden)}
          </span>
          <span className={`text-[10px] font-bold ${semSaldo ? 'text-[#ff0055]' : 'text-neutral-400'}`}>
            {semSaldo ? 'SEM ENTRADA' : `de ${formatCurrency(metrics.saldo_disponivel_inicial, isHidden)} livre`}
          </span>
        </div>

        {semSaldo ? (
          <div className="mt-2.5 space-y-1.5">
            <div className="p-1.5 bg-[#25030b] border border-[#ff0055] text-[#ff0055] text-[10px] font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 animate-pulse text-[#ff0055]" />
              <span className="leading-tight">Sem saldo: gastos vão para o cartão</span>
            </div>
            <div className="text-[10px] text-neutral-400 flex items-center justify-between">
              <span className="text-[#ff0055] font-bold">PIX DISPONÍVEL: R$ 0,00</span>
              <span className="text-neutral-500">CONTA ZERADA</span>
            </div>
          </div>
        ) : (
          <>
            {/* Cyberpunk Stepped Progress */}
            <div className="w-full h-1.5 bg-neutral-900 mt-3 border border-[#ffe600]/40 overflow-hidden">
              <div
                className="h-full bg-[#ffe600] transition-all duration-500"
                style={{ width: `${Math.max(0, 100 - metrics.burn_rate_percent)}%` }}
              />
            </div>

            <div className="mt-2 text-[10px] text-neutral-400 flex justify-between">
              <span>PIX USADO: {metrics.burn_rate_percent.toFixed(0)}%</span>
              <span className="text-[#ffe600]">{isHidden ? 'PROTEGIDO' : 'SALÁRIO LIVRE'}</span>
            </div>
          </>
        )}
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

      {/* TILE 4: FATURA DO CARTÃO // CICLOS 17->23 */}
      {(() => {
        const descompasso = metrics.alerta_descompasso;
        const temDescompasso = Boolean(descompasso?.tem_descompasso);
        const isOutubroQuitada = settings.fatura_outubro_paga !== false;

        return (
          <div className={`p-3.5 relative shadow-lg transition-all ${
            temDescompasso
              ? 'border-2 border-[#ff0055] bg-[#140309]/95 shadow-[#ff0055]/25'
              : 'border border-[#00f0ff]/70 bg-[#030e14]/90 shadow-[#00f0ff]/10'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 font-extrabold text-[10px] tracking-wider uppercase ${
                temDescompasso 
                  ? 'bg-[#ff0055] text-white' 
                  : isOutubroQuitada 
                    ? 'bg-[#00ff66] text-black' 
                    : 'bg-[#00f0ff] text-black'
              }`}>
                {temDescompasso ? (
                  <AlertTriangle className="w-3 h-3 text-white" />
                ) : (
                  <CreditCard className="w-3 h-3 text-black" />
                )}
                <span>
                  {temDescompasso 
                    ? 'Fatura (Descompasso de Caixa)' 
                    : isOutubro 
                      ? 'Fatura Nov (Virou dia 17)' 
                      : 'Fatura do Cartão'}
                </span>
              </div>
              <span className={`text-[10px] font-bold ${
                temDescompasso ? 'text-[#ff0055]' : isOutubroQuitada ? 'text-[#00ff66]' : 'text-[#00f0ff]'
              }`}>
                {isOutubro ? 'OUT: PAGA // NOV: 23/11' : 'VIRA: 17 // VENCE: 23'}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-2xl font-black tracking-wider tabular-nums ${
                temDescompasso 
                  ? 'text-[#ff0055]' 
                  : settings.fatura_novembro_paga 
                    ? 'text-[#00ff66]' 
                    : 'text-[#00f0ff]'
              }`}>
                {settings.fatura_novembro_paga ? formatCurrency(0, isHidden) : formatCurrency(totalFaturaAtual, isHidden)}
              </span>
              <span className="text-[10px] text-neutral-300 font-bold">
                {settings.fatura_novembro_paga 
                  ? 'paga c/ rescisão ✓' 
                  : isOutubro 
                    ? '(51 centavos) • vence 23/11' 
                    : 'saldo da fatura'}
              </span>
            </div>

            {temDescompasso && descompasso ? (
              <div className="mt-2.5 space-y-1.5 border-t border-[#ff0055]/40 pt-2">
                <div className="p-1.5 bg-[#25030b] border border-[#ff0055] text-[#ff0055] text-[10px] font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 animate-pulse text-[#ff0055]" />
                  <span className="leading-tight">
                    Fatura &gt; Entradas até Dia {descompasso.dia_vencimento}! Déficit: {formatCurrency(descompasso.deficit_vencimento, isHidden)}
                  </span>
                </div>
                <div className="text-[9px] text-neutral-300 leading-tight">
                  {descompasso.proxima_entrada_nome || 'Dinheiro'} previsto só para {descompasso.proxima_entrada_data ? `Dia ${descompasso.proxima_entrada_data.split('-')[2]}` : 'após vencimento'} 
                  {descompasso.dias_atraso_entrada ? ` (+${descompasso.dias_atraso_entrada}d depois)` : ''}.
                </div>
              </div>
            ) : isOutubro && isOutubroQuitada ? (
              <div className="mt-2.5 space-y-1.5 border-t border-[#00ff66]/30 pt-2">
                <div className="p-1.5 bg-[#031c0e] border border-[#00ff66] text-[#00ff66] text-[10px] font-bold flex items-center justify-between">
                  <span>✓ FATURA OUTUBRO QUITADA</span>
                  <span>R$ 0,00 A VENCER (23/10)</span>
                </div>
                {settings.fatura_novembro_paga ? (
                  <div className="p-1.5 bg-[#031d10] border border-[#00ff66] text-[#00ff66] text-[9.5px] leading-tight space-y-0.5">
                    <div className="flex items-center justify-between font-bold">
                      <span>✓ FATURA 23/11 QUITADA C/ RESCISÃO</span>
                      <span className="text-[#00ff66]">R$ 0,00 A PAGAR</span>
                    </div>
                    <div className="text-neutral-300 text-[9px]">
                      Boleto liquidado com a verba rescisória. Próxima virada: Salário em 05/12.
                    </div>
                  </div>
                ) : (
                  <div className="p-1.5 bg-[#0f071d] border border-[#c084fc]/50 text-[#c084fc] text-[9.5px] leading-tight space-y-0.5">
                    <div className="flex items-center justify-between font-bold">
                      <span>🛡️ COBERTO P/ RESCISÃO</span>
                      <span className="text-[#00ff66]">+24 DIAS DE FOLGA</span>
                    </div>
                    <div className="text-neutral-300 text-[9px]">
                      Rescisão cai dia 30/10 e fatura vence só dia 23/11. Reserva 100% protegida!
                    </div>
                  </div>
                )}
              </div>
            ) : (
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
            )}
          </div>
        );
      })()}
    </div>
  );
};
