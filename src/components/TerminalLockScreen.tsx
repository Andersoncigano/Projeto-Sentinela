import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, AlertTriangle, Key, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { sound } from '../lib/sound';
import { hashPin } from '../lib/privacy';

interface TerminalLockScreenProps {
  pinHash: string;
  onUnlock: () => void;
  onPanicPurge: () => void;
}

export const TerminalLockScreen: React.FC<TerminalLockScreenProps> = ({
  pinHash,
  onUnlock,
  onPanicPurge,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);

  // Escutar teclas numéricas do teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPanicConfirm) return;

      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 6) {
          sound.playTick();
          setPin((prev) => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        sound.playTick();
        setPin((prev) => prev.slice(0, -1));
        setErrorMsg(null);
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          handleCheckPin();
        }
      } else if (e.key === 'Escape') {
        setPin('');
        setErrorMsg(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, showPanicConfirm]);

  const handleKeyClick = (digit: string) => {
    if (pin.length < 6) {
      sound.playTick();
      setPin((prev) => prev + digit);
      setErrorMsg(null);
    }
  };

  const handleClear = () => {
    sound.playTick();
    setPin('');
    setErrorMsg(null);
  };

  const handleCheckPin = async () => {
    if (pin.length < 4) {
      setErrorMsg('O PIN deve conter pelo menos 4 dígitos.');
      sound.playFrictionAlert();
      return;
    }

    setIsVerifying(true);
    try {
      const hashedInput = await hashPin(pin);
      if (hashedInput === pinHash) {
        sound.playSuccess();
        setErrorMsg(null);
        onUnlock();
      } else {
        sound.playFrictionAlert();
        setAttempts((prev) => prev + 1);
        setErrorMsg(`ACESSO NEGADO // PIN INCORRETO (Tentativa #${attempts + 1})`);
        setPin('');
      }
    } catch {
      setErrorMsg('Erro na validação do PIN criptográfico.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Se digitar 6 dígitos, valida automaticamente
  useEffect(() => {
    if (pin.length === 6) {
      handleCheckPin();
    }
  }, [pin]);

  return (
    <div className="fixed inset-0 z-50 bg-[#020306]/98 backdrop-blur-xl flex items-center justify-center p-4 font-mono select-none">
      {/* Background Matrix/Cyber grid lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f0ff08_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#050813] border-2 border-[#00f0ff] p-6 shadow-2xl shadow-[#00f0ff]/20 text-[#e0f2fe] space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[#00f0ff]/30 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black border border-[#00f0ff] flex items-center justify-center neon-glow-cyan">
              <Lock className="w-4 h-4 text-[#00f0ff]" />
            </div>
            <div>
              <h2 className="text-xs font-black text-[#00f0ff] tracking-widest uppercase">
                COFRE SENTINELA // BLOQUEADO
              </h2>
              <span className="text-[10px] text-neutral-400">
                ACESSO RESTRITO AO OPERADOR
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-[#ff0055]/20 border border-[#ff0055] text-[#ff0055] text-[10px] font-bold animate-pulse">
            TERMINAL_TRANCADO
          </span>
        </div>

        {/* PIN Dots Display */}
        <div className="space-y-2 text-center">
          <p className="text-xs text-neutral-300">
            Digite seu PIN de segurança para liberar o painel:
          </p>

          <div className="py-4 bg-black/90 border-2 border-neutral-700 flex items-center justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isFilled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    isFilled
                      ? 'border-[#00ff66] bg-[#00ff66] neon-glow-green scale-110'
                      : 'border-neutral-700 bg-neutral-900'
                  }`}
                />
              );
            })}
          </div>

          {errorMsg ? (
            <div className="p-2 bg-[#ff0055]/15 border border-[#ff0055] text-[#ff0055] text-[11px] font-bold animate-bounce">
              ⚠️ {errorMsg}
            </div>
          ) : (
            <span className="text-[10px] text-neutral-500 block">
              Dica: use o teclado físico (0-9) ou os botões abaixo.
            </span>
          )}
        </div>

        {/* Cyberpunk Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyClick(digit)}
              className="py-3 bg-black/70 hover:bg-[#00f0ff]/20 border border-neutral-700 hover:border-[#00f0ff] text-white hover:text-[#00f0ff] text-base font-black transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="py-3 bg-[#17050a] hover:bg-[#ff0055]/20 border border-[#ff0055]/50 text-[#ff0055] text-xs font-bold transition-all cursor-pointer active:scale-95 uppercase tracking-wider"
          >
            LIMPAR
          </button>

          <button
            type="button"
            onClick={() => handleKeyClick('0')}
            className="py-3 bg-black/70 hover:bg-[#00f0ff]/20 border border-neutral-700 hover:border-[#00f0ff] text-white hover:text-[#00f0ff] text-base font-black transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleCheckPin}
            disabled={pin.length < 4 || isVerifying}
            className={`py-3 border text-xs font-black transition-all cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1 ${
              pin.length >= 4 && !isVerifying
                ? 'bg-[#00ff66] border-[#00ff66] text-black neon-glow-green hover:bg-[#00cc52]'
                : 'bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>{isVerifying ? '...' : 'ENTRAR'}</span>
          </button>
        </div>

        {/* Security Reset & Panic Option */}
        <div className="pt-3 border-t border-neutral-800 text-center">
          {!showPanicConfirm ? (
            <button
              type="button"
              onClick={() => setShowPanicConfirm(true)}
              className="text-[11px] text-neutral-500 hover:text-[#ff0055] transition-colors cursor-pointer underline underline-offset-4"
            >
              Esqueceu o PIN ou deseja purgar os dados de emergência?
            </button>
          ) : (
            <div className="p-3 bg-[#19030a] border-2 border-[#ff0055] space-y-2 text-left animate-in fade-in">
              <div className="flex items-center gap-1.5 text-[#ff0055] font-black text-xs">
                <AlertTriangle className="w-4 h-4 text-[#ff0055]" />
                <span>PURGE DE EMERGÊNCIA (RESET TOTAL)</span>
              </div>
              <p className="text-[10px] text-neutral-300">
                Se você esqueceu seu PIN, para sua segurança nenhum dado pode ser recuperado sem ele.
                Você pode executar a <strong>limpeza de emergência</strong>, que remove o cofre e redefine o sistema para o padrão com segurança.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    sound.playSuccess();
                    onPanicPurge();
                  }}
                  className="px-3 py-1.5 bg-[#ff0055] hover:bg-[#ff3377] text-white text-[11px] font-black uppercase cursor-pointer transition-all"
                >
                  LIMPAR COFRE E ENTRAR
                </button>
                <button
                  type="button"
                  onClick={() => setShowPanicConfirm(false)}
                  className="px-3 py-1.5 bg-black border border-neutral-700 text-neutral-400 hover:text-white text-[11px] cursor-pointer"
                >
                  VOLTAR
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
