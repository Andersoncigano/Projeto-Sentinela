import { 
  SystemSettings, 
  ExpenseRecord, 
  DebtRecord, 
  BurnRateMetrics, 
  ExpenseSimulationImpact 
} from '../types/sentinela';

export class SentinelaBurnEngine {
  /**
   * Calcula as métricas de Teto Móvel Diário (Daily Burn Rate)
   */
  public static calculateMetrics(
    settings: SystemSettings,
    expenses: ExpenseRecord[],
    debts: DebtRecord[],
    refDate: Date = new Date()
  ): BurnRateMetrics {
    const year = refDate.getFullYear();
    const month = refDate.getMonth(); // 0-11
    
    // Total de dias no mês
    const totalDays = new Date(year, month + 1, 0).getDate();
    const currentDay = refDate.getDate();
    const daysRemaining = Math.max(1, totalDays - currentDay + 1);

    // 1. Amortização obrigatória retida compulsória (Cartão Mãe / Passivos)
    const amortizacaoObrigatoria = debts
      .filter(d => (d.valor_total - d.valor_pago) > 0)
      .reduce((acc, curr) => acc + curr.meta_amortizacao_mes, 0);

    // 2. Saldo Discricionário Inicial (Orçamento de Guerra)
    // Renda (850) - Fixos (250) - Dívida (100) - Poupança (50) = R$ 450,00
    const saldoInicial = Math.max(
      0,
      settings.renda_mensal -
        settings.custos_fixos_essenciais -
        amortizacaoObrigatoria -
        settings.meta_poupanca_minima
    );

    // 3. Gastos do mês corrente que consomem o Saldo em Dinheiro / Pix (Escala 1: À Vista)
    // - Compras no Cartão de Crédito vão para a Fatura do Cartão (Passivo com vencimento dia 23)
    // - Compras com 'pix_rescisao' saem da Verba Rescisória (Dia 30)
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthlyExpenses = expenses.filter(e => e.data.startsWith(currentMonthPrefix));

    // Gastos que saem da conta corrente / dinheiro vivo na hora:
    const vistaExpenses = monthlyExpenses.filter(e => 
      e.metodo_pagamento === 'pix' || 
      e.metodo_pagamento === 'dinheiro' || 
      e.metodo_pagamento === 'debito'
    );

    const totalGastoMes = vistaExpenses.reduce((acc, e) => acc + e.valor, 0);
    const totalGastoImpulsivo = monthlyExpenses
      .filter(e => e.is_impulsive)
      .reduce((acc, e) => acc + e.valor, 0);

    const saldoRestante = Math.max(0, saldoInicial - totalGastoMes);

    // 4. Teto Móvel Diário
    const tetoDiarioAtual = daysRemaining > 0 ? saldoRestante / daysRemaining : 0;
    const tetoDiarioIdeal = saldoInicial / totalDays;

    // 5. Nível de Risco Comportamental (Nudge Theory / Alert Levels)
    let statusAlerta: BurnRateMetrics['status_alerta'] = 'NORMAL';
    if (saldoRestante <= 0) {
      statusAlerta = 'COLAPSO';
    } else if (tetoDiarioAtual < tetoDiarioIdeal * 0.4) {
      statusAlerta = 'CRITICO';
    } else if (tetoDiarioAtual < tetoDiarioIdeal * 0.75 || totalGastoImpulsivo > saldoInicial * 0.3) {
      statusAlerta = 'ATENCAO';
    } else {
      statusAlerta = 'NORMAL';
    }

    // 6. Conversão de Trabalho PCD (Horas de Vida Perdidas)
    // R$ 850 / 88h = ~R$ 9.66/hora
    const valorHora = settings.renda_mensal / Math.max(1, settings.horas_trabalho_mes);
    const horasTrabalhadasPerdidas = totalGastoImpulsivo / valorHora;
    const burnRatePercent = saldoInicial > 0 ? (totalGastoMes / saldoInicial) * 100 : 100;

    return {
      dias_totais_mes: totalDays,
      dia_atual: currentDay,
      dias_restantes: daysRemaining,
      renda_mensal: settings.renda_mensal,
      custos_fixos: settings.custos_fixos_essenciais,
      amortizacao_obrigatoria: amortizacaoObrigatoria,
      saldo_disponivel_inicial: saldoInicial,
      total_gasto_mes: totalGastoMes,
      total_gasto_impulsivo: totalGastoImpulsivo,
      saldo_restante: saldoRestante,
      teto_diario_atual: tetoDiarioAtual,
      teto_diario_ideal: tetoDiarioIdeal,
      status_alerta: statusAlerta,
      horas_trabalhadas_perdidas: horasTrabalhadasPerdidas,
      burn_rate_percent: burnRatePercent,
    };
  }

  /**
   * Simula o impacto imediato de uma despesa potencial sobre o teto móvel diário futuro
   */
  public static simulateImpact(
    metrics: BurnRateMetrics,
    valorGasto: number,
    settings: SystemSettings
  ): ExpenseSimulationImpact {
    const novoSaldo = Math.max(0, metrics.saldo_restante - valorGasto);
    const novoTeto = metrics.dias_restantes > 0 ? novoSaldo / metrics.dias_restantes : 0;
    const reducao = Math.max(0, metrics.teto_diario_atual - novoTeto);

    const valorHora = settings.renda_mensal / Math.max(1, settings.horas_trabalho_mes);
    const horasTrabalho = valorGasto / valorHora;
    const diasConsumidos = metrics.teto_diario_atual > 0 ? valorGasto / metrics.teto_diario_atual : 99;

    let impactoRisco: ExpenseSimulationImpact['impacto_risco'] = 'BAIXO';
    if (valorGasto > metrics.saldo_restante || novoSaldo <= 0) {
      impactoRisco = 'CRITICO';
    } else if (valorGasto > metrics.teto_diario_atual * 2 || horasTrabalho >= 4) {
      impactoRisco = 'ALTO';
    } else if (valorGasto > metrics.teto_diario_atual) {
      impactoRisco = 'MEDIO';
    }

    return {
      novo_saldo: novoSaldo,
      novo_teto_diario: novoTeto,
      reducao_teto_diario: reducao,
      horas_trabalho_equivalentes: horasTrabalho,
      dias_de_teto_consumidos: diasConsumidos,
      impacto_risco: impactoRisco,
    };
  }
}
