import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  CreditCard, 
  Wallet, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2,
  Filter,
  ArrowLeft,
  Briefcase,
  Layers,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { ExpenseRecord, DebtRecord, SystemSettings, BurnRateMetrics } from '../types/sentinela';
import { formatCurrency } from '../lib/format';
import { sound } from '../lib/sound';

interface MonthlyReportViewProps {
  expenses: ExpenseRecord[];
  settings: SystemSettings;
  debts: DebtRecord[];
  metrics: BurnRateMetrics;
  selectedMonth: string; // YYYY-MM
  onSelectMonth: (month: string) => void;
  availableMonths: string[];
  showValues: boolean;
  onBackToCockpit?: () => void;
}

type ReportScope = 'mes_inteiro' | 'fatura_cartao' | 'vencimento_cartao' | 'rescisao_dia30' | 'data_especifica' | 'intervalo_personalizado';

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  expenses,
  settings,
  debts,
  metrics,
  selectedMonth,
  onSelectMonth,
  availableMonths,
  showValues,
  onBackToCockpit,
}) => {
  const isHidden = !showValues;
  const [reportScope, setReportScope] = useState<ReportScope>('mes_inteiro');
  const [specificDate, setSpecificDate] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    return today.startsWith(selectedMonth) ? today : `${selectedMonth}-18`;
  });
  const [startDate, setStartDate] = useState<string>(`${selectedMonth}-01`);
  const [endDate, setEndDate] = useState<string>(`${selectedMonth}-31`);
  const [copied, setCopied] = useState(false);

  // Sincroniza as datas do relatório automaticamente ao alternar o mês base
  React.useEffect(() => {
    setSpecificDate(`${selectedMonth}-01`);
    setStartDate(`${selectedMonth}-01`);
    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    setEndDate(`${selectedMonth}-${String(lastDay).padStart(2, '0')}`);
  }, [selectedMonth]);

  // Parse Ano e Mês selecionados
  const [yearStr, monthStr] = selectedMonth.split('-');
  const monthNum = parseInt(monthStr, 10);
  const yearNum = parseInt(yearStr, 10);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const currentMonthName = `${monthNames[monthNum - 1]} de ${yearNum}`;

  // Filtragem das despesas com base no escopo escolhido
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (reportScope === 'mes_inteiro') {
        return e.data.startsWith(selectedMonth);
      }
      if (reportScope === 'fatura_cartao') {
        // Fechamento da fatura até o dia 17 do mês selecionado
        const cutoff = `${selectedMonth}-17`;
        return e.data.startsWith(selectedMonth) && e.data <= cutoff;
      }
      if (reportScope === 'vencimento_cartao') {
        // Até o dia 23 (vencimento do cartão)
        const cutoff = `${selectedMonth}-23`;
        return e.data.startsWith(selectedMonth) && e.data <= cutoff;
      }
      if (reportScope === 'rescisao_dia30') {
        // Gastos alocados na rescisão ou a partir do dia 30
        return e.metodo_pagamento === 'pix_rescisao' || (e.data.startsWith(selectedMonth) && e.data >= `${selectedMonth}-30`);
      }
      if (reportScope === 'data_especifica') {
        return e.data === specificDate;
      }
      if (reportScope === 'intervalo_personalizado') {
        return e.data >= startDate && e.data <= endDate;
      }
      return true;
    }).sort((a, b) => a.data.localeCompare(b.data));
  }, [expenses, reportScope, selectedMonth, specificDate, startDate, endDate]);

  // Cálculos consolidados do relatório
  const totalGeral = filteredExpenses.reduce((sum, e) => sum + e.valor, 0);

  // Regra SALDO PIX REAL: Dinheiro que já entrou no caixa
  const [selYearNum, selMonthNum] = selectedMonth.split('-').map(Number);
  const now = new Date();
  const isCurrentMonth = selYearNum === now.getFullYear() && selMonthNum === (now.getMonth() + 1);
  const currentDayReport = isCurrentMonth ? now.getDate() : 31;

  const temRescisaoNoMesReport = Boolean(
    settings.rescisao_prevista &&
    settings.rescisao_prevista.data_prevista.startsWith(selectedMonth)
  );
  const rescisaoInformadaReport = Boolean(
    settings.rescisao_prevista?.status === 'recebido' &&
    (settings.rescisao_prevista?.valor ?? 0) > 0
  );
  const diaRecebimentoReport = settings.dia_recebimento || 5;

  let dinheiroJaEntrouReport = true;
  let motivoSemSaldoReport = '';
  if (temRescisaoNoMesReport) {
    if (currentDayReport < 30 && !rescisaoInformadaReport) {
      dinheiroJaEntrouReport = false;
      motivoSemSaldoReport = 'Antes do dia 30 (sem rescisão informada)';
    }
  } else {
    if (currentDayReport < diaRecebimentoReport) {
      dinheiroJaEntrouReport = false;
      motivoSemSaldoReport = `Antes do dia ${String(diaRecebimentoReport).padStart(2, '0')} (salário ainda não creditado)`;
    }
  }

  // 1. Pix-Salário: despesas pagas com a sobra do salário ordinário (não vinculadas à rescisão)
  const totalPixSalario = filteredExpenses
    .filter((e) => (e.metodo_pagamento === 'pix' || e.metodo_pagamento === 'dinheiro' || e.metodo_pagamento === 'debito') && !e.vinculado_rescisao)
    .reduce((sum, e) => sum + e.valor, 0);

  // 2. Pix-Rescisão-Cartão / Cartão pago com a Rescisão (Fatura 23/11)
  const totalCartaoRescisao = filteredExpenses
    .filter((e) => e.metodo_pagamento === 'cartao_credito' || e.metodo_pagamento === 'cartao_proprio' || e.metodo_pagamento === 'cartao_mae')
    .reduce((sum, e) => sum + e.valor, 0);
  const totalCartao = totalCartaoRescisao; // alias para compatibilidade

  // 3. Pix-Rescisão Direto (saídas via Pix debitadas da rescisão)
  const totalPixRescisao = filteredExpenses
    .filter((e) => e.metodo_pagamento === 'pix_rescisao' || (e.vinculado_rescisao && (e.metodo_pagamento === 'pix' || e.metodo_pagamento === 'dinheiro' || e.metodo_pagamento === 'debito')))
    .reduce((sum, e) => sum + e.valor, 0);

  // Total Comprometido da Rescisão (Cartão 23/11 + Pix Direto)
  const totalRescisaoComprometida = totalCartaoRescisao + totalPixRescisao;

  // Valor da Rescisão Homologada (que constitui a Reserva de Emergência)
  const valorOficialRescisao = rescisaoInformadaReport
    ? (settings.rescisao_prevista?.valor ?? settings.reserva_emergencia)
    : 0;

  const reservaLiquidaRestante = rescisaoInformadaReport
    ? Math.max(0, valorOficialRescisao - totalRescisaoComprometida)
    : null;

  // Comportamental
  const totalEssencial = filteredExpenses
    .filter((e) => !e.is_impulsive)
    .reduce((sum, e) => sum + e.valor, 0);

  const totalImpulsivo = filteredExpenses
    .filter((e) => e.is_impulsive)
    .reduce((sum, e) => sum + e.valor, 0);

  // Sobra do Salário
  const baseLimiteSalario = settings.renda_mensal - settings.custos_fixos_essenciais; // R$ 200,00
  const limiteSalarioLivre = dinheiroJaEntrouReport ? baseLimiteSalario : 0.0;
  const saldoRestanteSalario = dinheiroJaEntrouReport ? Math.max(0, limiteSalarioLivre - totalPixSalario) : 0.0;

  // Custo em horas de trabalho PCD
  const valorHora = settings.renda_mensal / (settings.horas_trabalho_mes || 88);
  const horasPerdidas = totalGeral / (valorHora || 1);

  // Status de Fechamento
  const statusFechamento = useMemo(() => {
    if (totalPixSalario > limiteSalarioLivre) {
      return {
        label: 'TETO DA SOBRA EXCEDIDO',
        color: 'text-[#ff0055]',
        bg: 'bg-[#ff0055]/15 border-[#ff0055]',
        icon: AlertTriangle,
        desc: `Os gastos via Pix ultrapassaram os R$ ${limiteSalarioLivre.toFixed(2)} livres do salário.`
      };
    }
    if (totalPixSalario > limiteSalarioLivre * 0.75) {
      return {
        label: 'ATENÇÃO // QUEIMA ELEVADA',
        color: 'text-[#ffe600]',
        bg: 'bg-[#ffe600]/15 border-[#ffe600]',
        icon: AlertTriangle,
        desc: `Mais de 75% da sobra livre do salário (R$ 200) já foi consumida.`
      };
    }
    return {
      label: 'FECHAMENTO DENTRO DO TETO',
      color: 'text-[#00ff66]',
      bg: 'bg-[#00ff66]/15 border-[#00ff66]',
      icon: CheckCircle2,
      desc: `Gastos à vista rigorosamente controlados dentro da sobra salarial.`
    };
  }, [totalPixSalario, limiteSalarioLivre]);

  // Protocolo único de auditoria
  const auditCode = useMemo(() => {
    const scopeTag = reportScope.slice(0, 3).toUpperCase();
    return `STN-${selectedMonth.replace('-', '')}-${scopeTag}-${Math.abs(Math.floor(totalGeral * 137 % 9999)).toString().padStart(4, '0')}`;
  }, [selectedMonth, reportScope, totalGeral]);

  const reportDateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Copiar resumo formatado para a área de transferência
  const handleCopyTextReport = () => {
    sound.playTick();
    const text = `
╔══════════════════════════════════════════════════════════════════╗
   RELATÓRIO DE FECHAMENTO FINANCEIRO :: SISTEMA SENTINELA
   Protocolo: ${auditCode} | Emissão: ${reportDateStr}
   Período: ${getScopeLabel()} (${selectedMonth})
╚══════════════════════════════════════════════════════════════════╝

1. BALANÇO DA RENDA & OBRIGAÇÕES
   • Renda Mensal (PCD): R$ ${settings.renda_mensal.toFixed(2)}
   • Custos Fixos Essenciais: - R$ ${settings.custos_fixos_essenciais.toFixed(2)} (Luz, Farmácia, Internet, Banco)
   • Margem Livre do Salário (Pix Real): R$ ${limiteSalarioLivre.toFixed(2)}

2. EXECUÇÃO SEPARADA DAS 3 CATEGORIAS:
   • 🟢 1. PIX-SALÁRIO: R$ ${totalPixSalario.toFixed(2)}
     └─ Origem: Sobra do Salário Ordinário (R$ 200,00)
     └─ Saldo Restante da Margem: R$ ${saldoRestanteSalario.toFixed(2)}

   • 🔵 2. PIX-RESCISÃO-CARTÃO (CARTÃO PAGO C/ RESCISÃO): R$ ${totalCartaoRescisao.toFixed(2)}
     └─ Origem: Compras no Cartão a partir de 17/10 até sexta 30/10
     └─ Fatura: Vencimento em 23/11 (${settings.fatura_novembro_paga ? 'QUITADA COM A RESCISÃO' : 'Quitação integral com a Rescisão'})
     └─ Status Outubro: Fatura de 23/10 já quitada (R$ 0,00 pendente)
     └─ Transição do Sistema: Etapa 1 (23/11 - Quitação Cartão) | Etapa 2 (05/12 - Novo Salário)

   • 🟣 3. PIX-RESCISÃO (DIRETO): R$ ${totalPixRescisao.toFixed(2)}
     └─ Origem: Saídas diretas via Pix abatidas da verba rescisória

3. CONSOLIDAÇÃO DA RESCISÃO & RESERVA DE EMERGÊNCIA:
   • Total Comprometido da Rescisão (Cartão 23/11 + Pix Direto): R$ ${totalRescisaoComprometida.toFixed(2)}
   • Valor Oficial da Rescisão (Sexta 30/10): ${rescisaoInformadaReport ? `R$ ${valorOficialRescisao.toFixed(2)}` : 'A DEFINIR NA SEXTA (30/10)'}
   • Reserva de Emergência Líquida Restante: ${rescisaoInformadaReport ? `R$ ${(reservaLiquidaRestante ?? 0).toFixed(2)}` : `A CALCULAR NA SEXTA 30/10 (- R$ ${totalRescisaoComprometida.toFixed(2)} já comprometidos)`}

4. QUALIDADE DOS GASTOS
   • Gastos Essenciais: R$ ${totalEssencial.toFixed(2)} (${totalGeral > 0 ? ((totalEssencial / totalGeral) * 100).toFixed(1) : 0}%)
   • Gastos Impulsivos: R$ ${totalImpulsivo.toFixed(2)} (${totalGeral > 0 ? ((totalImpulsivo / totalGeral) * 100).toFixed(1) : 0}%)
   • Custo em Trabalho PCD: ~${horasPerdidas.toFixed(1)} horas
   • Total de Lançamentos: ${filteredExpenses.length} itens
   • TOTAL GERAL DO PERÍODO: R$ ${totalGeral.toFixed(2)}

5. SITUAÇÃO DO FECHAMENTO: [ ${statusFechamento.label} ]
   ${statusFechamento.desc}

6. LANÇAMENTOS AUDITADOS:
${filteredExpenses.map(e => `   • ${e.data} | R$ ${e.valor.toFixed(2).padStart(6, ' ')} | ${e.metodo_pagamento.toUpperCase()} | ${e.descricao} [${e.is_impulsive ? 'IMPULSIVO' : 'ESSENCIAL'}]`).join('\n')}
═══════════════════════════════════════════════════════════════════
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Exportar em CSV
  const handleExportCSV = () => {
    sound.playTick();
    const headers = ['Data', 'Descricao', 'Valor', 'Metodo_Pagamento', 'Categoria', 'Natureza'];
    const rows = filteredExpenses.map(e => [
      e.data,
      `"${e.descricao.replace(/"/g, '""')}"`,
      e.valor.toFixed(2),
      e.metodo_pagamento,
      e.categoria,
      e.is_impulsive ? 'IMPULSIVO' : 'ESSENCIAL'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_fechamento_${selectedMonth}_${reportScope}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Imprimir / Salvar em PDF
  const handlePrint = () => {
    sound.playTick();
    window.print();
  };

  function getScopeLabel() {
    switch (reportScope) {
      case 'mes_inteiro':
        return `Mês Completo (${currentMonthName})`;
      case 'fatura_cartao':
        return `Fechamento da Fatura do Cartão (Até dia 17/${monthStr})`;
      case 'vencimento_cartao':
        return `Ciclo de Vencimento do Cartão (Até dia 23/${monthStr})`;
      case 'rescisao_dia30':
        return `Verba de Rescisão (Prevista para 30/${monthStr})`;
      case 'data_especifica':
        return `Data Específica (${specificDate})`;
      case 'intervalo_personalizado':
        return `Intervalo Personalizado (${startDate} até ${endDate})`;
      default:
        return currentMonthName;
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de Ações Superiores & Navegação (Oculto na impressão) */}
      <div className="print:hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-[#050b14] border-2 border-[#00f0ff]/50">
        <div>
          <div className="flex items-center gap-2">
            {onBackToCockpit && (
              <button
                type="button"
                onClick={onBackToCockpit}
                className="p-1.5 bg-black hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer mr-1"
                title="Voltar ao Cockpit Operacional"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <FileText className="w-5 h-5 text-[#00f0ff]" />
            <h1 className="text-base font-black text-white uppercase tracking-wider">
              CENTRAL DE FECHAMENTO & RELATÓRIOS // SISTEMA SENTINELA
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Gere relatórios de fechamento mensal, data de corte da fatura (dia 17), vencimento (dia 23), rescisão ou período personalizado.
          </p>
        </div>

        {/* Botões de Ação: Imprimir/PDF, Copiar Resumo, Baixar CSV */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-[#00f0ff] hover:bg-[#33f3ff] text-black font-extrabold text-xs uppercase flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title="Imprimir ou Salvar em PDF (Ctrl+P)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>IMPRIMIR / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleCopyTextReport}
            className="px-3 py-1.5 bg-black hover:bg-neutral-900 border border-[#00ff66]/70 text-[#00ff66] font-bold text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer"
            title="Copiar relatório formatado para WhatsApp ou Bloco de Notas"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00ff66]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIADO!' : 'COPIAR TEXTO'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-black hover:bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white font-bold text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer"
            title="Exportar dados das transações em formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#ffe600]" />
            <span>EXPORTAR CSV</span>
          </button>
        </div>
      </div>

      {/* Seletor de Período & Filtros de Escopo (Oculto na impressão) */}
      <div className="print:hidden bg-[#070b12] border border-[#141b2e] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#141b2e] pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#ffe600]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              1. SELECIONE O MÊS BASE & O CORTE DE AUDITORIA:
            </span>
          </div>

          {/* Seletor de Mês Ativo */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400">Mês Base:</span>
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="bg-black border border-[#00f0ff] text-white text-xs px-2.5 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
            >
              {availableMonths.map((m) => {
                const [y, mon] = m.split('-');
                const name = monthNames[parseInt(mon, 10) - 1];
                return (
                  <option key={m} value={m}>
                    {name} / {y}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Botões de Escopo / Tipo de Relatório */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playTick();
              setReportScope('mes_inteiro');
            }}
            className={`p-2 text-left border transition-all cursor-pointer ${
              reportScope === 'mes_inteiro'
                ? 'bg-[#00f0ff]/15 border-[#00f0ff] text-white font-black'
                : 'bg-black/60 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <div className="text-[10px] text-neutral-400 uppercase font-mono">GERAL</div>
            <div className="text-xs font-bold mt-0.5">🗓️ Mês Inteiro</div>
            <div className="text-[9px] text-neutral-400 mt-1">Fechamento 01 a 31</div>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTick();
              setReportScope('fatura_cartao');
            }}
            className={`p-2 text-left border transition-all cursor-pointer ${
              reportScope === 'fatura_cartao'
                ? 'bg-[#ffe600]/15 border-[#ffe600] text-[#ffe600] font-black'
                : 'bg-black/60 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <div className="text-[10px] text-neutral-400 uppercase font-mono">CARTÃO // DIA 17</div>
            <div className="text-xs font-bold mt-0.5">💳 Corte da Fatura</div>
            <div className="text-[9px] text-neutral-400 mt-1">Até virada do dia 17</div>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTick();
              setReportScope('vencimento_cartao');
            }}
            className={`p-2 text-left border transition-all cursor-pointer ${
              reportScope === 'vencimento_cartao'
                ? 'bg-[#00f0ff]/15 border-[#00f0ff] text-[#00f0ff] font-black'
                : 'bg-black/60 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <div className="text-[10px] text-neutral-400 uppercase font-mono">CARTÃO // DIA 23</div>
            <div className="text-xs font-bold mt-0.5">💳 Venc. Fatura</div>
            <div className="text-[9px] text-neutral-400 mt-1">Até quitação dia 23</div>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTick();
              setReportScope('rescisao_dia30');
            }}
            className={`p-2 text-left border transition-all cursor-pointer ${
              reportScope === 'rescisao_dia30'
                ? 'bg-[#bd00ff]/15 border-[#bd00ff] text-[#bd00ff] font-black'
                : 'bg-black/60 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <div className="text-[10px] text-neutral-400 uppercase font-mono">RESCISÃO // DIA 30</div>
            <div className="text-xs font-bold mt-0.5">💼 Verba Rescisão</div>
            <div className="text-[9px] text-neutral-400 mt-1">Pix Rescisão & Dia 30</div>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTick();
              setReportScope('data_especifica');
            }}
            className={`p-2 text-left border transition-all cursor-pointer ${
              reportScope === 'data_especifica'
                ? 'bg-[#00ff66]/15 border-[#00ff66] text-[#00ff66] font-black'
                : 'bg-black/60 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <div className="text-[10px] text-neutral-400 uppercase font-mono">ESPECÍFICO</div>
            <div className="text-xs font-bold mt-0.5">🎯 Data Específica</div>
            <div className="text-[9px] text-neutral-400 mt-1">1 dia isolado</div>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTick();
              setReportScope('intervalo_personalizado');
            }}
            className={`p-2 text-left border transition-all cursor-pointer ${
              reportScope === 'intervalo_personalizado'
                ? 'bg-[#ff0055]/15 border-[#ff0055] text-[#ff0055] font-black'
                : 'bg-black/60 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <div className="text-[10px] text-neutral-400 uppercase font-mono">INTERVALO</div>
            <div className="text-xs font-bold mt-0.5">📆 De / Até</div>
            <div className="text-[9px] text-neutral-400 mt-1">Intervalo customizado</div>
          </button>
        </div>

        {/* Inputs condicionais quando o usuário escolhe Data Específica ou Intervalo */}
        {reportScope === 'data_especifica' && (
          <div className="pt-2 border-t border-[#141b2e] flex items-center gap-3 animate-in fade-in">
            <span className="text-xs text-neutral-300">Escolha o dia a auditar:</span>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="bg-black border border-[#00ff66] text-[#00ff66] px-2.5 py-1 text-xs font-bold focus:outline-none"
            />
          </div>
        )}

        {reportScope === 'intervalo_personalizado' && (
          <div className="pt-2 border-t border-[#141b2e] flex items-center gap-3 flex-wrap animate-in fade-in">
            <span className="text-xs text-neutral-300">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-black border border-[#ff0055] text-white px-2.5 py-1 text-xs font-bold focus:outline-none"
            />
            <span className="text-xs text-neutral-300">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-black border border-[#ff0055] text-white px-2.5 py-1 text-xs font-bold focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* =========================================================================
          ÁREA DO RELATÓRIO IMPRESSO / VISUALIZADO
          Contém a estrutura limpa para tela e perfeita para impressão A4 / PDF
          ========================================================================= */}
      <div className="bg-[#040810] border-2 border-[#14233c] p-6 lg:p-8 space-y-6 shadow-2xl print:bg-white print:text-black print:border-black print:p-0 print:shadow-none">
        
        {/* CABEÇALHO DO LAUDO / CERTIFICADO DE FECHAMENTO */}
        <div className="border-b-2 border-[#00f0ff]/50 pb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:border-black">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#00f0ff] text-black font-black text-[10px] uppercase tracking-wider print:border print:border-black">
                AUDITORIA CONTÁBIL
              </span>
              <span className="text-xs font-mono text-neutral-400 print:text-black">
                PROTOCOLO: {auditCode}
              </span>
            </div>
            <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight mt-1 print:text-black">
              RELATÓRIO DE FECHAMENTO FINANCEIRO
            </h2>
            <div className="text-xs text-neutral-400 mt-0.5 print:text-neutral-700">
              Escopo: <strong className="text-white print:text-black">{getScopeLabel()}</strong> • Emitido em {reportDateStr}
            </div>
          </div>

          {/* Status Badge */}
          <div className={`px-4 py-2.5 border ${statusFechamento.bg} text-right print:border-black print:bg-neutral-100`}>
            <div className="text-[10px] uppercase font-bold text-neutral-400 print:text-black">PARECER DE AUDITORIA:</div>
            <div className={`text-sm font-black ${statusFechamento.color} uppercase tracking-wider print:text-black flex items-center justify-end gap-1.5`}>
              <statusFechamento.icon className="w-4 h-4 inline" />
              <span>{statusFechamento.label}</span>
            </div>
            <div className="text-[10px] text-neutral-300 mt-0.5 print:text-neutral-800">
              {statusFechamento.desc}
            </div>
          </div>
        </div>

        {/* SEÇÃO 1: ESTRUTURA DE RENDA E OBRIGAÇÕES FIXAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 bg-black/60 border border-neutral-800 print:bg-neutral-50 print:border-neutral-400">
            <div className="text-[10px] text-neutral-400 uppercase font-mono">1. RENDA ORDINÁRIA (PCD)</div>
            <div className="text-lg font-black text-white mt-1 print:text-black">
              {formatCurrency(settings.renda_mensal, isHidden)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 print:text-neutral-600">
              Meio período (~88h/mês). Recebimento dia 05.
            </div>
          </div>

          <div className="p-3.5 bg-black/60 border border-neutral-800 print:bg-neutral-50 print:border-neutral-400">
            <div className="text-[10px] text-[#ffe600] uppercase font-mono">2. CUSTOS FIXOS ESSENCIAIS</div>
            <div className="text-lg font-black text-[#ffe600] mt-1 print:text-black">
              - {formatCurrency(settings.custos_fixos_essenciais, isHidden)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 print:text-neutral-600">
              Luz, Remédio/Farmácia, Internet e Banco (~R$ 650).
            </div>
          </div>

          <div className={`p-3.5 ${
            !dinheiroJaEntrouReport 
              ? 'bg-[#1e030a] border-2 border-[#ff0055]' 
              : 'bg-[#03150b] border border-[#00ff66]/50'
          } print:bg-neutral-100 print:border-black`}>
            <div className={`text-[10px] ${!dinheiroJaEntrouReport ? 'text-[#ff0055]' : 'text-[#00ff66]'} uppercase font-mono font-bold print:text-black`}>
              3. MARGEM LIVRE DO SALÁRIO (PIX REAL)
            </div>
            <div className={`text-xl font-black ${!dinheiroJaEntrouReport ? 'text-[#ff0055]' : 'text-[#00ff66]'} mt-1 print:text-black`}>
              {formatCurrency(limiteSalarioLivre, isHidden)}
            </div>
            <div className="text-[11px] text-neutral-300 mt-1 print:text-neutral-700">
              {!dinheiroJaEntrouReport ? (
                <span className="text-[#ff0055] font-bold block">
                  Sem saldo: gastos vão para o cartão ({motivoSemSaldoReport}).
                </span>
              ) : (
                'Teto disponível para gastos à vista/Pix no mês.'
              )}
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: RECONCILIAÇÃO SEPARADA DAS 3 CATEGORIAS & RESCISÃO */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 print:border-black">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300 print:text-black">
              <Layers className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>RECONCILIAÇÃO DAS 3 CATEGORIAS DE GASTOS (REGIME ATÉ SEXTA 30/10)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 uppercase hidden sm:inline">
              Fatura Out/23 Quitada ✓ | Fatura Nov/23 c/ Rescisão
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. PIX-SALÁRIO */}
            <div className={`p-4 ${
              !dinheiroJaEntrouReport 
                ? 'bg-[#140309] border-2 border-[#ff0055]' 
                : 'bg-[#031008] border-2 border-[#00ff66]'
            } space-y-2.5 print:bg-neutral-50 print:border-black shadow-md`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-black ${!dinheiroJaEntrouReport ? 'text-[#ff0055]' : 'text-[#00ff66]'} uppercase tracking-wide print:text-black flex items-center gap-1.5`}>
                  <span>🟢 1. PIX-SALÁRIO</span>
                </span>
                <Wallet className={`w-4 h-4 ${!dinheiroJaEntrouReport ? 'text-[#ff0055]' : 'text-[#00ff66]'} print:text-black`} />
              </div>
              <div className="text-2xl font-black text-white mt-1 print:text-black">
                {formatCurrency(totalPixSalario, isHidden)}
              </div>
              <div className="text-xs text-neutral-300 print:text-neutral-700 leading-snug">
                {!dinheiroJaEntrouReport ? (
                  <span className="text-[#ff0055] font-bold block">
                    Sem saldo: compras redirecionadas ao cartão
                  </span>
                ) : (
                  <span>Gasto regular que consome a sobra dos <strong>R$ 200,00</strong> do salário ordinário.</span>
                )}
              </div>
              <div className="pt-2 border-t border-neutral-800 print:border-neutral-300 flex items-center justify-between text-xs">
                <span className="text-neutral-400 print:text-black font-medium">Margem Restante:</span>
                <span className={`font-black ${!dinheiroJaEntrouReport ? 'text-[#ff0055]' : saldoRestanteSalario >= 0 ? 'text-[#00ff66]' : 'text-[#ff0055]'} print:text-black`}>
                  {formatCurrency(saldoRestanteSalario, isHidden)}
                </span>
              </div>
            </div>

            {/* 2. PIX-RESCISÃO-CARTÃO (CARTÃO PAGO C/ RESCISÃO) */}
            <div className="p-4 bg-[#031522] border-2 border-[#00f0ff] space-y-2.5 print:bg-neutral-50 print:border-black shadow-md shadow-[#00f0ff]/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#00f0ff] uppercase tracking-wide print:text-black flex items-center gap-1.5">
                  <span>🔵 2. PIX-RESCISÃO-CARTÃO</span>
                </span>
                <CreditCard className="w-4 h-4 text-[#00f0ff] print:text-black" />
              </div>
              <div className="text-2xl font-black text-[#00f0ff] mt-1 print:text-black">
                {formatCurrency(totalCartaoRescisao, isHidden)}
              </div>
              <div className="text-xs text-neutral-300 print:text-neutral-700 leading-snug">
                Compras feitas entre <strong>17/10 e 30/10</strong> na fatura com vencimento em <strong>23/11</strong>. Quitação com a rescisão.
              </div>
              <div className="pt-2 border-t border-neutral-800 print:border-neutral-300 flex items-center justify-between text-xs">
                <span className="text-neutral-400 print:text-black font-medium">Status Fatura:</span>
                <span className={`font-bold ${settings.fatura_novembro_paga ? 'text-[#00ff66]' : 'text-[#00f0ff]'} print:text-black`}>
                  {settings.fatura_novembro_paga ? '✓ QUITADA C/ RESCISÃO' : '23/11/2026 (A Vencer)'}
                </span>
              </div>
            </div>

            {/* 3. PIX-RESCISÃO (DIRETO) */}
            <div className="p-4 bg-[#0d0413] border-2 border-[#c084fc] space-y-2.5 print:bg-neutral-50 print:border-black shadow-md shadow-[#c084fc]/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#c084fc] uppercase tracking-wide print:text-black flex items-center gap-1.5">
                  <span>🟣 3. PIX-RESCISÃO (DIRETO)</span>
                </span>
                <Briefcase className="w-4 h-4 text-[#c084fc] print:text-black" />
              </div>
              <div className="text-2xl font-black text-[#c084fc] mt-1 print:text-black">
                {formatCurrency(totalPixRescisao, isHidden)}
              </div>
              <div className="text-xs text-neutral-300 print:text-neutral-700 leading-snug">
                Saídas diretas via Pix debitadas diretamente do montante rescisório previsto para sexta-feira (30/10).
              </div>
              <div className="pt-2 border-t border-neutral-800 print:border-neutral-300 flex items-center justify-between text-xs">
                <span className="text-neutral-400 print:text-black font-medium">Data Liberação:</span>
                <span className="font-bold text-white print:text-black">Sexta-feira (30/10)</span>
              </div>
            </div>
          </div>

          {/* PAINEL DE CONSOLIDAÇÃO: RESCISÃO & RESERVA DE EMERGÊNCIA */}
          <div className="p-4 bg-[#050b14] border-2 border-[#ffe600] print:bg-neutral-100 print:border-black">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#ffe600] print:text-black" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#ffe600] print:text-black">
                    CONSOLIDAÇÃO: COMPROMETIMENTO DA RESCISÃO & RESERVA DE EMERGÊNCIA
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 max-w-2xl print:text-neutral-700">
                  A rescisão homologada é a sua <strong>Reserva de Emergência</strong>. Todas as compras no cartão até sexta 30/10 + Pix direto saem dessa verba.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
                <div className="p-2.5 bg-black/70 border border-neutral-800 print:bg-white text-center">
                  <div className="text-[9px] uppercase font-mono text-neutral-400">Total Comprometido</div>
                  <div className="text-sm font-black text-[#ffe600] mt-0.5 print:text-black">
                    {formatCurrency(totalRescisaoComprometida, isHidden)}
                  </div>
                  <div className="text-[9px] text-neutral-400 mt-0.5">Cartão + Pix Rescisão</div>
                </div>

                <div className="p-2.5 bg-black/70 border border-neutral-800 print:bg-white text-center">
                  <div className="text-[9px] uppercase font-mono text-neutral-400">Rescisão Oficial (30/10)</div>
                  <div className="text-sm font-black text-white mt-0.5 print:text-black">
                    {rescisaoInformadaReport ? formatCurrency(valorOficialRescisao, isHidden) : 'A DEFINIR SEXTA'}
                  </div>
                  <div className="text-[9px] text-[#00f0ff] mt-0.5">
                    {rescisaoInformadaReport ? '✓ Homologado' : 'Aguardando 30/10'}
                  </div>
                </div>

                <div className="p-2.5 bg-black/70 border border-neutral-800 print:bg-white text-center">
                  <div className="text-[9px] uppercase font-mono text-neutral-400">Reserva Líquida Restante</div>
                  <div className={`text-sm font-black ${rescisaoInformadaReport ? 'text-[#00ff66]' : 'text-[#00f0ff]'} mt-0.5 print:text-black`}>
                    {rescisaoInformadaReport 
                      ? formatCurrency(reservaLiquidaRestante ?? 0, isHidden)
                      : `A CALCULAR (-${formatCurrency(totalRescisaoComprometida, isHidden)})`
                    }
                  </div>
                  <div className="text-[9px] text-neutral-400 mt-0.5">Saldo pós-quitação</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 3: QUALIDADE DOS GASTOS & AUDITORIA COMPORTAMENTAL */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-black/40 border border-neutral-800 print:bg-neutral-50 print:border-neutral-400">
            <span className="text-[10px] text-neutral-400 uppercase font-mono">Gastos Essenciais</span>
            <div className="text-base font-bold text-[#00ff66] mt-0.5 print:text-black">
              {formatCurrency(totalEssencial, isHidden)}
            </div>
            <span className="text-[10px] text-neutral-400">
              {totalGeral > 0 ? `${((totalEssencial / totalGeral) * 100).toFixed(0)}% do total` : '0%'}
            </span>
          </div>

          <div className="p-3 bg-black/40 border border-neutral-800 print:bg-neutral-50 print:border-neutral-400">
            <span className="text-[10px] text-neutral-400 uppercase font-mono">Gastos Impulsivos</span>
            <div className="text-base font-bold text-[#ff0055] mt-0.5 print:text-black">
              {formatCurrency(totalImpulsivo, isHidden)}
            </div>
            <span className="text-[10px] text-neutral-400">
              {totalGeral > 0 ? `${((totalImpulsivo / totalGeral) * 100).toFixed(0)}% do total` : '0%'}
            </span>
          </div>

          <div className="p-3 bg-black/40 border border-neutral-800 print:bg-neutral-50 print:border-neutral-400">
            <span className="text-[10px] text-neutral-400 uppercase font-mono">Custo em Trabalho</span>
            <div className="text-base font-bold text-white mt-0.5 print:text-black">
              ~{horasPerdidas.toFixed(1)} Horas
            </div>
            <span className="text-[10px] text-neutral-400">
              R$ {valorHora.toFixed(2)}/hora líquida
            </span>
          </div>

          <div className="p-3 bg-black/40 border border-neutral-800 print:bg-neutral-50 print:border-neutral-400">
            <span className="text-[10px] text-neutral-400 uppercase font-mono">Cofre de Emergência</span>
            <div className="text-base font-bold text-[#00f0ff] mt-0.5 print:text-black">
              {formatCurrency(settings.reserva_emergencia, isHidden)}
            </div>
            <span className="text-[10px] text-[#00ff66] font-bold">
              100% Blindado
            </span>
          </div>
        </div>

        {/* SEÇÃO 4: DEMONSTRATIVO DETALHADO DOS LANÇAMENTOS DO PERÍODO */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 print:border-black">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider print:text-black">
                ITENS AUDITADOS NO PERÍODO ({filteredExpenses.length} LANÇAMENTOS)
              </span>
            </div>
            <span className="text-xs font-black text-[#00f0ff] print:text-black">
              TOTAL AUDITADO: {formatCurrency(totalGeral, isHidden)}
            </span>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 print:border-black print:text-neutral-700">
              Nenhuma despesa registrada para o filtro ou período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-900/80 text-neutral-300 print:bg-neutral-200 print:text-black print:border-black">
                    <th className="py-2 px-3 font-bold uppercase">Data</th>
                    <th className="py-2 px-3 font-bold uppercase">Descrição / Local</th>
                    <th className="py-2 px-3 font-bold uppercase">Método de Pagamento</th>
                    <th className="py-2 px-3 font-bold uppercase">Classificação</th>
                    <th className="py-2 px-3 font-bold uppercase text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 print:divide-neutral-300">
                  {filteredExpenses.map((e) => {
                    const isCartao = e.metodo_pagamento === 'cartao_credito' || 
                                     e.metodo_pagamento === 'cartao_proprio' || 
                                     e.metodo_pagamento === 'cartao_mae';
                    const isPixRescisao = e.metodo_pagamento === 'pix_rescisao';

                    return (
                      <tr 
                        key={e.id}
                        className="hover:bg-neutral-900/50 print:hover:bg-transparent"
                      >
                        <td className="py-2 px-3 font-mono text-neutral-300 print:text-black whitespace-nowrap">
                          {e.data}
                        </td>
                        <td className="py-2 px-3 font-bold text-white print:text-black">
                          {e.descricao}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {isPixRescisao ? (
                            <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-[#bd00ff]/20 text-[#c084fc] border border-[#bd00ff]/60 print:border-black print:text-black">
                              🟣 PIX-RESCISÃO
                            </span>
                          ) : isCartao ? (
                            <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/60 print:border-black print:text-black">
                              🔵 PIX-RESCISÃO-CARTÃO (23/11)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/60 print:border-black print:text-black">
                              🟢 PIX-SALÁRIO
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {e.is_impulsive ? (
                            <span className="text-[10px] text-[#ff0055] font-bold uppercase">
                              Impulsivo / Lazer
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#00ff66] font-bold uppercase">
                              Essencial
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-black text-right text-white print:text-black whitespace-nowrap">
                          {formatCurrency(e.valor, isHidden)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#00f0ff] font-bold bg-[#02131d] text-white print:bg-neutral-100 print:text-black print:border-black">
                    <td colSpan={4} className="py-2.5 px-3 uppercase tracking-wider text-right">
                      TOTAL CONSOLIDADO DO RELATÓRIO:
                    </td>
                    <td className="py-2.5 px-3 text-right font-black font-mono text-sm text-[#00f0ff] print:text-black">
                      {formatCurrency(totalGeral, isHidden)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* RODAPÉ DO LAUDO COM AUTENTICAÇÃO */}
        <div className="border-t border-neutral-800 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-neutral-500 print:text-black print:border-black">
          <div>
            <span>SISTEMA SENTINELA DE AUDITORIA CONTÁBIL & DEFESA FINANCEIRA</span>
            <span className="mx-2">•</span>
            <span>AUTENTICAÇÃO: SHA256({auditCode})</span>
          </div>
          <div>
            <span>USUÁRIO: PCD MEIO PERÍODO</span>
            <span className="mx-2">•</span>
            <span>SALÁRIO DIA 05 • FATURA DIA 23 • RESCISÃO DIA 30</span>
          </div>
        </div>

      </div>
    </div>
  );
};
