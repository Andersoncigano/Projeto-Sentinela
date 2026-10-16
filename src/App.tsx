/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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

import {
  ExpenseRecord,
  DebtRecord,
  SystemSettings,
  BurnRateMetrics,
} from './types/sentinela';
import { SentinelaBurnEngine } from './lib/burnEngine';
import { sound } from './lib/sound';

const DEFAULT_SETTINGS: SystemSettings = {
  renda_mensal: 850.0,
  reserva_emergencia: 1400.0,
  horas_trabalho_mes: 88.0, // PCD Meio Período (~4h/dia * 22 dias)
  custos_fixos_essenciais: 250.0,
  meta_poupanca_minima: 50.0,
};

const DEFAULT_DEBTS: DebtRecord[] = [
  {
    id: 'debt_mae_1',
    credor: 'Mãe (Fatura do Cartão Emprestado)',
    valor_total: 320.0,
    valor_pago: 120.0,
    meta_amortizacao_mes: 100.0,
    prioridade: 1,
    observacao: 'Compromisso de honra familiar compulsório',
  },
];

const getInitialExpenses = (): ExpenseRecord[] => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');

  return [
    {
      id: 'seed_1',
      data: `${y}-${m}-02`,
      descricao: 'Farmácia - Remédio de uso contínuo',
      valor: 35.0,
      metodo_pagamento: 'pix',
      categoria: 'saude',
      is_impulsive: false,
      timestamp: Date.now() - 86400000 * 5,
    },
    {
      id: 'seed_2',
      data: `${y}-${m}-04`,
      descricao: 'Passagem Ônibus / Vale Transporte',
      valor: 22.0,
      metodo_pagamento: 'dinheiro',
      categoria: 'transporte',
      is_impulsive: false,
      timestamp: Date.now() - 86400000 * 4,
    },
    {
      id: 'seed_3',
      data: `${y}-${m}-07`,
      descricao: 'Lanche iFood Delivery Combo',
      valor: 45.0,
      metodo_pagamento: 'pix',
      categoria: 'alimentacao_impulsiva',
      is_impulsive: true,
      timestamp: Date.now() - 86400000 * 2,
    },
  ];
};

export default function App() {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('sentinela_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [debts, setDebts] = useState<DebtRecord[]>(() => {
    const saved = localStorage.getItem('sentinela_debts');
    return saved ? JSON.parse(saved) : DEFAULT_DEBTS;
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem('sentinela_expenses');
    return saved ? JSON.parse(saved) : getInitialExpenses();
  });

  const [activeTab, setActiveTab] = useState<'cockpit' | 'python_code' | 'simulator' | 'nudge_manual'>('cockpit');
  const [isMuted, setIsMuted] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [pendingFrictionExpense, setPendingFrictionExpense] = useState<ExpenseRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('sentinela_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('sentinela_debts', JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem('sentinela_expenses', JSON.stringify(expenses));
  }, [expenses]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Compute Moving Ceiling & Daily Burn Rate
  const metrics: BurnRateMetrics = SentinelaBurnEngine.calculateMetrics(
    settings,
    expenses,
    debts
  );

  const handleRegisterExpense = (record: ExpenseRecord) => {
    setExpenses((prev) => [record, ...prev]);
    showToast(`✓ [LOG_OK] Gasto registrado: R$ ${record.valor.toFixed(2)} (${record.descricao}).`);
  };

  const handleFrictionCheck = (record: ExpenseRecord) => {
    setPendingFrictionExpense(record);
  };

  const handleAbortFriction = () => {
    sound.playSuccess();
    setPendingFrictionExpense(null);
    showToast('🛡️ [DEFESA_ATIVA] Compra abortada! Soberania e teto diário preservados.');
  };

  const handleConfirmFriction = (record: ExpenseRecord) => {
    sound.playFrictionAlert();
    setExpenses((prev) => [record, ...prev]);
    setPendingFrictionExpense(null);
    showToast(`⚠️ [OVERRIDE] Gasto impulsivo de R$ ${record.valor.toFixed(2)} computado sob penalidade.`);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast('✓ [RESTORE] Despesa eliminada. Teto Móvel Diário restaurado.');
  };

  const handleAmortizeDebt = (debtId: string, amount: number) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === debtId ? { ...d, valor_pago: d.valor_pago + amount } : d))
    );
    showToast(`✓ [ESCROW_AMORT] Amortização de R$ ${amount.toFixed(2)} à Mãe quitada!`);
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

  return (
    <div className="min-h-screen bg-[#030407] text-[#e0f2fe] flex flex-col font-mono selection:bg-[#00f0ff] selection:text-black relative">
      {/* CRT Scanline & Curved Vignette Overlays (Matches reference image terminal) */}
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
      />

      {/* Main Cockpit Space */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5 relative z-10">
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
            {/* Top Metric Cards */}
            <MetricCards metrics={metrics} settings={settings} debts={debts} />

            {/* Raw Input Terminal (NLP / Regex Parser) */}
            <RawInputTerminal
              onRegisterExpense={handleRegisterExpense}
              onRequestFrictionCheck={handleFrictionCheck}
            />

            {/* Grid: Debt Management & Emergency Vault */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <DebtManager
                  debts={debts}
                  metrics={metrics}
                  onAmortize={handleAmortizeDebt}
                  onAddDebt={handleAddDebt}
                />
              </div>
              <div className="lg:col-span-5">
                <EmergencyVault
                  balance={settings.reserva_emergencia}
                  onEmergencyWithdrawal={handleEmergencyWithdrawal}
                />
              </div>
            </div>

            {/* Audit & Transaction Ledger */}
            <AuditTable
              expenses={expenses}
              onDeleteExpense={handleDeleteExpense}
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

      {/* Behavioral Friction Modal (Cooling-off & Labor Loss conversion) */}
      <FrictionModal
        expense={pendingFrictionExpense}
        metrics={metrics}
        settings={settings}
        onAbort={handleAbortFriction}
        onConfirm={handleConfirmFriction}
      />

      {/* Footer */}
      <footer className="border-t border-[#141b2e] bg-[#020306] py-3 text-center text-[10px] text-neutral-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[#00f0ff]/70">// SISTEMA SENTINELA :: CYBERPUNK HUD EDITION</span>
          <span className="text-neutral-600">NUDGE THEORY • MOVING CEILING • STREAMLIT + SQLITE READY</span>
        </div>
      </footer>
    </div>
  );
}
