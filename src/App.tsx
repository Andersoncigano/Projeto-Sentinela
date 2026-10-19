/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { RawInputTerminal } from './components/RawInputTerminal';
import { FrictionModal } from './components/FrictionModal';
import { DebtManager } from './components/DebtManager';
import { EmergencyVault } from './components/EmergencyVault';
import { AuditTable } from './components/AuditTable';
import { SimulatorTab } from './components/SimulatorTab';
import { PythonCodeViewer } from './components/PythonCodeViewer';
import { NudgeManualTab } from './components/NudgeManualTab';
import { MonthSelector } from './components/MonthSelector';
import { DualScaleTracker } from './components/DualScaleTracker';
import { NoteBatchImporterModal } from './components/NoteBatchImporterModal';

import {
  ExpenseRecord,
  DebtRecord,
  SystemSettings,
  BurnRateMetrics,
} from './types/sentinela';
import { SentinelaBurnEngine } from './lib/burnEngine';
import { sound } from './lib/sound';
import { formatCurrency } from './lib/format';

export { formatCurrency };

import { RotateCcw, Trash2 } from 'lucide-react';

const DEFAULT_SETTINGS: SystemSettings = {
  renda_mensal: 850.0,
  reserva_emergencia: 1400.0,
  horas_trabalho_mes: 88.0, // PCD Meio Período (~4h/dia * 22 dias)
  custos_fixos_essenciais: 650.0, // Obrigações: luz, remédio, internet e banco (~R$ 650)
  meta_poupanca_minima: 0.0, // Deixa exatamente R$ 200,00 livres da renda ordinária
  dia_recebimento: 5,
  dia_fechamento_cartao: 17, // Vira dia 17
  dia_vencimento_cartao: 23, // Vence dia 23
  rescisao_prevista: {
    data_prevista: '2026-10-30',
    status: 'aguardando_calculo',
    observacao: 'Previsão de rescisão a receber no dia 30 - valor líquido a calcular na sexta-feira',
  },
};

const DEFAULT_DEBTS: DebtRecord[] = [
  {
    id: 'debt_cartao_1',
    credor: 'Fatura do Cartão de Crédito',
    valor_total: 0.0,
    valor_pago: 0.0,
    meta_amortizacao_mes: 0.0,
    prioridade: 1,
    observacao: 'Fatura do cartão de crédito zerada para novo ciclo',
  },
];

const getInitialExpenses = (): ExpenseRecord[] => {
  // Inicialização zerada a pedido do usuário para recomeçar do zero
  return [];
};

export default function App() {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('sentinela_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Atualiza para o orçamento real informado pelo usuário:
        // Salário: R$ 850, Obrigações fixas (luz, remédio, internet, dívida banco): R$ 650 -> Saldo Livre: R$ 200,00
        if (parsed.custos_fixos_essenciais !== 650 || parsed.renda_mensal !== 850) {
          parsed.renda_mensal = 850.0;
          parsed.custos_fixos_essenciais = 650.0;
          parsed.meta_poupanca_minima = 0.0;
          localStorage.setItem('sentinela_settings', JSON.stringify(parsed));
        }
        return parsed;
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [debts, setDebts] = useState<DebtRecord[]>(() => {
    const saved = localStorage.getItem('sentinela_debts');
    return saved ? JSON.parse(saved) : DEFAULT_DEBTS;
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem('sentinela_expenses_v2');
    return saved ? JSON.parse(saved) : getInitialExpenses();
  });

  // Mês selecionado no banco de dados (ex: '2026-10' ou '2026-09')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const saved = localStorage.getItem('sentinela_selected_month');
    return saved || '2026-10';
  });

  const [activeTab, setActiveTab] = useState<'cockpit' | 'python_code' | 'simulator' | 'nudge_manual'>('cockpit');
  const [isMuted, setIsMuted] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);

  // Estado global de visibilidade/privacidade (Modo Ocultar Valores como em apps de banco)
  const [showValues, setShowValues] = useState<boolean>(() => {
    const saved = localStorage.getItem('sentinela_show_values');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [pendingFrictionExpense, setPendingFrictionExpense] = useState<ExpenseRecord | null>(null);
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isNoteImporterOpen, setIsNoteImporterOpen] = useState(false);

  // Salvar preferências no localStorage
  useEffect(() => {
    localStorage.setItem('sentinela_settings', JSON.stringify(settings));
  }, [settings]);

  // Garante que o orçamento real do usuário esteja ativo (Renda 850 - Obrigações 650 = Saldo Livre 200)
  useEffect(() => {
    if (settings.custos_fixos_essenciais !== 650 || settings.renda_mensal !== 850) {
      setSettings((prev) => ({
        ...prev,
        renda_mensal: 850.0,
        custos_fixos_essenciais: 650.0,
        meta_poupanca_minima: 0.0,
      }));
    }
  }, [settings.custos_fixos_essenciais, settings.renda_mensal]);

  useEffect(() => {
    localStorage.setItem('sentinela_debts', JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem('sentinela_expenses_v2', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('sentinela_show_values', JSON.stringify(showValues));
  }, [showValues]);

  useEffect(() => {
    localStorage.setItem('sentinela_selected_month', selectedMonth);
  }, [selectedMonth]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Alterna o estado global de visibilidade de valores
  const handleToggleShowValues = () => {
    setShowValues((prev) => {
      const next = !prev;
      showToast(
        next
          ? '👁️ [MODO_PRIVACIDADE_DESATIVADO] Valores visíveis.'
          : '👁️ [MODO_PRIVACIDADE_ATIVADO] Renda e todos os valores sensíveis ocultos.'
      );
      return next;
    });
  };

  // Meses disponíveis no banco de dados
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>(['2026-09', '2026-10']);
    expenses.forEach((e) => {
      if (e.data && e.data.length >= 7) {
        monthSet.add(e.data.substring(0, 7));
      }
    });
    return Array.from(monthSet).sort().reverse();
  }, [expenses]);

  // Compute Moving Ceiling & Daily Burn Rate para o mês selecionado
  const metrics: BurnRateMetrics = useMemo(() => {
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonth = selectedMonth === currentMonthKey;

    const refDate = isCurrentMonth
      ? now
      : new Date(selYear, selMonth - 1, new Date(selYear, selMonth, 0).getDate());

    return SentinelaBurnEngine.calculateMetrics(
      settings,
      expenses,
      debts,
      refDate
    );
  }, [settings, expenses, debts, selectedMonth]);

  const handleRegisterExpense = (record: ExpenseRecord) => {
    setExpenses((prev) => [record, ...prev]);
    setTerminalInput(''); // Limpa o terminal após registro com sucesso
    showToast(`✓ [BANCO_DADOS] Gasto registrado: R$ ${record.valor.toFixed(2)} (${record.descricao}).`);
  };

  const handleFrictionCheck = (record: ExpenseRecord) => {
    setPendingFrictionExpense(record);
  };

  const handleAbortFriction = () => {
    sound.playSuccess();
    setPendingFrictionExpense(null);
    setTerminalInput(''); // Limpa o terminal ao voltar / cancelar a tela de fricção
    showToast('🛡️ [VOLTAR_OK] Operação cancelada e terminal limpo! Teto diário preservado.');
  };

  const handleConfirmFriction = (record: ExpenseRecord) => {
    sound.playFrictionAlert();
    setExpenses((prev) => [record, ...prev]);
    setPendingFrictionExpense(null);
    setTerminalInput(''); // Limpa o terminal após confirmar sob penalidade
    showToast(`⚠️ [OVERRIDE] Gasto impulsivo de R$ ${record.valor.toFixed(2)} computado sob penalidade.`);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast('✓ [BANCO_DADOS] Despesa eliminada. Teto Móvel Diário recalculado.');
  };

  const handleAmortizeDebt = (debtId: string, amount: number) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === debtId ? { ...d, valor_pago: d.valor_pago + amount } : d))
    );
    showToast(`✓ [FATURA_AMORT] Pagamento de R$ ${amount.toFixed(2)} da Fatura do Cartão quitado!`);
  };

  const handleAddDebt = (newDebt: Omit<DebtRecord, 'id'>) => {
    const debt: DebtRecord = {
      ...newDebt,
      id: `debt_${Date.now()}`,
    };
    setDebts((prev) => [...prev, debt]);
    showToast(`✓ [NEW_PASSIVE] Passivo adicionado: ${debt.credor}`);
  };

  const handleEmergencyWithdrawal = (amount: number, reason: string) => {
    setSettings((prev) => ({
      ...prev,
      reserva_emergencia: Math.max(0, prev.reserva_emergencia - amount),
    }));
    showToast(`🚨 [ICE_BREACH] Violação do cofre registrada: R$ ${amount.toFixed(2)}`);
  };

  // Importar despesas em lote do bloco de notas
  const handleImportBatchExpenses = (newExpenses: ExpenseRecord[], targetMonth: string) => {
    setExpenses((prev) => [...newExpenses, ...prev]);
    setSelectedMonth(targetMonth);
    showToast(`✓ [BANCO_DADOS] ${newExpenses.length} despesas gravadas no mês ${targetMonth}!`);
  };

  // Restaurar backup do banco de dados
  const handleRestoreDatabase = (backup: { expenses: ExpenseRecord[]; debts?: DebtRecord[]; settings?: SystemSettings }) => {
    if (backup.expenses && Array.isArray(backup.expenses)) {
      setExpenses(backup.expenses);
    }
    if (backup.debts && Array.isArray(backup.debts)) {
      setDebts(backup.debts);
    }
    if (backup.settings) {
      setSettings(backup.settings);
    }
    showToast('✓ [BANCO_DADOS] Backup restaurado com sucesso!');
  };

  // Atualizar valor da rescisão quando o usuário receber no dia 30
  const handleUpdateRescisao = (valor: number) => {
    setSettings((prev) => ({
      ...prev,
      rescisao_prevista: {
        data_prevista: '2026-10-30',
        valor,
        status: 'recebido',
        observacao: 'Verba rescisória informada pelo usuário',
      },
    }));
    showToast(`✓ [RESCISAO_GRAVADA] Valor de R$ ${valor.toFixed(2)} registrado no sistema!`);
  };

  // Limpar todos os valores anteriores para recomeçar o banco de dados do zero
  const handleClearAllExpenses = () => {
    sound.playSuccess();
    setExpenses([]);
    setDebts([
      {
        id: 'debt_cartao_1',
        credor: 'Fatura do Cartão de Crédito',
        valor_total: 0.0,
        valor_pago: 0.0,
        meta_amortizacao_mes: 0.0,
        prioridade: 1,
        observacao: 'Fatura do cartão de crédito zerada para novo ciclo',
      },
    ]);
    localStorage.setItem('sentinela_expenses_v2', JSON.stringify([]));
    localStorage.setItem('sentinela_debts', JSON.stringify([
      {
        id: 'debt_cartao_1',
        credor: 'Fatura do Cartão de Crédito',
        valor_total: 0.0,
        valor_pago: 0.0,
        meta_amortizacao_mes: 0.0,
        prioridade: 1,
        observacao: 'Fatura do cartão de crédito zerada para novo ciclo',
      },
    ]));
    showToast('🧹 [BANCO_DADOS_ZERADO] Histórico e faturas anteriores zerados com sucesso! Pronto para novo ciclo.');
  };

  return (
    <div className="min-h-screen bg-[#030407] text-[#e0f2fe] flex flex-col font-mono selection:bg-[#00f0ff] selection:text-black relative">
      {/* CRT Scanline & Curved Vignette Overlays */}
      {crtEnabled && (
        <>
          <div className="crt-overlay fixed inset-0 z-40 opacity-70 pointer-events-none" />
          <div className="crt-vignette fixed inset-0 z-40 opacity-80 pointer-events-none" />
        </>
      )}

      {/* Top Cyberpunk Header */}
      <Header
        metrics={metrics}
        settings={settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        crtEnabled={crtEnabled}
        setCrtEnabled={setCrtEnabled}
        showValues={showValues}
        onToggleShowValues={handleToggleShowValues}
      />

      {/* Main Cockpit Space */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4 relative z-10">
        {/* Cyber Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-black border border-[#00f0ff] text-[#00f0ff] px-4 py-2.5 text-xs flex items-center gap-2 neon-glow-cyan animate-in slide-in-from-bottom duration-150">
            <span className="w-2 h-2 bg-[#00ff66] animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 1: COCKPIT OPERACIONAL */}
        {activeTab === 'cockpit' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Seletor Mês a Mês do Banco de Dados & Backup */}
            <MonthSelector
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
              availableMonths={availableMonths}
              expenses={expenses}
              debts={debts}
              settings={settings}
              showValues={showValues}
              onRestoreDatabase={handleRestoreDatabase}
              onClearAllData={handleClearAllExpenses}
            />

            {/* Banner de Limpeza se houver despesas no navegador do usuário */}
            {expenses.length > 0 && (
              <div className="bg-[#14060b] border border-[#ff0055]/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
                <div className="flex items-center gap-2 text-[#ff4d79]">
                  <RotateCcw className="w-4 h-4 text-[#ff0055] flex-shrink-0" />
                  <span>
                    Existem <strong>{expenses.length} lançamentos</strong> salvos no navegador. Clique ao lado para zerar tudo e começar do zero:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllExpenses}
                  className="px-3.5 py-1.5 bg-[#ff0055] hover:bg-[#ff3377] text-white font-extrabold uppercase text-[11px] transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5 shadow-lg shadow-[#ff0055]/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ZERAR HISTÓRICO AGORA</span>
                </button>
              </div>
            )}

            {/* Mecanismo de Duas Escalas: Pix/À Vista vs Cartão de Crédito + Ciclo Salário (Dia 5) & Rescisão (Dia 30) */}
            <DualScaleTracker
              selectedMonth={selectedMonth}
              expenses={expenses}
              settings={settings}
              showValues={showValues}
              onOpenNoteImporter={() => setIsNoteImporterOpen(true)}
              onUpdateRescisao={handleUpdateRescisao}
            />

            {/* Top Metric Cards: Renda, Teto Móvel Diário, Saldo Livre */}
            <MetricCards 
              metrics={metrics} 
              settings={settings} 
              debts={debts} 
              expenses={expenses}
              selectedMonth={selectedMonth}
              showValues={showValues} 
            />

            {/* Raw Input Terminal (NLP / Regex Parser) com suporte a CLEAR e RESET */}
            <RawInputTerminal
              inputVal={terminalInput}
              setInputVal={setTerminalInput}
              onRegisterExpense={handleRegisterExpense}
              onRequestFrictionCheck={handleFrictionCheck}
              expenses={expenses}
              onBatchRegister={(newExps) => handleImportBatchExpenses(newExps, selectedMonth)}
            />

            {/* Grid: Debt Management & Emergency Vault */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <DebtManager
                  debts={debts}
                  metrics={metrics}
                  onAmortize={handleAmortizeDebt}
                  onAddDebt={handleAddDebt}
                  showValues={showValues}
                />
              </div>
              <div className="lg:col-span-5">
                {/* Cofre de Emergência com suporte ao modo de privacidade showValues */}
                <EmergencyVault
                  balance={settings.reserva_emergencia}
                  onEmergencyWithdrawal={handleEmergencyWithdrawal}
                  showValues={showValues}
                />
              </div>
            </div>

            {/* Audit & Transaction Ledger com filtro por mês selecionado e modo tela cheia */}
            <AuditTable
              expenses={expenses}
              onDeleteExpense={handleDeleteExpense}
              selectedMonth={selectedMonth}
              showValues={showValues}
            />
          </div>
        )}

        {/* TAB 2: SIMULADOR DE IMPACTO */}
        {activeTab === 'simulator' && (
          <div className="animate-in fade-in duration-150">
            <SimulatorTab metrics={metrics} settings={settings} />
          </div>
        )}

        {/* TAB 3: CÓDIGO PYTHON & ARQUITETURA */}
        {activeTab === 'python_code' && (
          <div className="animate-in fade-in duration-150">
            <PythonCodeViewer />
          </div>
        )}

        {/* TAB 4: MANUAL DO NUDGE */}
        {activeTab === 'nudge_manual' && (
          <div className="animate-in fade-in duration-150">
            <NudgeManualTab />
          </div>
        )}
      </main>

      {/* Behavioral Friction Modal */}
      <FrictionModal
        expense={pendingFrictionExpense}
        metrics={metrics}
        settings={settings}
        onAbort={handleAbortFriction}
        onConfirm={handleConfirmFriction}
      />

      {/* Modal de Importação em Lote do Bloco de Notas */}
      <NoteBatchImporterModal
        isOpen={isNoteImporterOpen}
        onClose={() => setIsNoteImporterOpen(false)}
        onImportExpenses={handleImportBatchExpenses}
        currentSelectedMonth={selectedMonth}
      />

      {/* Footer */}
      <footer className="border-t border-[#141b2e] bg-[#020306] py-3 text-center text-[10px] text-neutral-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[#00f0ff]/70">// SISTEMA SENTINELA :: BANCO DE DADOS MÊS A MÊS & DUAS ESCALAS</span>
          <span className="text-neutral-600">SALÁRIO DIA 05 • RESCISÃO PREV. DIA 30 • MÊS ATIVO: {selectedMonth}</span>
        </div>
      </footer>
    </div>
  );
}
