import React, { useState } from 'react';
import { Lock, Unlock, AlertTriangle, ShieldAlert, CheckSquare, Square, Calendar, Sparkles } from 'lucide-react';
import { sound } from '../lib/sound';
import { formatCurrency } from '../lib/format';

interface EmergencyVaultProps {
  balance: number;
  rescisaoPrevista?: {
    data_prevista: string;
    valor?: number;
    status: 'aguardando_calculo' | 'recebido';
    observacao?: string;
  };
  onEmergencyWithdrawal: (amount: number, reason: string) => void;
  onUpdateRescisao?: (valor: number) => void;
  showValues?: boolean;
}

export const EmergencyVault: React.FC<EmergencyVaultProps> = ({
  balance,
  rescisaoPrevista,
  onEmergencyWithdrawal,
  onUpdateRescisao,
  showValues = true,
}) => {
  const [showBreachModal, setShowBreachModal] = useState(false);
  const [showRescisaoModal, setShowRescisaoModal] = useState(false);
  const [inputRescisao, setInputRescisao] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [checkedTerms, setCheckedTerms] = useState(false);

  const isHidden = !showValues;
  const isAguardando = !rescisaoPrevista || rescisaoPrevista.status !== 'recebido' || (rescisaoPrevista.valor ?? 0) <= 0;

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

  const handleSaveRescisao = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(inputRescisao.replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      sound.playSuccess();
      onUpdateRescisao?.(val);
      setShowRescisaoModal(false);
      setInputRescisao('');
    }
  };

  return (
    <div className="border border-[#c084fc]/60 bg-[#07030e]/95 p-4 shadow-xl font-mono">
      {/* Visual Seal Graphic */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#c084fc]/30">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#c084fc] text-black font-extrabold text-[11px] tracking-wider uppercase">
          <Lock className="w-3.5 h-3.5 text-black" />
          <span>[ COFRE DE EMERGÊNCIA // CONSTITUÍDO PELA RESCISÃO ]</span>
        </div>

        <div className="text-right">
          {isAguardando ? (
            <span className="text-lg font-black text-[#c084fc] tracking-tight block">
              {isHidden ? '••••••••' : 'A DEFINIR NA SEXTA (30/10)'}
            </span>
          ) : (
            <span className="text-xl font-black text-[#00ff66] tracking-tight block">
              {formatCurrency(balance, isHidden)}
            </span>
          )}
          <span className="text-[9px] text-neutral-400 uppercase tracking-widest block">
            {isAguardando ? 'AGUARDANDO DEPÓSITO DA RESCISÃO' : 'STATUS: LACRADO & BLINDADO'}
          </span>
        </div>
      </div>

      <div className="mt-3 p-3 bg-black border border-[#c084fc]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-xs text-neutral-300 space-y-1">
          <p className="font-bold text-[#c084fc] flex items-center gap-1.5 text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5 text-[#c084fc]" />
            // RESERVA DE EMERGÊNCIA = RESCISÃO TRABALHISTA
          </p>
          <p className="text-[11px] text-neutral-300 max-w-lg leading-relaxed">
            {isAguardando ? (
              <>
                A sua Reserva de Emergência <strong>será formada integralmente pela verba da rescisão</strong>. 
                O valor não é pré-fixado (não é R$ 3.800) — você saberá o valor oficial na <strong>sexta-feira, dia 30/10</strong>.
              </>
            ) : (
              <>
                Fundo de <strong>{formatCurrency(balance, isHidden)}</strong> constituído com a sua rescisão. 
                Isolado para extrema necessidade. Proibido para consumo dopaminérgico.
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onUpdateRescisao && (
            <button
              type="button"
              onClick={() => setShowRescisaoModal(true)}
              className="px-3 py-1.5 border border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66] hover:bg-[#00ff66] hover:text-black font-black text-xs uppercase transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              title="Informar ou ajustar o valor oficial da rescisão recebido na sexta-feira dia 30"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isAguardando ? 'INFORMAR RESCISÃO (SEXTA 30)' : 'AJUSTAR VALOR'}</span>
            </button>
          )}

          {!isAguardando && balance > 0 && (
            <button
              type="button"
              onClick={handleOpenBreach}
              className="px-3 py-1.5 border border-[#ff0055] bg-black text-[#ff0055] hover:bg-[#ff0055] hover:text-black font-black text-xs uppercase transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>QUEBRAR LACRE</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal para Informar o Valor da Rescisão na Sexta Dia 30 */}
      {showRescisaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0b0314] border-2 border-[#00ff66] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#00ff66]/40">
              <span className="text-xs font-black text-[#00ff66] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#00ff66]" />
                <span>// CONSTITUIR RESERVA DE EMERGÊNCIA (RESCISÃO)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowRescisaoModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Digite abaixo o valor líquido exato que caiu ou foi homologado na sua rescisão na sexta-feira (30/10). Esse montante constituirá automaticamente a sua <strong>Reserva de Emergência</strong> e dará cobertura à fatura do cartão que vence em 23/11.
            </p>

            <form onSubmit={handleSaveRescisao} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1 text-[10px] uppercase font-bold">
                  VALOR OFICIAL DA RESCISÃO (R$):
                </label>
                <input
                  type="text"
                  value={inputRescisao}
                  onChange={(e) => setInputRescisao(e.target.value)}
                  placeholder="Ex: 3500.00"
                  className="w-full bg-black border-2 border-[#00ff66] p-2.5 text-[#00ff66] font-mono text-base font-black focus:outline-none focus:ring-1 focus:ring-[#00ff66]"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRescisaoModal(false)}
                  className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white uppercase font-bold"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#00ff66] text-black font-black uppercase hover:bg-white transition-all cursor-pointer shadow-lg shadow-[#00ff66]/20"
                >
                  CONFIRMAR E BLINDAR COFRE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
