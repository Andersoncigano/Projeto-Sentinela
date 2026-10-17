import React, { useState } from 'react';
import { Lock, Unlock, AlertTriangle, ShieldAlert, CheckSquare, Square } from 'lucide-react';
import { sound } from '../lib/sound';
import { formatCurrency } from '../lib/format';

interface EmergencyVaultProps {
  balance: number;
  onEmergencyWithdrawal: (amount: number, reason: string) => void;
  showValues?: boolean;
}

export const EmergencyVault: React.FC<EmergencyVaultProps> = ({
  balance,
  onEmergencyWithdrawal,
  showValues = true,
}) => {
  const [showBreachModal, setShowBreachModal] = useState(false);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [checkedTerms, setCheckedTerms] = useState(false);

  const isHidden = !showValues;

  const handleOpenBreach = () => {
    sound.playFrictionAlert();
    setShowBreachModal(true);
  };

  const handleConfirmBreach = (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0 || !reason.trim() || !checkedTerms) return;

    sound.playFrictionAlert();
    onEmergencyWithdrawal(withdrawAmount, reason.trim());
    setShowBreachModal(false);
    setReason('');
    setAmount('');
  };

  return (
    <div className="border border-[#ffe600]/50 bg-[#070602]/95 p-4 shadow-xl font-mono">
      {/* Visual Seal Graphic */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#ffe600]/20">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#ffe600] text-black font-extrabold text-[11px] tracking-wider uppercase">
          <Lock className="w-3.5 h-3.5 text-black" />
          <span>[ COFRE DE EMERGÊNCIA // ICE BLINDADO ]</span>
        </div>

        <div className="text-right">
          <span className="text-xl font-black text-[#ffe600] tracking-tight block">
            {formatCurrency(balance, isHidden)}
          </span>
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest">
            {isHidden ? 'VALOR PROTEGIDO' : 'STATUS: INTOCÁVEL'}
          </span>
        </div>
      </div>

      <div className="mt-3 p-3 bg-black border border-[#ffe600]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-xs text-neutral-300 space-y-1">
          <p className="font-bold text-[#ffe600] flex items-center gap-1.5 text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5 text-[#ffe600]" />
            // LACRE CRIPTOGRÁFICO DE SOBREVIDA
          </p>
          <p className="text-[11px] text-neutral-400 max-w-lg leading-relaxed">
            Fundo de R$ 1.400,00 isolado para risco real de despejo ou emergência médica de urgência. Proibido para consumo dopaminérgico.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenBreach}
          className="px-3 py-1.5 border border-[#ff0055] bg-black text-[#ff0055] hover:bg-[#ff0055] hover:text-black font-black text-xs uppercase transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
        >
          <Unlock className="w-3.5 h-3.5" />
          <span>QUEBRAR LACRE</span>
        </button>
      </div>

      {/* Breach Modal */}
      {showBreachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#080204] border-2 border-[#ff0055] p-5 shadow-2xl neon-glow-pink space-y-4">
            <div className="flex items-center gap-2 text-[#ff0055] font-black text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span>// PROTOCOLO DE VIOLAÇÃO DO COFRE DE CONTINGÊNCIA</span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Você está abrindo o lacre do seu único escudo de sobrevivência. Toda retirada de emergência ficará registrada nos logs do sistema.
            </p>

            <form onSubmit={handleConfirmBreach} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1 text-[10px]">VALOR DO SAQUE (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ex: 150.00"
                  className="w-full bg-black border border-neutral-700 p-2 text-[#e0f2fe]"
                  required
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 text-[10px]">
                  JUSTIFICATIVA DE EXTREMA URGÊNCIA DE VIDA/SAÚDE:
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o risco iminente de saúde ou moradia..."
                  className="w-full bg-black border border-neutral-700 p-2 text-[#e0f2fe]"
                  required
                />
              </div>

              <div
                onClick={() => setCheckedTerms(!checkedTerms)}
                className="flex items-start gap-2 cursor-pointer p-2 bg-black border border-neutral-800"
              >
                {checkedTerms ? (
                  <CheckSquare className="w-4 h-4 text-[#ff0055] flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-600 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-[11px] text-neutral-300">
                  Declaro sob minha consciência que esta retirada não é para delivery, jogos ou compras de impulso.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBreachModal(false)}
                  className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white uppercase font-bold"
                >
                  CANCELAR // PROTEGER
                </button>
                <button
                  type="submit"
                  disabled={!checkedTerms || !reason.trim() || !amount}
                  className="px-4 py-1.5 bg-[#ff0055] text-black font-black uppercase hover:bg-white disabled:opacity-30"
                >
                  CONFIRMAR SAQUE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
