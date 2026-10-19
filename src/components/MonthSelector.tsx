import React, { useRef, useState } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Upload, 
  Database,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  X,
  FileText
} from 'lucide-react';
import { ExpenseRecord, DebtRecord, SystemSettings } from '../types/sentinela';
import { formatCurrency } from '../lib/format';
import { sound } from '../lib/sound';

interface MonthSelectorProps {
  selectedMonth: string; // YYYY-MM
  onSelectMonth: (month: string) => void;
  availableMonths: string[];
  expenses: ExpenseRecord[];
  debts: DebtRecord[];
  settings: SystemSettings;
  showValues: boolean;
  onRestoreDatabase: (backupData: { expenses: ExpenseRecord[]; debts: DebtRecord[]; settings: SystemSettings }) => void;
  onClearAllData?: () => void;
  onOpenReport?: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonth,
  onSelectMonth,
  availableMonths,
  expenses,
  debts,
  settings,
  showValues,
  onRestoreDatabase,
  onClearAllData,
  onOpenReport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const isHidden = !showValues;

  // Formatar nome do mês
  const formatMonthName = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    const idx = parseInt(m, 10) - 1;
    return `${MONTH_NAMES[idx] || m}/${y}`;
  };

  // Navegar mês anterior / próximo
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let prevY = y;
    let prevM = m - 1;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    const prevKey = `${prevY}-${String(prevM).padStart(2, '0')}`;
    sound.playTick();
    onSelectMonth(prevKey);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let nextY = y;
    let nextM = m + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const nextKey = `${nextY}-${String(nextM).padStart(2, '0')}`;
    sound.playTick();
    onSelectMonth(nextKey);
  };

  // Exportar Backup Completo do Banco em JSON
  const handleExportBackup = () => {
    sound.playSuccess();
    const backupData = {
      version: '2.5',
      exportDate: new Date().toISOString(),
      settings,
      debts,
      expenses,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sentinela_banco_dados_${selectedMonth}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Restaurar Backup do Banco
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.expenses && Array.isArray(json.expenses)) {
          sound.playSuccess();
          onRestoreDatabase(json);
        }
      } catch (err) {
        console.error('Falha ao restaurar banco de dados:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Totais do mês selecionado
  const currentMonthExpenses = expenses.filter(e => e.data.startsWith(selectedMonth));
  const totalVista = currentMonthExpenses
    .filter(e => e.metodo_pagamento === 'pix' || e.metodo_pagamento === 'dinheiro' || e.metodo_pagamento === 'debito')
    .reduce((acc, e) => acc + e.valor, 0);
  const totalCartao = currentMonthExpenses
    .filter(e => e.metodo_pagamento === 'cartao_credito' || e.metodo_pagamento === 'cartao_proprio' || e.metodo_pagamento === 'cartao_mae')
    .reduce((acc, e) => acc + e.valor, 0);

  return (
    <div className="border border-[#00f0ff]/30 bg-[#04060d]/95 p-3 shadow-lg font-mono text-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Navegação Mês a Mês */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black border border-[#00f0ff] text-[#00f0ff] font-extrabold text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>MÊS ATIVO:</span>
            <span className="text-[#ffe600] font-black uppercase">
              {formatMonthName(selectedMonth)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 border border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#00f0ff] transition-all cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 border border-neutral-700 bg-black text-neutral-400 hover:text-white hover:border-[#00f0ff] transition-all cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Seletor Direto Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => {
              sound.playTick();
              onSelectMonth(e.target.value);
            }}
            className="bg-black border border-[#00f0ff]/60 text-[#ffe600] font-black text-xs px-2 py-1 uppercase focus:outline-none focus:border-[#00f0ff] cursor-pointer"
            title="Selecionar Mês Base"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m} className="bg-black text-white">
                {formatMonthName(m)}
              </option>
            ))}
          </select>

          {/* Lista rápida de meses com dados gravados */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {availableMonths.map((m) => {
              const isCurrent = m === selectedMonth;
              const count = expenses.filter(e => e.data.startsWith(m)).length;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    sound.playTick();
                    onSelectMonth(m);
                  }}
                  className={`px-2 py-0.5 text-[10px] border transition-all whitespace-nowrap cursor-pointer ${
                    isCurrent
                      ? 'bg-[#00f0ff] border-[#00f0ff] text-black font-black'
                      : 'bg-black border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
                  }`}
                >
                  <span>{formatMonthName(m)}</span>
                  <span className="ml-1 opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumo Rápido das Duas Escalas e Ações de Banco de Dados */}
        <div className="flex items-center gap-3 justify-between lg:justify-end flex-wrap">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-neutral-400">Escalas:</span>
            <span className="text-[#00ff66] font-bold">
              Pix: {formatCurrency(totalVista, isHidden)}
            </span>
            <span className="text-neutral-600">|</span>
            <span className="text-[#00f0ff] font-bold">
              Cartão: {formatCurrency(totalCartao, isHidden)}
            </span>
          </div>

          {/* Ações do Banco de Dados & Relatórios */}
          <div className="flex items-center gap-1.5">
            {onOpenReport && (
              <button
                type="button"
                onClick={onOpenReport}
                className="px-2.5 py-1 bg-[#03180c] border border-[#00ff66]/70 text-[#00ff66] hover:bg-[#00ff66] hover:text-black text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-[#00ff66]/10"
                title="Gerar Relatório de Fechamento do Mês ou Data Específica"
              >
                <FileText className="w-3 h-3" />
                <span>RELATÓRIO</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportBackup}
              className="px-2 py-1 bg-black border border-neutral-700 text-neutral-400 hover:text-[#00f0ff] hover:border-[#00f0ff] text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
              title="Exportar backup completo do banco de dados em JSON"
            >
              <Download className="w-3 h-3 text-[#00f0ff]" />
              <span>EXPORTAR BD</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 bg-black border border-neutral-700 text-neutral-400 hover:text-[#ffe600] hover:border-[#ffe600] text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
              title="Restaurar backup do banco de dados em JSON"
            >
              <Upload className="w-3 h-3 text-[#ffe600]" />
              <span>RESTAURAR</span>
            </button>

            {/* Botão de Zerar Tudo com Confirmação Inline */}
            {onClearAllData && (
              <>
                {confirmClear ? (
                  <div className="flex items-center gap-1 bg-[#1a050a] border border-[#ff0055] px-1.5 py-0.5 animate-in fade-in">
                    <span className="text-[9px] text-[#ff3377] font-bold">ZERAR TUDO?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllData();
                        setConfirmClear(false);
                      }}
                      className="px-1.5 py-0.5 bg-[#ff0055] text-white hover:bg-[#ff3377] text-[9px] font-extrabold cursor-pointer"
                    >
                      SIM
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-[9px] font-bold cursor-pointer"
                    >
                      NÃO
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="px-2 py-1 bg-black border border-neutral-800 text-neutral-400 hover:text-[#ff0055] hover:border-[#ff0055] text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                    title="Limpar todos os gastos e começar do zero"
                  >
                    <Trash2 className="w-3 h-3 text-[#ff0055]" />
                    <span>ZERAR BANCO</span>
                  </button>
                )}
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
