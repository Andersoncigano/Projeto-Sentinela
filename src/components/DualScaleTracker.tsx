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
  Layers
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

  const totalGeral = totalVista + totalCartao;
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
        <div className="border border-[#00ff66]/60 bg-[#020e06] p-3.5 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#00ff66] text-black font-black text-[10px] tracking-wider uppercase">
              <Zap className="w-3 h-3 text-black" />
              <span>ESCALA 1: PIX & À VISTA</span>
            </span>
            <span className="text-[10px] text-[#00ff66]">
              {vistaExpenses.length} lançamentos
            </span>
          </div>

          <div className="my-2">
            <span className="text-2xl font-black text-[#00ff66]">
              {formatCurrency(totalVista, isHidden)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              Liquidação imediata (saída instantânea do Saldo Livre)
            </span>
          </div>

          <div className="pt-2 border-t border-[#00ff66]/20 text-[10px] text-neutral-400 flex justify-between items-center">
            <span>CONSUMO DO MÊS:</span>
            <span className="font-bold text-[#00ff66]">{percVista.toFixed(0)}% do volume total</span>
          </div>
        </div>

        {/* ESCALA 2: CARTÃO DE CRÉDITO */}
        <div className="border border-[#00f0ff]/60 bg-[#030d17] p-3.5 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#00f0ff] text-black font-black text-[10px] tracking-wider uppercase">
              <CreditCard className="w-3 h-3 text-black" />
              <span>ESCALA 2: CARTÃO DE CRÉDITO</span>
            </span>
            <span className="text-[10px] text-[#00f0ff]">
              {cartaoExpenses.length} lançamentos
            </span>
          </div>

          <div className="my-2">
            <span className="text-2xl font-black text-[#00f0ff]">
              {formatCurrency(totalCartao, isHidden)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              Fatura acumulada para quitação no vencimento
            </span>
          </div>

          <div className="pt-2 border-t border-[#00f0ff]/20 text-[10px] text-neutral-400 flex justify-between items-center">
            <span>VOLUME DA FATURA:</span>
            <span className="font-bold text-[#00f0ff]">{percCartao.toFixed(0)}% do volume total</span>
          </div>
        </div>
      </div>

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

      {/* Grid: Ciclo Salarial (Dia 5) & Previsão de Rescisão (Dia 30) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Banner: Ciclo do Salário no Dia 5 */}
        <div className="p-3 bg-black border border-[#ffe600]/40 flex items-start gap-2.5">
          <Calendar className="w-4 h-4 text-[#ffe600] flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px]">
            <p className="font-bold text-[#ffe600] uppercase">
              // CICLO SALARIAL: RECEBIMENTO TODO DIA 05
            </p>
            <p className="text-neutral-300 text-[10px]">
              Seu benefício/salário (R$ 850,00) entra sempre no <strong>dia 05</strong> (turno manhã/tarde).
              {diasAteDia5 === 0 ? (
                <span className="text-[#00ff66] font-bold ml-1">HOJE É DIA DE PAGAMENTO!</span>
              ) : (
                <span className="text-[#ffe600] font-bold ml-1">Faltam {diasAteDia5} dias para o próximo crédito.</span>
              )}
            </p>
          </div>
        </div>

        {/* Banner: Verba Rescisória Prevista (Dia 30) */}
        <div className="p-3 bg-black border border-[#00f0ff]/40 flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <Briefcase className="w-4 h-4 text-[#00f0ff] flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px]">
              <p className="font-bold text-[#00f0ff] uppercase">
                // VERBA RESCISÓRIA: PREVISÃO DIA 30
              </p>
              <p className="text-neutral-300 text-[10px]">
                {settings.rescisao_prevista?.valor ? (
                  <span>
                    Valor homologado: <strong className="text-[#00ff66]">{formatCurrency(settings.rescisao_prevista.valor, isHidden)}</strong>
                  </span>
                ) : (
                  <span>
                    Aguardando conferência do valor da rescisão no dia 30 para calibrar aportes e reserva.
                  </span>
                )}
              </p>
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
