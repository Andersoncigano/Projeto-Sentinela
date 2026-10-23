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
import { MonthlyReportView } from './components/MonthlyReportView';
import { SystemTransitionTracker } from './components/SystemTransitionTracker';

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

import { 
  RotateCcw, 
  Trash2, 
  AlertTriangle, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  CreditCard, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink,
  Sparkles 
} from 'lucide-react';

const DEFAULT_SETTINGS: SystemSettings = {
  renda_mensal: 850.0,
  reserva_emergencia: 0.0, // A reserva de emergência É a rescisão! Será constituída no dia 30/10
  horas_trabalho_mes: 88.0, // PCD Meio Período (~4h/dia * 22 dias)
  custos_fixos_essenciais: 650.0, // Obrigações: luz, remédio, internet e banco (~R$ 650)
  meta_poupanca_minima: 0.0, // Deixa exatamente R$ 200,00 livres da renda ordinária
  dia_recebimento: 5,
  dia_fechamento_cartao: 17, // Vira dia 17
  dia_vencimento_cartao: 23, // Vence dia 23
  fatura_outubro_paga: true, // Fatura de 23/10 QUITADA / PAGA pelo usuário
  rescisao_prevista: {
    data_prevista: '2026-10-30',
    valor: 0.0,
    status: 'aguardando_calculo',
    observacao: 'A reserva de emergência é a própria rescisão. O valor oficial será descoberto na sexta-feira, dia 30/10.',
  },
};

const DEFAULT_DEBTS: DebtRecord[] = [
  {
    id: 'debt_cartao_1',
    credor: 'Fatura do Cartão (Outubro/2026 - Paga)',
    valor_total: 0.0,
    valor_pago: 0.0,
    meta_amortizacao_mes: 0.0,
    prioridade: 1,
    observacao: 'Fatura de Outubro QUITADA pelo usuário (R$ 0,00 a vencer em 23/10)',
  },
];

const DEFAULT_INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp_uber17_default',
    data: '2026-10-17',
    descricao: 'Uber',
    valor: 6.10,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729166400000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber18_default',
    data: '2026-10-18',
    descricao: 'Uber',
    valor: 30.87,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729252800000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber18_3588',
    data: '2026-10-18',
    descricao: 'Uber',
    valor: 35.88,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729267200000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_abbey18_default',
    data: '2026-10-18',
    descricao: 'Abbey',
    valor: 63.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'outros',
    is_impulsive: false,
    timestamp: 1729281600000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber20',
    data: '2026-10-20',
    descricao: 'Uber',
    valor: 36.71,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729425600000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber21_default',
    data: '2026-10-21',
    descricao: 'Uber',
    valor: 30.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729512000000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_denis_beulmont_21',
    data: '2026-10-21',
    descricao: 'Roupas Denis Beulmont',
    valor: 341.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'impulsivo',
    is_impulsive: true,
    timestamp: 1729555200000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_uber22',
    data: '2026-10-22',
    descricao: 'Uber',
    valor: 5.78,
    metodo_pagamento: 'cartao_credito',
    categoria: 'transporte',
    is_impulsive: false,
    timestamp: 1729594800000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_abbey22',
    data: '2026-10-22',
    descricao: 'Abbey Chopp',
    valor: 20.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1729612800000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
  {
    id: 'exp_abbey23',
    data: '2026-10-23',
    descricao: 'Abbey Chopp',
    valor: 20.00,
    metodo_pagamento: 'cartao_credito',
    categoria: 'lazer_impulsivo',
    is_impulsive: true,
    timestamp: 1729684800000,
    vinculado_rescisao: true,
    fatura_mes: '2026-11',
    fatura_vencimento: '2026-11-23',
  },
];

const getInitialExpenses = (): ExpenseRecord[] => {
  return DEFAULT_INITIAL_EXPENSES;
};

export default function App() {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('sentinela_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Atualiza para o orçamento real informado pelo usuário:
        // Salário: R$ 850, Obrigações fixas (luz, remédio, internet, dívida banco): R$ 650 -> Saldo Livre: R$ 200,00
        parsed.renda_mensal = 850.0;
        parsed.custos_fixos_essenciais = 650.0;
        parsed.meta_poupanca_minima = 0.0;
        parsed.fatura_outubro_paga = true;
        // A reserva de emergência É a própria rescisão (valor a ser descoberto na sexta, 30/10):
        if (parsed.rescisao_prevista?.status === 'recebido' && (parsed.rescisao_prevista?.valor ?? 0) > 0) {
          parsed.reserva_emergencia = parsed.rescisao_prevista.valor;
        } else {
          parsed.reserva_emergencia = 0.0;
          parsed.rescisao_prevista = {
            data_prevista: '2026-10-30',
            valor: 0.0,
            status: 'aguardando_calculo',
            observacao: 'A reserva de emergência é a própria rescisão (valor a descobrir na sexta, 30/10)',
          };
        }
        localStorage.setItem('sentinela_settings', JSON.stringify(parsed));
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
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ajusta Uber de 18/10 de 30.80 para 30.87 se necessário
          let updatedWithVinculo: ExpenseRecord[] = parsed.map((e) => {
            const isCartao =
              e.metodo_pagamento === 'cartao_credito' ||
              e.metodo_pagamento === 'cartao_proprio' ||
              e.metodo_pagamento === 'cartao_mae';
            let val = e.valor;
            if (e.data === '2026-10-18' && e.descricao.toLowerCase().includes('uber') && Math.abs(e.valor - 30.80) < 0.02) {
              val = 30.87;
            }
            return {
              ...e,
              valor: val,
              vinculado_rescisao: e.vinculado_rescisao ?? isCartao,
              fatura_mes: e.fatura_mes ?? (isCartao ? '2026-11' : undefined),
              fatura_vencimento: e.fatura_vencimento ?? (isCartao ? '2026-11-23' : undefined),
            };
          });

          // Deduplicação da corrida de R$ 30,87 no dia 18/10 para evitar duplicidade (R$ 620,21 vs R$ 589,34)
          let seenUber18_3087 = false;
          updatedWithVinculo = updatedWithVinculo.filter((e) => {
            if (e.data === '2026-10-18' && e.descricao.toLowerCase().includes('uber') && Math.abs(e.valor - 30.87) < 0.02) {
              if (seenUber18_3087) return false;
              seenUber18_3087 = true;
            }
            return true;
          });

          // Garante que todas as despesas oficiais de DEFAULT_INITIAL_EXPENSES estejam presentes no navegador
          DEFAULT_INITIAL_EXPENSES.forEach((def) => {
            const exists = updatedWithVinculo.some(
              (e) => e.data === def.data && Math.abs(e.valor - def.valor) < 0.01 && e.descricao.toLowerCase().includes(def.descricao.toLowerCase().split(' ')[0])
            );
            if (!exists) {
              updatedWithVinculo.push(def);
            }
          });

          updatedWithVinculo.sort((a, b) => b.data.localeCompare(a.data) || b.timestamp - a.timestamp);

          localStorage.setItem('sentinela_expenses_v2', JSON.stringify(updatedWithVinculo));
          return updatedWithVinculo;
        }
      } catch {
        // fallback
      }
    }
    // Salva automaticamente para que qualquer novo navegador / aba externa já carregue com os dados reais
    localStorage.setItem('sentinela_expenses_v2', JSON.stringify(DEFAULT_INITIAL_EXPENSES));
    return DEFAULT_INITIAL_EXPENSES;
  });

  // Mês selecionado no banco de dados (ex: '2026-10' ou '2026-09')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const saved = localStorage.getItem('sentinela_selected_month');
    return saved || '2026-10';
  });

  const [activeTab, setActiveTab] = useState<'cockpit' | 'python_code' | 'simulator' | 'nudge_manual' | 'table' | 'report'>('cockpit');
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
  const [mobileReportExpanded, setMobileReportExpanded] = useState(false);

  // Consolidação dos 3 Pilares para exibição instantânea no Cockpit e no Celular
  const cockpitReportData = useMemo(() => {
    const list = expenses.filter((e) => e.data && e.data.startsWith(selectedMonth));
    const pixSalario = list
      .filter((e) => (e.metodo_pagamento === 'pix' || e.metodo_pagamento === 'dinheiro' || e.metodo_pagamento === 'debito') && !e.vinculado_rescisao)
      .reduce((sum, e) => sum + e.valor, 0);

    const cartaoRescisao = list
      .filter((e) => e.metodo_pagamento === 'cartao_credito' || e.metodo_pagamento === 'cartao_proprio' || e.metodo_pagamento === 'cartao_mae')
      .reduce((sum, e) => sum + e.valor, 0);

    const pixRescisao = list
      .filter((e) => e.metodo_pagamento === 'pix_rescisao' || (e.vinculado_rescisao && (e.metodo_pagamento === 'pix' || e.metodo_pagamento === 'dinheiro' || e.metodo_pagamento === 'debito')))
      .reduce((sum, e) => sum + e.valor, 0);

    const sortedList = [...list].sort((a, b) => a.data.localeCompare(b.data) || a.timestamp - b.timestamp);

    const countUber18_3087 = list.filter(
      (e) => e.data === '2026-10-18' && e.descricao.toLowerCase().includes('uber') && Math.abs(e.valor - 30.87) < 0.02
    ).length;

    return {
      pixSalario,
      cartaoRescisao,
      pixRescisao,
      totalGeral: pixSalario + cartaoRescisao + pixRescisao,
      count: list.length,
      sortedList,
      countUber18_3087,
    };
  }, [expenses, selectedMonth]);

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

  // Garante sincronização imediata no navegador caso o storage local anterior estivesse vazio
  useEffect(() => {
    const saved = localStorage.getItem('sentinela_expenses_v2');
    if (!saved || saved === '[]') {
      setExpenses(DEFAULT_INITIAL_EXPENSES);
      localStorage.setItem('sentinela_expenses_v2', JSON.stringify(DEFAULT_INITIAL_EXPENSES));
    }
  }, []);

  const handleRestoreDefaultExpenses = () => {
    sound.playSuccess();
    setExpenses(DEFAULT_INITIAL_EXPENSES);
    localStorage.setItem('sentinela_expenses_v2', JSON.stringify(DEFAULT_INITIAL_EXPENSES));
    showToast('📥 [DESPESAS_CARREGADAS] Abbey (R$ 63), Uber 18/10 (R$ 30,80) e Uber 21/10 (R$ 30,00) sincronizadas!');
  };

  const handleToggleVinculoRescisao = (id: string) => {
    sound.playTick();
    setExpenses((prev) => {
      const updated = prev.map((e) => {
        if (e.id === id) {
          const nextVal = !(e.vinculado_rescisao !== false);
          showToast(
            nextVal
              ? `🛡️ [VINCULADO À RESCISÃO] ${e.descricao} (R$ ${e.valor.toFixed(2)}) será pago com a verba rescisória!`
              : `💼 [DESVINCULADO] ${e.descricao} (R$ ${e.valor.toFixed(2)}) alocado para a receita mensal comum.`
          );
          return { ...e, vinculado_rescisao: nextVal };
        }
        return e;
      });
      localStorage.setItem('sentinela_expenses_v2', JSON.stringify(updated));
      return updated;
    });
  };

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

  // Meses disponíveis no banco de dados (Setembro, Outubro, Novembro e Dezembro / 2026)
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>(['2026-09', '2026-10', '2026-11', '2026-12']);
    if (selectedMonth) {
      monthSet.add(selectedMonth);
    }
    expenses.forEach((e) => {
      if (e.data && e.data.length >= 7) {
        monthSet.add(e.data.substring(0, 7));
      }
    });
    return Array.from(monthSet).sort();
  }, [expenses, selectedMonth]);

  // Compute Moving Ceiling & Daily Burn Rate para o mês selecionado
  const metrics: BurnRateMetrics = useMemo(() => {
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const isCurrentMonth = selYear === currentYear && selMonth === currentMonthNum;
    const isFutureMonth = selYear > currentYear || (selYear === currentYear && selMonth > currentMonthNum);

    let refDate: Date;
    if (isCurrentMonth) {
      refDate = now;
    } else if (isFutureMonth) {
      // Para meses futuros (ex: Novembro e Dezembro), o mês começa no dia 1 com todos os dias disponíveis
      refDate = new Date(selYear, selMonth - 1, 1);
    } else {
      // Para meses passados já fechados, considera o fechamento no último dia do mês
      const lastDayOfPastMonth = new Date(selYear, selMonth, 0).getDate();
      refDate = new Date(selYear, selMonth - 1, lastDayOfPastMonth);
    }

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

  // Atualizar valor da rescisão quando o usuário receber na sexta dia 30
  const handleUpdateRescisao = (valor: number) => {
    setSettings((prev) => ({
      ...prev,
      reserva_emergencia: valor, // A reserva de emergência É a rescisão!
      rescisao_prevista: {
        data_prevista: '2026-10-30',
        valor,
        status: 'recebido',
        observacao: 'Verba rescisória informada pelo usuário (Reserva de Emergência constituída)',
      },
    }));
    showToast(`✓ [RESERVA_CONSTITUÍDA] Reserva de Emergência criada com R$ ${valor.toFixed(2)} da rescisão!`);
  };

  // Liquidar ou reabrir status da fatura de 23/11 (Etapa 1 da transição com a rescisão)
  const handleToggleFaturaNovembroPaga = (paga: boolean) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        fatura_novembro_paga: paga,
        fatura_novembro_paga_em: paga ? new Date().toISOString().split('T')[0] : undefined,
      };
      localStorage.setItem('sentinela_settings', JSON.stringify(next));
      return next;
    });
    if (paga) {
      showToast('✓ [FATURA_23/11_QUITADA] Fatura do cartão de 23/11 liquidada integralmente com a rescisão!');
    } else {
      showToast('⚠️ [FATURA_23/11_REABERTA] Status de liquidação da fatura de 23/11 reaberto.');
    }
  };

  // Ajustar se houve 1 corrida de 30,87 (Total R$ 589,34) ou 2 corridas de 30,87 (Total R$ 620,21)
  const handleSetUber18Count = (count: 1 | 2) => {
    sound.playSuccess();
    setExpenses((prev) => {
      let filteredWithoutUber18_3087 = prev.filter(
        (e) => !(e.data === '2026-10-18' && e.descricao.toLowerCase().includes('uber') && Math.abs(e.valor - 30.87) < 0.02)
      );

      const baseUber18_3087: ExpenseRecord = {
        id: 'exp_uber18_default',
        data: '2026-10-18',
        descricao: 'Uber',
        valor: 30.87,
        metodo_pagamento: 'cartao_credito',
        categoria: 'transporte',
        is_impulsive: false,
        timestamp: 1729267200000 + 1,
        vinculado_rescisao: true,
        fatura_mes: '2026-11',
        fatura_vencimento: '2026-11-23',
      };

      const itemsToAdd = [baseUber18_3087];
      if (count === 2) {
        itemsToAdd.push({
          ...baseUber18_3087,
          id: 'exp_uber18_3087_segunda',
          descricao: 'Uber (2ª Corrida 18/10)',
          timestamp: 1729267200000 + 2,
        });
      }

      const updated = [...filteredWithoutUber18_3087, ...itemsToAdd].sort((a, b) => b.data.localeCompare(a.data) || b.timestamp - a.timestamp);
      localStorage.setItem('sentinela_expenses_v2', JSON.stringify(updated));
      return updated;
    });

    if (count === 1) {
      showToast('✓ [TOTAL: R$ 589,34] Definido para 10 compras (1 corrida Uber 18/10 de R$ 30,87).');
    } else {
      showToast('✓ [TOTAL: R$ 620,21] Definido para 11 compras (2 corridas Uber 18/10 de R$ 30,87).');
    }
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
              onOpenReport={() => setActiveTab('report')}
            />

            {/* =========================================================================
                TABELA TOTAL DOS VALORES :: TELA DE CIMA (ALTA VISIBILIDADE)
                ========================================================================= */}
            <div className="bg-[#030814] border-2 border-[#00f0ff] p-4 sm:p-5 font-mono shadow-2xl shadow-[#00f0ff]/15 space-y-4">
              
              {/* BANNER PRINCIPAL COM O TOTAL GERAL DO SISTEMA */}
              <div className="bg-[#02050b] border-2 border-[#ffe600] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl shadow-[#ffe600]/15">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-[#ffe600] text-black font-black text-xs uppercase tracking-wider">
                      ⚡ TABELA TOTAL DE VALORES DO SISTEMA
                    </span>
                    <span className="text-xs text-[#00ff66] font-bold">
                      {cockpitReportData.count} LANÇAMENTOS AUDITADOS
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                    CONSOLIDAÇÃO GERAL DE OUTUBRO/2026
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Soma de todos os gastos (Cartão 23/11 pago com a rescisão + Pix-Salário + Pix-Rescisão)
                  </p>
                </div>

                <div className="w-full md:w-auto bg-black/95 px-5 py-3 border-2 border-[#ffe600] text-right flex flex-row md:flex-col items-center md:items-end justify-between gap-2 neon-glow-yellow">
                  <span className="text-[11px] text-[#ffe600] font-bold uppercase tracking-widest block">
                    TOTAL GERAL DE GASTOS:
                  </span>
                  <span className="text-3xl sm:text-4xl font-black text-[#ffe600] tracking-tight block">
                    {formatCurrency(cockpitReportData.totalGeral, !showValues)}
                  </span>
                </div>
              </div>

              {/* TABELA ESTRUTURADA DE TOTAIS POR CATEGORIA (TELA DE CIMA) */}
              <div className="overflow-x-auto border border-neutral-700 bg-black/80">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-700 bg-neutral-900/90 text-neutral-300 font-bold uppercase text-[11px]">
                      <th className="py-2.5 px-3">MÉTODO / TABELA</th>
                      <th className="py-2.5 px-3 text-right">VALOR TOTAL</th>
                      <th className="py-2.5 px-3">VENCIMENTO / STATUS</th>
                      <th className="py-2.5 px-3">FONTE DE QUITAÇÃO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {/* Linha 1: Tabela 1: Valor Pix Salário */}
                    <tr className="hover:bg-neutral-900/40">
                      <td className="py-2.5 px-3 font-bold text-[#00ff66] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66] inline-block" />
                        <span>🟢 TABELA 1: VALOR PIX SALÁRIO</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-base text-[#00ff66] font-mono">
                        {formatCurrency(cockpitReportData.pixSalario, !showValues)}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300">
                        <span className="px-1.5 py-0.5 bg-[#00ff66]/15 text-[#00ff66] border border-[#00ff66]/40 text-[10px] font-bold">
                          ✓ SALDO INTACTO (R$ 200 LIVRE)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">
                        Sobra da renda ordinária mensal
                      </td>
                    </tr>

                    {/* Linha 2: Tabela 2: Valor Pix Cartão - Total */}
                    <tr className="hover:bg-neutral-900/40 bg-[#001726]/40">
                      <td className="py-2.5 px-3 font-bold text-[#00f0ff] flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-[#00f0ff]" />
                        <span>🔵 TABELA 2: VALOR PIX CARTÃO - TOTAL</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-base text-[#00f0ff] font-mono">
                        {formatCurrency(cockpitReportData.cartaoRescisao, !showValues)}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300">
                        <span className="px-1.5 py-0.5 bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 text-[10px] font-bold">
                          FATURA VENCE EM 23/11 ({cockpitReportData.count} COMPRAS)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#00f0ff] font-bold">
                        100% paga com o dinheiro da Rescisão
                      </td>
                    </tr>

                    {/* Linha 3: Tabela 3: Valor Pix - Rescisão */}
                    <tr className="hover:bg-neutral-900/40">
                      <td className="py-2.5 px-3 font-bold text-[#c084fc] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#bd00ff] inline-block" />
                        <span>🟣 TABELA 3: VALOR PIX - RESCISÃO</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-base text-[#c084fc] font-mono">
                        {formatCurrency(cockpitReportData.pixRescisao, !showValues)}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300">
                        <span className="px-1.5 py-0.5 bg-[#bd00ff]/20 text-[#c084fc] border border-[#bd00ff]/40 text-[10px] font-bold">
                          SEXTA 30/10 (HOMOLOGAÇÃO)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">
                        Débito direto da conta rescisória
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#ffe600] bg-[#120f02] font-bold">
                      <td className="py-3 px-3 uppercase text-xs font-black text-[#ffe600]">
                        ⚡ TOTAL GERAL DE VALORES:
                      </td>
                      <td className="py-3 px-3 text-right font-black font-mono text-xl text-[#ffe600]">
                        {formatCurrency(cockpitReportData.totalGeral, !showValues)}
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-xs text-neutral-300">
                        {cockpitReportData.count} compras no cartão • Fatura Outubro já quitada • Fatura Novembro coberta pela rescisão
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* PAINEL DE CONFERÊNCIA: R$ 589,34 (1 corrida Uber 18/10) vs R$ 620,21 (2 corridas Uber 18/10) */}
              <div className="bg-[#0b0c16] border-2 border-[#00f0ff]/50 p-3 text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-[#00f0ff] text-black font-black text-[10px] uppercase">
                      CONFERÊNCIA DE VALORES
                    </span>
                    <span className="text-white font-bold">
                      Diferença entre R$ 589,34 e R$ 620,21 (R$ 30,87 no Uber de 18/10):
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSetUber18Count(1)}
                      className={`px-3 py-1.5 text-xs font-black uppercase border transition-all cursor-pointer ${
                        cockpitReportData.countUber18_3087 <= 1
                          ? 'border-[#00ff66] bg-[#00ff66] text-black shadow-md shadow-[#00ff66]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white'
                      }`}
                      title="1 corrida de R$ 30,87 no dia 18/10 (Uber corrigido dos R$ 30,80 anteriores)"
                    >
                      {cockpitReportData.countUber18_3087 <= 1 ? '✓ R$ 589,34 ATIVO (10 ITENS)' : 'USAR R$ 589,34 (10 ITENS)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetUber18Count(2)}
                      className={`px-3 py-1.5 text-xs font-black uppercase border transition-all cursor-pointer ${
                        cockpitReportData.countUber18_3087 > 1
                          ? 'border-[#ffe600] bg-[#ffe600] text-black shadow-md shadow-[#ffe600]/20'
                          : 'border-neutral-700 bg-black text-neutral-400 hover:text-white'
                      }`}
                      title="2 corridas de R$ 30,87 no dia 18/10"
                    >
                      {cockpitReportData.countUber18_3087 > 1 ? '✓ R$ 620,21 ATIVO (11 ITENS)' : 'USAR R$ 620,21 (11 ITENS)'}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-300">
                  {cockpitReportData.countUber18_3087 <= 1 ? (
                    <span>
                      • <strong>R$ 589,34</strong>: Considera <strong>1 corrida Uber no dia 18/10 de R$ 30,87</strong> (ajustada dos R$ 30,80 iniciais) + Uber 18/10 de R$ 35,88 + Denis Beulmont R$ 341 + Abbey R$ 63 + demais Ubers e Chopps.
                    </span>
                  ) : (
                    <span>
                      • <strong>R$ 620,21</strong>: Considera <strong>2 corridas separadas de R$ 30,87 no dia 18/10</strong> (+ R$ 30,87 adicionados aos R$ 589,34).
                    </span>
                  )}
                </p>
              </div>

              {/* BOTÕES DE AÇÃO E EXPANSÃO DA LISTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-[#00f0ff]/20">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTick();
                    setMobileReportExpanded(!mobileReportExpanded);
                  }}
                  className="px-3 py-2 bg-[#00f0ff]/20 hover:bg-[#00f0ff]/30 border border-[#00f0ff] text-[#00f0ff] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-all"
                >
                  <span>{mobileReportExpanded ? '▲ RECOLHER LISTA DETALHADA' : `▼ VER LISTA DETALHADA (${cockpitReportData.count} LANÇAMENTOS COM VALORES EM DESTAQUE)`}</span>
                  {mobileReportExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playTick();
                    setActiveTab('report');
                  }}
                  className="px-4 py-2 bg-[#00ff66] hover:bg-[#00cc52] text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#00ff66]/20 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>ABRIR RELATÓRIO COMPLETO COM TODAS AS AUDITORIAS (PDF)</span>
                </button>
              </div>

              {/* LISTA EXPANDÍVEL COM OS 10 ITENS EM FORMATO DE ALTA VISIBILIDADE */}
              {mobileReportExpanded && (
                <div className="pt-3 border-t border-neutral-800 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-neutral-300 font-bold px-1">
                    <span className="uppercase text-[#00f0ff]">Lançamentos do Cartão (Ordem Cronológica 17/10 → 23/10):</span>
                    <span className="text-[#ffe600] font-black font-mono text-sm">Total: {formatCurrency(cockpitReportData.totalGeral, !showValues)}</span>
                  </div>

                  <div className="divide-y divide-neutral-800 border-2 border-neutral-700 bg-black/90">
                    {cockpitReportData.sortedList.map((e) => (
                      <div key={e.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-[#00f0ff]/10 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.2 bg-neutral-800 text-[#00f0ff] font-mono text-[11px] font-bold">
                              {e.data}
                            </span>
                            <span className="font-black text-white text-sm">
                              {e.descricao}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                            <span className="text-[#00f0ff] font-bold">💳 CARTÃO (RESCISÃO 23/11)</span>
                            <span>•</span>
                            <span className={e.is_impulsive ? 'text-[#ff0055] font-bold' : 'text-[#00ff66] font-bold'}>
                              {e.is_impulsive ? 'Lazer / Impulsivo' : 'Essencial / Transporte'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="font-mono font-black text-lg sm:text-xl text-[#ffe600] bg-black px-2.5 py-1 border border-[#ffe600]/60 block shadow-md">
                            {formatCurrency(e.valor, !showValues)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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

            {/* Cronograma de Transição do Sistema: Etapa 1 (23/11 - Cartão) & Etapa 2 (05/12 - Salário) */}
            <SystemTransitionTracker
              settings={settings}
              expenses={expenses}
              selectedMonth={selectedMonth}
              showValues={showValues}
              onToggleFaturaNovembroPaga={handleToggleFaturaNovembroPaga}
              onSelectMonth={setSelectedMonth}
              onUpdateRescisao={handleUpdateRescisao}
            />

            {/* Aviso Proeminente: Saldo Pix Real Zerado (Sem entrada real de dinheiro) */}
            {!metrics.tem_saldo_real && (
              <div className="bg-[#1a0209] border-2 border-[#ff0055] p-3 text-[#ff0055] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl shadow-[#ff0055]/15 font-mono">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#ff0055] flex-shrink-0 animate-pulse" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-[#ff0055] text-black font-black text-[10px] uppercase">
                        SALDO PIX REAL = R$ 0,00
                      </span>
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        Sem saldo: gastos vão para o cartão
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 mt-0.5">
                      {metrics.motivo_sem_saldo}. O saldo livre e o teto diário permanecem em R$ 0,00 até a entrada real do dinheiro.
                    </p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-[#2b040f] border border-[#ff0055]/60 text-[10px] text-[#ff3366] font-bold uppercase flex-shrink-0">
                  REGRA DE PROTEÇÃO ATIVA
                </div>
              </div>
            )}

            {/* ALERTA CRÍTICO DE FLUXO DE CAIXA: Faturas a Vencer > Dinheiro que vai entrar antes do vencimento */}
            {metrics.alerta_descompasso?.tem_descompasso && (
              <div className="bg-[#19030b] border-2 border-[#ff0055] p-3.5 shadow-2xl shadow-[#ff0055]/20 font-mono space-y-2.5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#ff0055]/30">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#ff0055] text-black font-black text-[10px] tracking-wider uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-black animate-pulse" />
                      <span>[ ALERTA DE FLUXO DE CAIXA: FATURA SUPERA ENTRADAS ]</span>
                    </span>
                    <span className="text-[10px] text-[#ff0055] font-bold">
                      VENCIMENTO DIA {metrics.alerta_descompasso.dia_vencimento}
                    </span>
                  </div>
                  <div className="px-2 py-0.5 bg-[#ff0055]/20 border border-[#ff0055] text-[#ff0055] text-[10px] font-bold uppercase tracking-wider">
                    DÉFICIT NO VENCIMENTO: -{formatCurrency(metrics.alerta_descompasso.deficit_vencimento, !showValues)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-[#0b0105] border border-[#ff0055]/40 p-2.5">
                    <span className="text-[10px] text-neutral-400 block uppercase">Fatura a Vencer (Dia {metrics.alerta_descompasso.dia_vencimento}):</span>
                    <span className="text-xl font-black text-[#ff0055]">
                      {formatCurrency(metrics.alerta_descompasso.total_faturas_a_vencer, !showValues)}
                    </span>
                    <span className="text-[9px] text-neutral-500 block mt-0.5">
                      {metrics.alerta_descompasso.dias_ate_vencimento}d até o vencimento
                    </span>
                  </div>
                  <div className="bg-[#0b0105] border border-[#ff0055]/40 p-2.5">
                    <span className="text-[10px] text-neutral-400 block uppercase">Entradas até Vencimento:</span>
                    <span className="text-xl font-black text-[#ffe600]">
                      {formatCurrency(metrics.alerta_descompasso.entradas_antes_vencimento, !showValues)}
                    </span>
                    <span className="text-[9px] text-neutral-500 block mt-0.5">
                      Saldo em mãos + agendado
                    </span>
                  </div>
                  <div className="bg-[#0b0105] border border-[#ff0055]/40 p-2.5">
                    <span className="text-[10px] text-neutral-400 block uppercase">Próxima Entrada Prevista:</span>
                    <span className="text-sm font-bold text-neutral-200 block">
                      {metrics.alerta_descompasso.proxima_entrada_nome || 'Dinheiro'}: {metrics.alerta_descompasso.proxima_entrada_data ? `Dia ${metrics.alerta_descompasso.proxima_entrada_data.split('-')[2]}` : 'Após vencimento'}
                    </span>
                    <span className="text-[10px] text-[#ff0055] font-bold block mt-0.5">
                      {metrics.alerta_descompasso.dias_atraso_entrada ? `⚠️ ${metrics.alerta_descompasso.dias_atraso_entrada} dias APÓS a fatura vencer!` : 'Sem entrada antes da fatura'}
                    </span>
                  </div>
                </div>

                <div className="bg-[#24030d] border-l-2 border-[#ff0055] p-2.5 text-[11px] text-neutral-200 space-y-1">
                  <p className="font-bold text-[#ff4d79] leading-snug">
                    {metrics.alerta_descompasso.mensagem_alerta}
                  </p>
                  <p className="text-[10px] text-neutral-300 leading-snug">
                    💡 <strong className="text-white">Ação Preventiva:</strong> {metrics.alerta_descompasso.recomendacao}
                  </p>
                </div>

                {/* Bloco de Execução da Ponte da Rescisão com a Reserva */}
                {metrics.alerta_descompasso.plano_ponte && (
                  <div className="bg-[#120422] border-2 border-[#c084fc] p-3 text-xs space-y-2 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-[#c084fc]/40">
                      <span className="font-bold text-[#c084fc] flex items-center gap-1.5 uppercase text-[10px]">
                        <span>🛡️</span>
                        <span>PLANO EXECUTIVO: PONTE DA RESCISÃO (ZERO JUROS DE CARTÃO)</span>
                      </span>
                      <span className="text-[10px] text-[#00ff66] font-bold">
                        RESERVA DE R$ {formatCurrency(settings.reserva_emergencia, !showValues)} DISPONÍVEL
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-black/60 border border-[#00ff66]/50 p-2 space-y-1">
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#00ff66] text-black font-black uppercase inline-block">
                          PASSO 1: DIA {metrics.alerta_descompasso.dia_vencimento} (VENCIMENTO)
                        </span>
                        <p className="text-neutral-200 leading-tight">
                          Pague <strong>{formatCurrency(metrics.alerta_descompasso.plano_ponte.valor_fatura, !showValues)}</strong> da fatura do cartão utilizando temporariamente a Reserva de Emergência.
                        </p>
                        <p className="text-[10px] text-[#00ff66] font-bold">
                          ✓ Evita juros rotativos de 450% a.a. e multa de atraso.
                        </p>
                      </div>

                      <div className="bg-black/60 border border-[#c084fc]/50 p-2 space-y-1">
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#c084fc] text-black font-black uppercase inline-block">
                          PASSO 2: DIA {metrics.alerta_descompasso.plano_ponte.dia_recomposicao} (RESCISÃO)
                        </span>
                        <p className="text-neutral-200 leading-tight">
                          Ao cair a rescisão (~{formatCurrency(metrics.alerta_descompasso.plano_ponte.rescisao_estimada, !showValues)}), recomponha <strong>{formatCurrency(metrics.alerta_descompasso.plano_ponte.valor_fatura, !showValues)}</strong> na Reserva (retornando a R$ {formatCurrency(metrics.alerta_descompasso.plano_ponte.reserva_original, !showValues)}).
                        </p>
                        <p className="text-[10px] text-[#00f0ff] font-bold">
                          ✓ Saldo livre restante da rescisão: <strong>{formatCurrency(metrics.alerta_descompasso.plano_ponte.rescisao_restante, !showValues)}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Top Metric Cards: Renda, Teto Móvel Diário, Saldo Livre */}
            <MetricCards 
              metrics={metrics} 
              settings={settings} 
              debts={debts} 
              expenses={expenses}
              selectedMonth={selectedMonth}
              showValues={showValues} 
            />

            {/* Atalho Rápido para a Tabela de Valores (Livro-Razão) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-[#02131d] border-2 border-[#00f0ff] shadow-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2.5 h-2.5 bg-[#00ff66] animate-pulse" />
                <span className="text-xs font-black text-[#00f0ff] tracking-wider uppercase">
                  📋 TABELA DE VALORES: {expenses.length} GASTOS GRAVADOS NO BANCO
                </span>
                <span className="text-[11px] text-neutral-300">
                  (Abbey R$ 63,00, Uber R$ 30,80...)
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('tabela-valores');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 bg-black border border-neutral-700 hover:border-[#00f0ff] text-[#e0f2fe] hover:text-[#00f0ff] text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  ↓ ROLAR ATÉ TABELA
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('table')}
                  className="px-3.5 py-1.5 bg-[#00f0ff] hover:bg-white text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#00f0ff]/20 active:scale-95"
                >
                  ⛶ ABRIR ABA DA TABELA
                </button>
              </div>
            </div>

            {/* Raw Input Terminal (NLP / Regex Parser) com suporte a CLEAR e RESET */}
            <RawInputTerminal
              inputVal={terminalInput}
              setInputVal={setTerminalInput}
              onRegisterExpense={handleRegisterExpense}
              onRequestFrictionCheck={handleFrictionCheck}
              expenses={expenses}
              onBatchRegister={(newExps) => handleImportBatchExpenses(newExps, selectedMonth)}
              temSaldoReal={metrics.tem_saldo_real}
              motivoSemSaldo={metrics.motivo_sem_saldo}
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
                {/* Cofre de Emergência: constituído pela rescisão (a descobrir na sexta dia 30) */}
                <EmergencyVault
                  balance={settings.reserva_emergencia}
                  rescisaoPrevista={settings.rescisao_prevista}
                  onEmergencyWithdrawal={handleEmergencyWithdrawal}
                  onUpdateRescisao={handleUpdateRescisao}
                  showValues={showValues}
                />
              </div>
            </div>

            {/* Audit & Transaction Ledger com filtro por mês selecionado e modo tela cheia */}
            <div id="tabela-valores" className="scroll-mt-24">
              <AuditTable
                expenses={expenses}
                onDeleteExpense={handleDeleteExpense}
                selectedMonth={selectedMonth}
                showValues={showValues}
                onRestoreDefaults={handleRestoreDefaultExpenses}
                onOpenReport={() => setActiveTab('report')}
                onToggleVinculoRescisao={handleToggleVinculoRescisao}
              />
            </div>
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

        {/* TAB 5: TABELA DE VALORES DEDICADA (LIVRO-RAZÃO) */}
        {activeTab === 'table' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-[#02131d] border-2 border-[#00f0ff] shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#00ff66] animate-pulse" />
                  <span className="text-sm font-black text-[#00f0ff] uppercase tracking-wider">
                    📋 TABELA DE VALORES & AUDITORIA DE TRANSAÇÕES
                  </span>
                </div>
                <p className="text-xs text-neutral-300 mt-1">
                  Visualização dedicada do Livro-Razão com todas as despesas salvas ({expenses.length} lançamentos: Abbey, Uber, etc.).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('cockpit')}
                  className="px-3.5 py-1.5 bg-black hover:bg-neutral-900 border border-neutral-600 text-white text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  ← VOLTAR AO COCKPIT
                </button>
              </div>
            </div>

            <AuditTable
              expenses={expenses}
              onDeleteExpense={handleDeleteExpense}
              selectedMonth={selectedMonth}
              showValues={showValues}
              onRestoreDefaults={handleRestoreDefaultExpenses}
              onOpenReport={() => setActiveTab('report')}
              onToggleVinculoRescisao={handleToggleVinculoRescisao}
            />
          </div>
        )}

        {/* TAB 6: CENTRAL DE FECHAMENTO & RELATÓRIOS FINANCEIROS */}
        {activeTab === 'report' && (
          <div className="animate-in fade-in duration-150">
            <MonthlyReportView
              expenses={expenses}
              settings={settings}
              debts={debts}
              metrics={metrics}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
              availableMonths={availableMonths}
              showValues={showValues}
              onBackToCockpit={() => setActiveTab('cockpit')}
            />
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
