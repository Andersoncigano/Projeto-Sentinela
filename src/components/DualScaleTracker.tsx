import React, { useState } from 'react';
import { 
  Zap, 
  CreditCard, 
  Calendar, 
  FileText, 
  Briefcase, 
  ArrowRight, 
  Sparkles, 
  Check, 
  Info,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { ExpenseRecord, SystemSettings } from '../types/sentinela';
import { formatCurrency } from '../lib/format';
import { sound } from '../lib/sound';

interface DualScaleTrackerProps {
  selectedMonth: string; // YYYY-MM
  expenses: ExpenseRecord[];
  settings: SystemSettings;
  showValues: boolean;
  onOpenNoteImporter: () => void;
  onUpdateRescisao: (valor: number) => void;
}

export const DualScaleTracker: React.FC<DualScaleTrackerProps> = ({
  selectedMonth,
  expenses,
  settings,
  showValues,
  onOpenNoteImporter,
  onUpdateRescisao,
}) => {
  const [editingRescisao, setEditingRescisao] = useState(false);
  const [rescisaoInput, setRescisaoInput] = useState('');

  const isHidden = !showValues;

  // Filtrar despesas apenas do mês selecionado
  const monthExpenses = expenses.filter(e => e.data.startsWith(selectedMonth));

  // Escala 1: À Vista (Pix, Dinheiro, Débito)
  const vistaExpenses = monthExpenses.filter(e => 
    e.metodo_pagamento === 'pix' || 
    e.metodo_pagamento === 'dinheiro' || 
    e.metodo_pagamento === 'debito'
  );
  const totalVista = vistaExpenses.reduce((acc, e) => acc + e.valor, 0);

  // Escala 2: Cartão de Crédito
  const cartaoExpenses = monthExpenses.filter(e => 
    e.metodo_pagamento === 'cartao_credito' || 
    e.metodo_pagamento === 'cartao_proprio' || 
    e.metodo_pagamento === 'cartao_mae'
  );
  const totalCartao = cartaoExpenses.reduce((acc, e) => acc + e.valor, 0);

  // Gastos no cartão expressamente vinculados à rescisão pelo usuário
  const cartaoVinculadoRescisao = cartaoExpenses.filter(e => e.vinculado_rescisao !== false);
  const totalCartaoVinculadoRescisao = cartaoVinculadoRescisao.reduce((acc, e) => acc + e.valor, 0);

  // Escala 3: Verba Rescisória (Pix Rescisão direto + Faturas no Cartão vinculadas à Rescisão)
  const rescisaoExpenses = monthExpenses.filter(e => e.metodo_pagamento === 'pix_rescisao');
  const totalRescisaoGastoDireto = rescisaoExpenses.reduce((acc, e) => acc + e.valor, 0);
  const totalComprometidoRescisao = totalRescisaoGastoDireto + totalCartaoVinculadoRescisao;

  const temRescisaoDefinida = Boolean(
    settings.rescisao_prevista?.status === 'recebido' &&
    (settings.rescisao_prevista?.valor ?? 0) > 0
  );
  const valorHomologadoRescisao = temRescisaoDefinida ? (settings.rescisao_prevista?.valor || 0) : 0;
  const saldoRestanteRescisao = temRescisaoDefinida 
    ? Math.max(0, valorHomologadoRescisao - totalComprometidoRescisao) 
    : 0;

  const totalGeral = totalVista + totalCartao + totalRescisaoGastoDireto;
  const percVista = totalGeral > 0 ? (totalVista / totalGeral) * 100 : 50;
  const percCartao = totalGeral > 0 ? (totalCartao / totalGeral) * 100 : 50;

  // Cálculo dos dias até o dia 5
  const today = new Date();
  const currentDay = today.getDate();
  const diaRecebimento = settings.dia_recebimento || 5;
  let diasAteDia5 = diaRecebimento - currentDay;
  if (diasAteDia5 < 0) {
    // Próximo mês
    const diasNoMes = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    diasAteDia5 = (diasNoMes - currentDay) + diaRecebimento;
  }

  // Regra SALDO PIX REAL: o saldo livre só conta dinheiro que JÁ ENTROU
  const temRescisaoNoMes = Boolean(
    settings.rescisao_prevista &&
    settings.rescisao_prevista.data_prevista.startsWith(selectedMonth)
  );
  const rescisaoInformada = Boolean(
    settings.rescisao_prevista?.status === 'recebido' &&
    (settings.rescisao_prevista?.valor ?? 0) > 0
  );

  let dinheiroJaEntrou = true;
  let motivoSemSaldo = '';
  if (temRescisaoNoMes) {
    if (currentDay < 30 && !rescisaoInformada) {
      dinheiroJaEntrou = false;
      motivoSemSaldo = 'Antes do dia 30 (sem rescisão informada)';
    }
  } else {
    if (currentDay < diaRecebimento) {
      dinheiroJaEntrou = false;
      motivoSemSaldo = `Antes do dia ${String(diaRecebimento).padStart(2, '0')} (salário ainda não creditado)`;
    }
  }

  // Nome formatado do mês selecionado
  const [yearStr, monthStr] = selectedMonth.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthName = monthNames[parseInt(monthStr, 10) - 1] || selectedMonth;

  const handleSaveRescisao = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(rescisaoInput.replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      sound.playSuccess();
      onUpdateRescisao(val);
      setEditingRescisao(false);
      setRescisaoInput('');
    }
  };

  return (
    <div className="border border-[#00f0ff]/40 bg-[#04060d]/95 p-4 shadow-xl font-mono space-y-4">
      {/* Header Tag */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-[#00f0ff]/20">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#ffe600] text-black font-extrabold text-[11px] tracking-wider uppercase">
            <Layers className="w-3.5 h-3.5 text-black" />
            <span>[ MECANISMO DE DUAS ESCALAS // {monthName.toUpperCase()} {yearStr} ]</span>
          </div>
          <span className="text-[10px] text-neutral-400">
            BANCO DE DADOS MÊS A MÊS
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenNoteImporter}
          className="px-3 py-1 bg-[#00f0ff] hover:bg-[#00ff66] text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
          title="Colar anotações do bloco de notas para importar em lote"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>+ IMPORTAR BLOCO DE NOTAS</span>
        </button>
      </div>

      {/* Cards das Duas Escalas Lado a Lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ESCALA 1: PIX & À VISTA */}
        <div className={`p-3.5 relative transition-all ${
          !dinheiroJaEntrou 
            ? 'border-2 border-[#ff0055] bg-[#140309]' 
            : 'border border-[#00ff66]/60 bg-[#020e06]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-black font-black text-[10px] tracking-wider uppercase ${
              !dinheiroJaEntrou ? 'bg-[#ff0055]' : 'bg-[#00ff66]'
            }`}>
              {!dinheiroJaEntrou ? <AlertTriangle className="w-3 h-3 text-black" /> : <Zap className="w-3 h-3 text-black" />}
              <span>ESCALA 1: PIX & À VISTA</span>
            </span>
            <span className={`text-[10px] ${!dinheiroJaEntrou ? 'text-[#ff0055] font-bold' : 'text-[#00ff66]'}`}>
              {vistaExpenses.length} lançamentos
            </span>
          </div>

          <div className="my-2">
            <span className={`text-2xl font-black ${!dinheiroJaEntrou ? 'text-[#ff0055]' : 'text-[#00ff66]'}`}>
              {formatCurrency(totalVista, isHidden)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              Liquidação imediata (saída instantânea do Saldo Livre)
            </span>
          </div>

          {!dinheiroJaEntrou ? (
            <div className="pt-2 border-t border-[#ff0055]/30 space-y-1">
              <div className="text-[10px] font-black text-[#ff0055] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 animate-pulse text-[#ff0055]" />
                <span>Sem saldo: gastos vão para o cartão</span>
              </div>
              <div className="text-[9px] text-neutral-400">
                SALDO PIX REAL = R$ 0,00 ({motivoSemSaldo})
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-[#00ff66]/20 text-[10px] text-neutral-400 flex justify-between items-center">
              <span>CONSUMO DO MÊS:</span>
              <span className="font-bold text-[#00ff66]">{percVista.toFixed(0)}% do volume total</span>
            </div>
          )}
        </div>

        {/* ESCALA 2: CARTÃO DE CRÉDITO */}
        {(() => {
          const diaFechamento = settings.dia_fechamento_cartao || 17;
          const diaVencimento = settings.dia_vencimento_cartao || 23;
          const faturaOutubroPaga = settings.fatura_outubro_paga !== false;
          const isOutubro = selectedMonth === '2026-10';

          // Gastos feitos a partir do dia 17 (vencem em 23 de Novembro)
          const cartaoPosVirada = cartaoExpenses.filter(e => {
            const day = parseInt(e.data.split('-')[2] || '0', 10);
            return day >= diaFechamento;
          });
          const totalPosVirada = cartaoPosVirada.reduce((acc, e) => acc + e.valor, 0);

          // Gastos feitos antes do dia 17
          const cartaoPreVirada = cartaoExpenses.filter(e => {
            const day = parseInt(e.data.split('-')[2] || '0', 10);
            return day < diaFechamento;
          });
          const totalPreVirada = faturaOutubroPaga ? 0 : cartaoPreVirada.reduce((acc, e) => acc + e.valor, 0);

          return (
            <div className="p-3.5 relative transition-all border border-[#00f0ff]/60 bg-[#030d17]">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-black text-[10px] tracking-wider uppercase bg-[#00f0ff] text-black">
                  <CreditCard className="w-3 h-3 text-black" />
                  <span>ESCALA 2: CARTÃO DE CRÉDITO</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 border text-[9px] font-bold bg-[#00ff66]/20 border-[#00ff66]/60 text-[#00ff66]">
                    {isOutubro && faturaOutubroPaga ? 'FATURA OUTUBRO: PAGA' : 'VIRA 17 • VENCE 23'}
                  </span>
                  <span className="text-[10px] text-[#00f0ff]">
                    {cartaoExpenses.length} lançamentos
                  </span>
                </div>
              </div>

              <div className="my-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-[#00f0ff]">
                    {formatCurrency(totalCartao, isHidden)}
                  </span>
                  <span className="text-[10px] text-[#00ff66] font-bold">
                    {isOutubro ? 'VENCE 23/11 (NOVA FATURA)' : 'FATURA EM ABERTO'}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  {isOutubro 
                    ? 'Compras feitas após a virada de 17/10: Abbey + Ubers' 
                    : 'Fatura acumulada para quitação'}
                </span>
              </div>

              {/* Status da Fatura de Outubro vs Novembro */}
              {isOutubro && (
                <div className="space-y-1.5 my-2">
                  <div className="p-1.5 bg-[#031d0e] border border-[#00ff66] text-[#00ff66] text-[10px] font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#00ff66]" />
                      <span>FATURA OUTUBRO (23/10):</span>
                    </span>
                    <span className="uppercase tracking-wider">QUITADA / PAGA (R$ 0,00)</span>
                  </div>

                  <div className="p-1.5 bg-[#100720] border border-[#c084fc] text-[#c084fc] text-[10px] font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>FATURA NOVEMBRO (23/11):</span>
                    </span>
                    <span>{formatCurrency(totalPosVirada, isHidden)} (C/ RESCISÃO)</span>
                  </div>
                </div>
              )}

              {totalCartaoVinculadoRescisao > 0 && !isOutubro && (
                <div className="mb-2 p-1.5 bg-[#1b0d26] border border-[#c084fc]/60 text-[#c084fc] text-[10px] font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>VINCULADO À RESCISÃO: {formatCurrency(totalCartaoVinculadoRescisao, isHidden)}</span>
                  </span>
                  <span className="text-[9px] text-[#e9d5ff]">NÃO reduz os R$ 200 do salário!</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#00f0ff]/20 text-[10px] text-neutral-400 flex justify-between items-center">
                <span>CICLO DO CARTÃO:</span>
                <span className="font-bold text-[#00ff66]">Virada 17/10 • Vencimento 23/11</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* CENTRAL DA PONTE: CARTÃO X RESCISÃO (CONFIRMAÇÃO DO CICLO DE NOVEMBRO) */}
      {totalCartaoVinculadoRescisao > 0 && (
        <div className="bg-[#0b0314] border-2 border-[#00ff66] p-3.5 shadow-2xl shadow-[#00ff66]/15 font-mono space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#00ff66]/40">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#00ff66] text-black font-black text-[11px] tracking-wider uppercase flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-black" />
                <span>[ FLUXO CONFIRMADO: BANDEIRA VIROU NO DIA 17 // SEM DESCOMPASSO ]</span>
              </span>
              <span className="text-[10px] text-[#00ff66] font-bold">
                TOTAL NOVEMBRO: {formatCurrency(totalCartaoVinculadoRescisao, isHidden)}
              </span>
            </div>
            <div className="px-2 py-0.5 bg-[#00ff66]/20 border border-[#00ff66] text-[#00ff66] text-[10px] font-bold uppercase">
              RESCISÃO ENTRA 24 DIAS ANTES DO VENCIMENTO
            </div>
          </div>

          <div className="text-[11px] text-neutral-200 leading-relaxed bg-[#03150b] p-3 border border-[#00ff66]/30 space-y-2">
            <p className="font-bold text-[#e0f2fe]">
              ✓ <span className="text-[#00ff66] font-black uppercase">Fatura de Outubro já paga</span> pelo usuário. Todos os gastos adicionados (Abbey R$ 63 + Ubers = <span className="text-[#ffe600] font-black">{formatCurrency(totalCartaoVinculadoRescisao, isHidden)}</span>) foram realizados a partir de 17/10 e pertencem à <span className="text-[#00f0ff] font-black underline">Fatura de 23 de Novembro</span>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              {/* CARD 1: CRONOGRAMA */}
              <div className="bg-black/80 border-2 border-[#00ff66]/70 p-2.5 space-y-1">
                <span className="px-1.5 py-0.5 bg-[#00ff66] text-black font-black text-[9px] uppercase tracking-wider block w-max">
                  1. CRONOGRAMA DO DINHEIRO
                </span>
                <p className="font-bold text-[#00ff66] text-xs">Rescisão Cai na Sexta (30/10)</p>
                <p className="text-[10px] text-neutral-300 leading-tight">
                  A verba rescisória entrará na conta na <strong>sexta-feira, dia 30 de Outubro</strong>. O valor exato será conhecido neste dia.
                </p>
                <p className="text-[10px] text-[#00ff66] font-bold leading-tight pt-1">
                  ✓ O dinheiro estará disponível <strong>24 dias antes</strong> da fatura de Novembro vencer!
                </p>
              </div>

              {/* CARD 2: QUITAÇÃO */}
              <div className="bg-black/80 border border-[#00f0ff]/70 p-2.5 space-y-1">
                <span className="px-1.5 py-0.5 bg-[#00f0ff] text-black font-black text-[9px] uppercase tracking-wider block w-max">
                  2. QUITAÇÃO DA FATURA
                </span>
                <p className="font-bold text-[#00f0ff] text-xs">Vencimento em 23/11</p>
                <p className="text-[10px] text-neutral-300 leading-tight">
                  No <strong>Dia 23 de Novembro</strong>, debite os <strong>{formatCurrency(totalCartaoVinculadoRescisao, isHidden)}</strong> diretamente da verba rescisória já depositada.
                </p>
                <p className="text-[10px] text-[#00f0ff] font-bold leading-tight pt-1">
                  ✓ {temRescisaoDefinida ? `Sobra líquida da rescisão: ${formatCurrency(saldoRestanteRescisao, isHidden)}` : 'Quitação tranquila com 24 dias de dinheiro em conta!'}
                </p>
              </div>

              {/* CARD 3: RESERVA DE EMERGÊNCIA */}
              <div className="bg-black/80 border border-[#c084fc]/70 p-2.5 space-y-1">
                <span className="px-1.5 py-0.5 bg-[#c084fc] text-black font-black text-[9px] uppercase tracking-wider block w-max">
                  3. A RESERVA É A RESCISÃO
                </span>
                <p className="font-bold text-[#c084fc] text-xs">Cofre Constituído no Dia 30</p>
                <p className="text-[10px] text-neutral-300 leading-tight">
                  A própria rescisão constituirá sua Reserva de Emergência. Ao abater os {formatCurrency(totalCartaoVinculadoRescisao, isHidden)}, todo o valor remanescente ficará blindado.
                </p>
                <p className="text-[10px] text-[#c084fc] font-bold leading-tight pt-1">
                  ✓ Zero juros, zero rotativo e fundo de sobrevida formado!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proporção Comparativa entre as Duas Escalas */}
      <div className="space-y-1.5 bg-black border border-neutral-800 p-3 text-xs">
        <div className="flex justify-between text-[11px]">
          <span className="text-[#00ff66] font-bold">
            PIX / À VISTA: {formatCurrency(totalVista, isHidden)} ({percVista.toFixed(0)}%)
          </span>
          <span className="text-neutral-400">
            TOTAL CONSOLIDADO: <strong className="text-[#ffe600]">{formatCurrency(totalGeral, isHidden)}</strong>
          </span>
          <span className="text-[#00f0ff] font-bold">
            CARTÃO: {formatCurrency(totalCartao, isHidden)} ({percCartao.toFixed(0)}%)
          </span>
        </div>

        {/* Stepped Dual Distribution Bar */}
        <div className="w-full h-2.5 bg-neutral-900 border border-neutral-700 flex overflow-hidden">
          <div 
            className="bg-[#00ff66] h-full transition-all duration-500"
            style={{ width: `${percVista}%` }}
            title={`Pix / À Vista: ${percVista.toFixed(1)}%`}
          />
          <div 
            className="bg-[#00f0ff] h-full transition-all duration-500"
            style={{ width: `${percCartao}%` }}
            title={`Cartão de Crédito: ${percCartao.toFixed(1)}%`}
          />
        </div>
      </div>

      {/* Grid Triplo de Inteligência Cronológica: Salário (05), Cartão (17/23), Rescisão (30) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* Banner 1: Ciclo do Salário no Dia 5 */}
        <div className="p-3 bg-black border border-[#ffe600]/40 flex items-start gap-2.5">
          <Calendar className="w-4 h-4 text-[#ffe600] flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px]">
            <p className="font-bold text-[#ffe600] uppercase">
              // SALÁRIO: DIA 05
            </p>
            <p className="text-neutral-300 text-[10px] leading-relaxed">
              R$ 850,00 entra sempre no <strong>dia 05</strong>.
              {diasAteDia5 === 0 ? (
                <span className="text-[#00ff66] font-bold block mt-0.5">HOJE É DIA DE PAGAMENTO!</span>
              ) : (
                <span className="text-[#ffe600] font-bold block mt-0.5">Faltam {diasAteDia5} dias para o crédito.</span>
              )}
            </p>
          </div>
        </div>

        {/* Banner 2: Ciclo do Cartão: Vira dia 17 / Vence dia 23 */}
        <div className="p-3 bg-black border border-[#00f0ff]/40 flex items-start gap-2.5">
          <CreditCard className="w-4 h-4 text-[#00f0ff] flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px]">
            <p className="font-bold text-[#00f0ff] uppercase">
              // CARTÃO: VIRA DIA 17 // VENCE DIA 23
            </p>
            <p className="text-neutral-300 text-[10px] leading-relaxed">
              {(() => {
                const diaHoje = currentDay;
                const diaVenc = settings.dia_vencimento_cartao || 23;
                const diaFech = settings.dia_fechamento_cartao || 17;

                if (diaHoje === diaFech) {
                  return (
                    <span className="text-[#00f0ff] font-bold">
                      ⚡ <strong>HOJE É O DIA DA VIRADA (17)!</strong> Compras feitas agora jogam o vencimento para o dia 23 do próximo mês (~36 dias).
                    </span>
                  );
                } else if (diaHoje > diaFech && diaHoje <= diaVenc) {
                  const diasFaltam = diaVenc - diaHoje;
                  return (
                    <span>
                      Fatura fechada no dia 17. <strong className="text-[#ffe600]">Prazo máximo de pagamento em {diasFaltam} {diasFaltam === 1 ? 'dia' : 'dias'} (Dia 23)</strong>.
                    </span>
                  );
                } else if (diaHoje === diaVenc) {
                  return (
                    <span className="text-[#ff0055] font-bold">
                      🚨 HOJE É O VENCIMENTO DA FATURA (DIA 23)! Realize o pagamento para evitar encargos.
                    </span>
                  );
                } else {
                  return (
                    <span>
                      Fatura aberta. Próximo fechamento no dia 17. Pagamento programado para dia 23.
                    </span>
                  );
                }
              })()}
            </p>
          </div>
        </div>

        {/* Banner: Verba Rescisória Prevista (Dia 30 - Cálculo Sexta-feira) */}
        <div className="p-3 bg-black border border-[#c084fc]/50 flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <Briefcase className="w-4 h-4 text-[#c084fc] flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px]">
              <p className="font-bold text-[#c084fc] uppercase">
                // VERBA RESCISÓRIA: RECEBIMENTO DIA 30 (CÁLCULO NA SEXTA)
              </p>
              <div className="text-neutral-300 text-[10px] space-y-1">
                <div>
                  <span className="block">
                    {valorHomologadoRescisao > 0 ? (
                      <>Homologado: <strong className="text-[#00ff66]">{formatCurrency(valorHomologadoRescisao, isHidden)}</strong></>
                    ) : (
                      <>Status: <strong className="text-[#c084fc] font-bold">A definir na sexta-feira (dia 30)</strong></>
                    )}
                    {totalCartaoVinculadoRescisao > 0 && (
                      <span className="text-neutral-300"> • Fatura Cartão (Abbey + Ubers): <strong className="text-[#c084fc]">-{formatCurrency(totalCartaoVinculadoRescisao, isHidden)}</strong></span>
                    )}
                    {totalRescisaoGastoDireto > 0 && (
                      <span className="text-neutral-300"> • Pix Rescisão: <strong className="text-[#c084fc]">-{formatCurrency(totalRescisaoGastoDireto, isHidden)}</strong></span>
                    )}
                  </span>
                  <span className="block text-[#00f0ff] font-bold mt-1">
                    {valorHomologadoRescisao > 0 
                      ? `Saldo líquido restante da rescisão (Reserva): ${formatCurrency(saldoRestanteRescisao, isHidden)}` 
                      : 'A rescisão constituirá sua Reserva de Emergência ao ser depositada na sexta (30/10)'}
                  </span>
                  <span className="block text-[9px] text-[#00ff66] font-bold mt-0.5">
                    🛡️ Seus R$ 200,00 do salário mensal continuam 100% blindados e intocados!
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0">
            {editingRescisao ? (
              <form onSubmit={handleSaveRescisao} className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="R$ valor"
                  value={rescisaoInput}
                  onChange={(e) => setRescisaoInput(e.target.value)}
                  className="w-20 bg-[#0a0f1d] border border-[#00f0ff] px-1 py-0.5 text-xs text-[#e0f2fe]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1 bg-[#00ff66] text-black text-[10px] font-bold uppercase"
                >
                  <Check className="w-3 h-3" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setEditingRescisao(true)}
                className="px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-[#00f0ff] hover:border-[#00f0ff] text-[10px] font-bold uppercase transition-all"
              >
                {settings.rescisao_prevista?.valor ? 'EDITAR' : '+ INFORMAR VALOR'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
