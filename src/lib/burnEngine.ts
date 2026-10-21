import { 
  SystemSettings, 
  ExpenseRecord, 
  DebtRecord, 
  BurnRateMetrics, 
  ExpenseSimulationImpact,
  InvoiceCashMismatchAlert
} from '../types/sentinela';

export class SentinelaBurnEngine {
  /**
   * Calcula as métricas de Teto Móvel Diário (Daily Burn Rate) e Projeção de Faturas vs Liquidez
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

    // 2. Saldo Discricionário Base do Orçamento (Renda 850 - Fixos 650 = R$ 200,00)
    const saldoBaseSalario = Math.max(
      0,
      settings.renda_mensal -
        settings.custos_fixos_essenciais -
        amortizacaoObrigatoria -
        settings.meta_poupanca_minima
    );

    // 3. Regra de Ouro do SALDO PIX REAL: o saldo livre só deve contar dinheiro que JÁ ENTROU.
    // - Antes do dia 30 (sem rescisão informada) em mês de rescisão prevista (ex: Outubro 2026)
    // - Antes do dia 05 em mês com recebimento salarial ordinário
    // Nesses períodos, o saldo Pix e o teto diário devem ser R$ 0,00, com aviso "Sem saldo: gastos vão para o cartão".
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const diaRecebimento = settings.dia_recebimento || 5;

    const temRescisaoNoMes = Boolean(
      settings.rescisao_prevista &&
      settings.rescisao_prevista.data_prevista.startsWith(currentMonthPrefix)
    );

    const rescisaoInformada = Boolean(
      settings.rescisao_prevista?.status === 'recebido' &&
      (settings.rescisao_prevista?.valor ?? 0) > 0
    );

    let dinheiroJaEntrou = true;
    let motivoSemSaldo = '';
    let saldoInicial = saldoBaseSalario;

    if (temRescisaoNoMes) {
      // Mês de Rescisão (ex: Outubro/2026):
      // Antes do dia 30 (sem rescisão informada), a verba rescisória ainda NÃO ENTROU!
      if (currentDay < 30 && !rescisaoInformada) {
        dinheiroJaEntrou = false;
        motivoSemSaldo = 'Antes do dia 30 (sem rescisão informada)';
        saldoInicial = 0;
      } else if (rescisaoInformada) {
        // Se a rescisão foi informada, o saldo em caixa passa a ser o valor homologado
        saldoInicial = settings.rescisao_prevista?.valor || 0;
      }
    } else {
      // Mês com salário ordinário:
      // Antes do dia 05, o salário ainda NÃO CAIU na conta!
      if (currentDay < diaRecebimento) {
        dinheiroJaEntrou = false;
        motivoSemSaldo = `Antes do dia ${String(diaRecebimento).padStart(2, '0')} (salário ainda não creditado)`;
        saldoInicial = 0;
      }
    }

    // 4. Gastos do mês corrente que consomem o Saldo em Dinheiro / Pix (Escala 1: À Vista)
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

    // Saldo restante e Teto Diário
    let saldoRestante = 0;
    let tetoDiarioAtual = 0;
    const tetoDiarioIdeal = saldoBaseSalario / totalDays;

    if (dinheiroJaEntrou) {
      saldoRestante = Math.max(0, saldoInicial - totalGastoMes);
      tetoDiarioAtual = daysRemaining > 0 ? saldoRestante / daysRemaining : 0;
    } else {
      // SALDO PIX REAL = R$ 0,00 e TETO DIÁRIO = R$ 0,00
      saldoRestante = 0;
      tetoDiarioAtual = 0;
    }

    // 5. Nível de Risco Comportamental (Nudge Theory / Alert Levels)
    let statusAlerta: BurnRateMetrics['status_alerta'] = 'NORMAL';
    if (!dinheiroJaEntrou || saldoRestante <= 0) {
      statusAlerta = 'COLAPSO';
    } else if (tetoDiarioAtual < tetoDiarioIdeal * 0.4) {
      statusAlerta = 'CRITICO';
    } else if (tetoDiarioAtual < tetoDiarioIdeal * 0.75 || totalGastoImpulsivo > saldoInicial * 0.3) {
      statusAlerta = 'ATENCAO';
    } else {
      statusAlerta = 'NORMAL';
    }

    // 6. Conversão de Trabalho PCD (Horas de Vida Perdidas)
    const valorHora = settings.renda_mensal / Math.max(1, settings.horas_trabalho_mes);
    const horasTrabalhadasPerdidas = totalGastoImpulsivo / valorHora;
    const burnRatePercent = saldoInicial > 0 ? (totalGastoMes / saldoInicial) * 100 : 100;

    // 7. Mecanismo de Ciclo de Fatura e Alerta de Descompasso Temporal
    const diaFechamento = settings.dia_fechamento_cartao || 17;
    const diaVencimento = settings.dia_vencimento_cartao || 23;
    const faturaOutubroPaga = settings.fatura_outubro_paga !== false; // Usuário já quitou a fatura de 23/10

    // Separa despesas de cartão com base na virada da fatura (dia 17):
    // - Compras feitas antes do dia 17 pertencem à fatura do próprio mês (ex: 23/10)
    // - Compras feitas a partir do dia 17 pertencem à fatura do mês seguinte (ex: 23/11)
    const allCartaoExpenses = expenses.filter(e => 
      e.metodo_pagamento === 'cartao_credito' || 
      e.metodo_pagamento === 'cartao_proprio' || 
      e.metodo_pagamento === 'cartao_mae'
    );

    // Identificação do ciclo de fatura para cada gasto
    const cartaoWithCycles = allCartaoExpenses.map(e => {
      const [expY, expM, expD] = e.data.split('-').map(Number);
      let targetM = expM;
      let targetY = expY;
      if (expD >= diaFechamento) {
        // Virou a bandeira! Vence no dia 23 do mês seguinte
        targetM = expM === 12 ? 1 : expM + 1;
        targetY = expM === 12 ? expY + 1 : expY;
      }
      const faturaMes = `${targetY}-${String(targetM).padStart(2, '0')}`;
      const dataVencimento = `${targetY}-${String(targetM).padStart(2, '0')}-${String(diaVencimento).padStart(2, '0')}`;
      return {
        ...e,
        fatura_mes: faturaMes,
        fatura_vencimento: dataVencimento,
        is_pos_virada: expD >= diaFechamento,
      };
    });

    // Fatura de Outubro (compras antes de 17/10 que venceriam em 23/10)
    const comprasFaturaOutubro = cartaoWithCycles
      .filter(e => e.fatura_mes === '2026-10')
      .reduce((acc, e) => acc + e.valor, 0);

    // Fatura de Novembro (compras a partir de 17/10 que vencerão em 23/11)
    const comprasFaturaNovembro = cartaoWithCycles
      .filter(e => e.fatura_mes === '2026-11')
      .reduce((acc, e) => acc + e.valor, 0);

    // Passivos de cartão em dívidas registradas
    const passivoCartaoMes = debts
      .filter(d => (d.valor_total - d.valor_pago) > 0 && (
        d.credor.toLowerCase().includes('cart') || 
        d.credor.toLowerCase().includes('fatura') ||
        d.observacao.toLowerCase().includes('cart')
      ))
      .reduce((acc, d) => acc + d.meta_amortizacao_mes, 0);

    // Análise de Vencimento Ativo:
    // Se o usuário já pagou a fatura de Outubro, o valor a vencer no dia 23/10 é R$ 0,00!
    // A próxima fatura a pagar é a de Novembro (vencimento: 23/11/2026).
    const valorPendenteOutubro = faturaOutubroPaga ? 0.0 : comprasFaturaOutubro;
    const isOutubroQuitada = faturaOutubroPaga;

    let targetInvoiceMonth = currentMonthPrefix;
    let totalFaturasAVencer = 0;
    let dataVencimentoStr = '';
    let diasAteVencimento = 0;

    if (currentMonthPrefix === '2026-10') {
      if (valorPendenteOutubro > 0) {
        // Ainda havia fatura de Outubro pendente
        targetInvoiceMonth = '2026-10';
        totalFaturasAVencer = valorPendenteOutubro + passivoCartaoMes;
        dataVencimentoStr = `2026-10-${String(diaVencimento).padStart(2, '0')}`;
        diasAteVencimento = Math.max(0, diaVencimento - currentDay);
      } else {
        // Fatura de Outubro QUITADA! A próxima fatura a vencer é a de Novembro
        targetInvoiceMonth = '2026-11';
        totalFaturasAVencer = comprasFaturaNovembro + passivoCartaoMes;
        dataVencimentoStr = `2026-11-${String(diaVencimento).padStart(2, '0')}`;
        // Dias de 21/10 até 23/11: (31 - 21) + 23 = 33 dias
        const vencDate = new Date(year, 10, diaVencimento); // Nov é mês 10 (0-indexed)
        const diffMs = vencDate.getTime() - refDate.getTime();
        diasAteVencimento = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }
    } else {
      // Outro mês (ex: Novembro)
      targetInvoiceMonth = currentMonthPrefix;
      const comprasMesCiclo = cartaoWithCycles
        .filter(e => e.fatura_mes === currentMonthPrefix)
        .reduce((acc, e) => acc + e.valor, 0);
      totalFaturasAVencer = comprasMesCiclo + passivoCartaoMes;
      dataVencimentoStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(diaVencimento).padStart(2, '0')}`;
      diasAteVencimento = currentDay <= diaVencimento ? diaVencimento - currentDay : Math.max(1, (totalDays - currentDay) + diaVencimento);
    }

    // Dinheiro disponível hoje
    const saldoDisponivelHoje = dinheiroJaEntrou ? saldoRestante : 0;

    // Entradas antes do vencimento da próxima fatura
    let novasEntradasAteVencimento = 0;
    let proximaEntradaData: string | undefined;
    let proximaEntradaNome: string | undefined;
    let diasAtrasoEntrada: number | undefined;
    let diasAntecedenciaEntrada: number | undefined;

    const temValorRescisao = Boolean(
      settings.rescisao_prevista?.status === 'recebido' && 
      (settings.rescisao_prevista?.valor ?? 0) > 0
    );
    const valorRescisaoInformado = temValorRescisao ? (settings.rescisao_prevista?.valor || 0) : 0;
    const dataRescisao = settings.rescisao_prevista?.data_prevista || '2026-10-30';

    if (temRescisaoNoMes) {
      proximaEntradaData = dataRescisao;
      proximaEntradaNome = 'Rescisão Trabalhista (Reserva de Emergência)';

      // Se a fatura avaliada for de Outubro (23/10) e a rescisão só entrar dia 30/10:
      if (targetInvoiceMonth === '2026-10' && valorPendenteOutubro > 0) {
        diasAtrasoEntrada = 30 - diaVencimento; // 7 dias de atraso
      } else if (targetInvoiceMonth === '2026-11') {
        // Para a fatura de Novembro (vence 23/11), a rescisão (30/10) entra 24 DIAS ANTES!
        diasAntecedenciaEntrada = 24; // De 30/10 até 23/11
        if (temValorRescisao) {
          novasEntradasAteVencimento += valorRescisaoInformado;
        }
      }
    } else {
      proximaEntradaData = `${year}-${String(month + 1).padStart(2, '0')}-${String(diaRecebimento).padStart(2, '0')}`;
      proximaEntradaNome = 'Salário Mensal';
      if (currentDay < diaRecebimento && diaRecebimento <= diaVencimento) {
        novasEntradasAteVencimento += saldoBaseSalario;
      }
    }

    const entradasAntesVencimento = saldoDisponivelHoje + novasEntradasAteVencimento;
    // O descompasso só existe se houver dívida a pagar antes do dinheiro entrar!
    // Como a fatura de Outubro está paga (R$ 0,00) e a de Novembro vence após a rescisão de 30/10, NÃO HÁ DESCOMPASSO!
    const temDescompasso = targetInvoiceMonth === '2026-10' && valorPendenteOutubro > 0;
    const deficitVencimento = Math.max(0, totalFaturasAVencer - entradasAntesVencimento);
    const saldoExcedenteLiquido = temValorRescisao ? Math.max(0, valorRescisaoInformado - totalFaturasAVencer) : 0;

    // Total de cartão vinculado à rescisão (todas as compras feitas após virar a bandeira)
    const totalVinculadoRescisao = allCartaoExpenses
      .filter(e => e.vinculado_rescisao !== false)
      .reduce((acc, e) => acc + e.valor, 0);

    // A Reserva de Emergência é a própria Rescisão Trabalhista
    const reservaDisponivel = settings.reserva_emergencia || valorRescisaoInformado || 0;
    const ponteReservaViavel = temValorRescisao ? reservaDisponivel >= totalFaturasAVencer : true;

    let mensagemAlerta = '';
    let recomendacao = '';

    if (temDescompasso) {
      mensagemAlerta = `A soma das faturas a vencer (R$ ${totalFaturasAVencer.toFixed(2)} no Dia ${diaVencimento}) ultrapassa as entradas até o vencimento.`;
      recomendacao = `Ação Imediata: Ajuste a data ou utilize a reserva ponte.`;
    } else {
      // Situação Real: Fluxo Confortável e Coberto pela Rescisão
      if (currentMonthPrefix === '2026-10' && isOutubroQuitada) {
        if (temValorRescisao) {
          mensagemAlerta = `FLUXO TRANQUILO: A fatura de Outubro (23/10) já está QUITADA (R$ 0,00 a pagar). Os novos gastos feitos a partir de 17/10 (Abbey + Ubers = R$ ${comprasFaturaNovembro.toFixed(2)}) foram para a Fatura de Novembro (23/11). Com a rescisão de R$ ${valorRescisaoInformado.toFixed(2)} depositada em 30/10, a fatura está 100% coberta com sobra de R$ ${saldoExcedenteLiquido.toFixed(2)}.`;
          recomendacao = `1. Fatura de Outubro paga; 2. Em 23/11, pague os R$ ${comprasFaturaNovembro.toFixed(2)} com a rescisão já em conta; 3. Sua Reserva de Emergência fica preservada com R$ ${saldoExcedenteLiquido.toFixed(2)}.`;
        } else {
          mensagemAlerta = `FLUXO TRANQUILO: A fatura de Outubro (23/10) já está QUITADA (R$ 0,00 a pagar). Os novos gastos feitos a partir de 17/10 (Abbey + Ubers = R$ ${comprasFaturaNovembro.toFixed(2)}) vencerão somente em 23 de Novembro. A Rescisão Trabalhista (que constituirá sua Reserva de Emergência) entrará na sexta-feira (30/10, 24 dias antes do vencimento), quando você saberá o valor exato.`;
          recomendacao = `1. Fatura de Outubro 100% quitada; 2. Na sexta-feira (30/10), ao descobrir o valor oficial da rescisão, informe no sistema para constituir sua Reserva de Emergência; 3. Em 23/11, quite a fatura de R$ ${comprasFaturaNovembro.toFixed(2)} diretamente com o dinheiro da rescisão já na conta.`;
        }
      } else {
        mensagemAlerta = `Faturas com cobertura financeira adequada pelas entradas previstas.`;
        recomendacao = `Mantenha a disciplina de quitação integral no dia de vencimento.`;
      }
    }

    const alertaDescompasso: InvoiceCashMismatchAlert = {
      tem_descompasso: temDescompasso,
      total_faturas_a_vencer: totalFaturasAVencer,
      data_vencimento: dataVencimentoStr,
      dia_vencimento: diaVencimento,
      fatura_mes_alvo: targetInvoiceMonth,
      fatura_outubro_status: isOutubroQuitada ? 'PAGA_QUITADA' : 'A_VENCER',
      entradas_antes_vencimento: entradasAntesVencimento,
      saldo_disponivel_atual: saldoDisponivelHoje,
      novas_entradas_ate_vencimento: novasEntradasAteVencimento,
      deficit_vencimento: deficitVencimento,
      dias_ate_vencimento: diasAteVencimento,
      proxima_entrada_data: proximaEntradaData,
      proxima_entrada_nome: proximaEntradaNome,
      dias_atraso_entrada: diasAtrasoEntrada,
      dias_antecedencia_entrada: diasAntecedenciaEntrada || 24,
      saldo_excedente_liquido: saldoExcedenteLiquido,
      mensagem_alerta: mensagemAlerta,
      recomendacao: recomendacao,
      total_vinculado_rescisao: totalVinculadoRescisao,
      reserva_emergencia_disponivel: reservaDisponivel,
      ponte_reserva_viavel: ponteReservaViavel,
    };

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
      tem_saldo_real: dinheiroJaEntrou,
      dinheiro_ja_entrou: dinheiroJaEntrou,
      motivo_sem_saldo: motivoSemSaldo,
      aviso_sem_saldo: !dinheiroJaEntrou ? 'Sem saldo: gastos vão para o cartão' : undefined,
      alerta_descompasso: alertaDescompasso,
      total_fatura_vinculada_rescisao: totalVinculadoRescisao,
      fatura_coberta_por_reserva: ponteReservaViavel,
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
