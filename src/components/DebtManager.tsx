import React, { useState } from 'react';
import { CreditCard, CheckCircle, Plus, HeartHandshake, ShieldCheck } from 'lucide-react';
import { DebtRecord, BurnRateMetrics } from '../types/sentinela';
import { sound } from '../lib/sound';

interface DebtManagerProps {
  debts: DebtRecord[];
  metrics: BurnRateMetrics;
  onAmortize: (debtId: string, amount: number) => void;
  onAddDebt: (debt: Omit<DebtRecord, 'id'>) => void;
}

export const DebtManager: React.FC<DebtManagerProps> = ({
  debts,
  metrics,
  onAmortize,
  onAddDebt,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCredor, setNewCredor] = useState('');
  const [newTotal, setNewTotal] = useState('');
  const [newMeta, setNewMeta] = useState('');

  const [amortInputs, setAmortInputs] = useState<Record<string, string>>({});

  const handleAmortizeSubmit = (debtId: string, maxVal: number) => {
    const val = parseFloat(amortInputs[debtId] || '0');
    if (isNaN(val) || val <= 0) return;
    const finalVal = Math.min(val, maxVal);

    sound.playSuccess();
    onAmortize(debtId, finalVal);
    setAmortInputs((prev) => ({ ...prev, [debtId]: '' }));
  };

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(newTotal);
    const meta = parseFloat(newMeta);
    if (!newCredor.trim() || isNaN(total) || total <= 0) return;

    onAddDebt({
      credor: newCredor.trim(),
      valor_total: total,
      valor_pago: 0,
      meta_amortizacao_mes: isNaN(meta) ? 50 : meta,
      prioridade: 1,
      observacao: 'Compromisso financeiro prioritário',
    });

    setNewCredor('');
    setNewTotal('');
    setNewMeta('');
    setShowAddForm(false);
    sound.playSuccess();
  };

  return (
    <div className="border border-[#00f0ff]/50 bg-[#04060d]/95 p-4 shadow-xl font-mono">
      {/* Header Tag */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#00f0ff]/20">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#00f0ff] text-black font-extrabold text-[11px] tracking-wider uppercase">
          <CreditCard className="w-3.5 h-3.5 text-black" />
          <span>[ GESTÃO DE PASSIVOS // DÍVIDA COM TERCEIROS ]</span>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-2.5 py-1 border border-[#00f0ff] bg-black text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black text-xs font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>{showAddForm ? 'FECHAR' : '+ NOVO PASSIVO'}</span>
        </button>
      </div>

      {/* Escrow Banner */}
      <div className="my-3 p-2.5 bg-black border border-[#00f0ff]/40 text-xs text-[#00f0ff] flex items-start gap-2.5">
        <HeartHandshake className="w-4 h-4 text-[#00f0ff] flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-[11px]">
          <p className="font-bold text-[#00f0ff] uppercase">// ESCROW DE HONRA FAMILIAR ATIVO</p>
          <p className="text-neutral-300">
            Retenção de <strong>R$ {metrics.amortizacao_obrigatoria.toFixed(2)}</strong> sequestrada do orçamento no dia 1 do mês. O teto diário não libera supérfluos enquanto o passivo com a mãe estiver pendente.
          </p>
        </div>
      </div>

      {/* Add Debt Form */}
      {showAddForm && (
        <form onSubmit={handleCreateDebt} className="mb-4 p-3 bg-black border border-[#00f0ff] text-xs space-y-3">
          <h4 className="font-bold text-[#00f0ff] uppercase">// Cadastrar Novo Passivo</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-neutral-400 block mb-1 text-[10px]">CREDOR / CARTÃO</label>
              <input
                type="text"
                placeholder="Ex: Mãe - Fatura Cartão"
                value={newCredor}
                onChange={(e) => setNewCredor(e.target.value)}
                className="w-full bg-[#0a0f1d] border border-neutral-700 p-2 text-[#e0f2fe]"
                required
              />
            </div>
            <div>
              <label className="text-neutral-400 block mb-1 text-[10px]">VALOR TOTAL (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 320.00"
                value={newTotal}
                onChange={(e) => setNewTotal(e.target.value)}
                className="w-full bg-[#0a0f1d] border border-neutral-700 p-2 text-[#e0f2fe]"
                required
              />
            </div>
            <div>
              <label className="text-neutral-400 block mb-1 text-[10px]">META MENSAL (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 100.00"
                value={newMeta}
                onChange={(e) => setNewMeta(e.target.value)}
                className="w-full bg-[#0a0f1d] border border-neutral-700 p-2 text-[#e0f2fe]"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#00f0ff] text-black font-black uppercase"
            >
              SALVAR PASSIVO
            </button>
          </div>
        </form>
      )}

      {/* Debt List */}
      <div className="space-y-3">
        {debts.map((debt) => {
          const saldoDevedor = Math.max(0, debt.valor_total - debt.valor_pago);
          const percentPago = debt.valor_total > 0 ? (debt.valor_pago / debt.valor_total) * 100 : 100;
          const isQuitada = saldoDevedor <= 0;

          return (
            <div
              key={debt.id}
              className={`p-3.5 border transition-all ${
                isQuitada
                  ? 'bg-black border-[#00ff66]/40 opacity-70'
                  : 'bg-black border-neutral-800 hover:border-[#00f0ff]/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#e0f2fe] uppercase">
                    {debt.credor}
                  </span>
                  {isQuitada ? (
                    <span className="px-1.5 py-0.2 bg-[#00ff66] text-black text-[9px] font-black uppercase flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> QUITADA
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 bg-[#ff0055] text-black text-[9px] font-black uppercase">
                      PRIORIDADE_1
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-neutral-400">
                  <span>PAGO: </span>
                  <strong className="text-[#00ff66]">R$ {debt.valor_pago.toFixed(2)}</strong>
                  <span> / R$ {debt.valor_total.toFixed(2)}</span>
                </div>
              </div>

              {/* Stepped Cyber Progress Bar */}
              <div className="w-full bg-neutral-950 h-2 border border-neutral-800 overflow-hidden mb-2.5">
                <div
                  className={`h-full transition-all duration-500 ${
                    isQuitada ? 'bg-[#00ff66]' : 'bg-[#00f0ff]'
                  }`}
                  style={{ width: `${Math.min(100, percentPago)}%` }}
                />
              </div>

              {/* Amortization Action Row */}
              {!isQuitada && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-neutral-900 text-xs">
                  <div className="text-[11px] text-neutral-400">
                    DEVEDOR: <span className="text-[#ff0055] font-black">R$ {saldoDevedor.toFixed(2)}</span>
                    <span className="text-neutral-500 ml-2">(META MÊS: R$ {debt.meta_amortizacao_mes.toFixed(2)})</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      step="5"
                      min="1"
                      max={saldoDevedor}
                      placeholder="Valor R$"
                      value={amortInputs[debt.id] ?? ''}
                      onChange={(e) =>
                        setAmortInputs({ ...amortInputs, [debt.id]: e.target.value })
                      }
                      className="w-24 bg-[#0a0f1d] border border-neutral-700 p-1 text-[#e0f2fe] text-xs text-center"
                    />

                    <button
                      type="button"
                      onClick={() => handleAmortizeSubmit(debt.id, saldoDevedor)}
                      className="px-3 py-1 bg-[#00ff66] text-black font-black text-xs uppercase hover:bg-[#00f0ff] transition-all cursor-pointer"
                    >
                      AMORTIZAR
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
