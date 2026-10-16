import React, { useState, useEffect } from 'react';
import { Terminal, Send, Sparkles, CheckCircle2, AlertOctagon, CornerDownLeft, Command, Cpu } from 'lucide-react';
import { SentinelaParser } from '../lib/parser';
import { ParseResult, ExpenseRecord } from '../types/sentinela';
import { sound } from '../lib/sound';

interface RawInputTerminalProps {
  onRegisterExpense: (record: ExpenseRecord) => void;
  onRequestFrictionCheck: (record: ExpenseRecord) => void;
}

const PRESET_COMMANDS = [
  { key: 'F1', label: 'LANCHE 45 PIX', cmd: '20/10 lanche 45 pix', type: 'impulse' },
  { key: 'F2', label: 'UBER CARTÃO MÃE', cmd: 'uber 18.50 cartao mae', type: 'danger' },
  { key: 'F3', label: 'PIZZA 60 PIX', cmd: 'pizza 60 pix impulsivo', type: 'impulse' },
  { key: 'F4', label: 'REMÉDIO FARMÁCIA', cmd: 'remedio 32.00 farmacia dinheiro', type: 'safe' },
  { key: 'F5', label: 'ÔNIBUS 5 DINHEIRO', cmd: 'onibus 5.00 dinheiro', type: 'safe' },
];

export const RawInputTerminal: React.FC<RawInputTerminalProps> = ({
  onRegisterExpense,
  onRequestFrictionCheck,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Live parsing as user types
  useEffect(() => {
    if (!inputVal.trim()) {
      setParseResult(null);
      return;
    }
    const result = SentinelaParser.parse(inputVal);
    setParseResult(result);
  }, [inputVal]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const result = SentinelaParser.parse(inputVal);
    if (!result.success || !result.record) {
      sound.playFrictionAlert();
      return;
    }

    if (result.record.is_impulsive || result.record.metodo_pagamento === 'cartao_mae') {
      sound.playFrictionAlert();
      onRequestFrictionCheck(result.record);
    } else {
      sound.playSuccess();
      onRegisterExpense(result.record);
      setInputVal('');
      setParseResult(null);
    }
  };

  const handleSelectPreset = (cmd: string) => {
    setInputVal(cmd);
    sound.playTick();
  };

  return (
    <div className="border border-[#00f0ff]/50 bg-[#04060d]/95 p-4 shadow-xl relative font-mono">
      {/* Cyber Window Header Tag (Inspired by reference image) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-[#00f0ff]/20">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#00f0ff] text-black font-extrabold text-[11px] tracking-wider uppercase">
          <Terminal className="w-3.5 h-3.5 text-black" />
          <span>[ CONSOLE // PARSER REGEX NLP ]</span>
        </div>
        <span className="text-[10px] text-neutral-400">
          REQUISITO #1: TRANSDUÇÃO DE STRING BRUTA
        </span>
      </div>

      {/* Cyber Hotkeys Row (Directly evoking the shortcut keyboard in user image) */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 text-xs">
        <span className="text-neutral-500 text-[10px] font-bold uppercase flex items-center gap-1 flex-shrink-0">
          <Command className="w-3 h-3 text-[#ffe600]" /> MACROS:
        </span>
        {PRESET_COMMANDS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => handleSelectPreset(preset.cmd)}
            className={`px-2 py-1 text-[11px] border font-mono transition-all flex items-center gap-1.5 whitespace-nowrap ${
              preset.type === 'danger'
                ? 'bg-[#180309] border-[#ff0055] text-[#ff3377] hover:bg-[#ff0055] hover:text-black'
                : preset.type === 'impulse'
                ? 'bg-[#161202] border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-black'
                : 'bg-[#021308] border-[#00ff66] text-[#00ff66] hover:bg-[#00ff66] hover:text-black'
            }`}
          >
            <span className="px-1 py-0.2 bg-black text-neutral-300 font-bold text-[9px] border border-neutral-700">
              {preset.key}
            </span>
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Terminal Input Prompt */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center bg-black border border-[#00f0ff] p-1 neon-glow-cyan">
          <span className="pl-3 pr-2 text-[#00f0ff] font-bold text-xs select-none">
            sentinela@deck:~$
          </span>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Digite: '20/10 lanche 45 pix' ou 'uber 18.50 cartao mae'..."
            className="w-full bg-transparent text-[#e0f2fe] placeholder:text-neutral-600 focus:outline-none text-xs font-mono py-2"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="px-3 py-1.5 bg-[#00f0ff] hover:bg-[#00ff66] disabled:opacity-30 disabled:hover:bg-[#00f0ff] text-black font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
          >
            <span>EXECUTAR</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Live Tokenization Breakdown */}
      {parseResult && (
        <div className="mt-4 pt-3 border-t border-[#00f0ff]/20 animate-in fade-in duration-150">
          {parseResult.success && parseResult.tokens ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#00f0ff] flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff66]" />
                  ESTRUTURAÇÃO ATÔMICA DO PARSER:
                </span>
                {parseResult.tokens.is_impulsive ? (
                  <span className="px-2 py-0.5 bg-[#ff0055] text-black text-[10px] font-black uppercase animate-pulse">
                    🚨 GASTO IMPULSIVO DETECTADO
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-[#00ff66] text-black text-[10px] font-black uppercase">
                    ✓ GASTO ESSENCIAL / REGULAR
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="p-2 bg-black border border-neutral-800">
                  <span className="text-[9px] text-neutral-500 block uppercase">[DATA]</span>
                  <span className="font-bold text-[#e0f2fe]">{parseResult.tokens.data}</span>
                </div>
                <div className="p-2 bg-black border border-neutral-800">
                  <span className="text-[9px] text-neutral-500 block uppercase">[DESCRIÇÃO]</span>
                  <span className="font-bold text-[#e0f2fe] truncate block">
                    {parseResult.tokens.descricao}
                  </span>
                </div>
                <div className="p-2 bg-black border border-[#ffe600]/40">
                  <span className="text-[9px] text-[#ffe600] block uppercase">[VALOR]</span>
                  <span className="font-black text-[#ffe600]">
                    R$ {parseResult.tokens.valor.toFixed(2)}
                  </span>
                </div>
                <div className="p-2 bg-black border border-[#00f0ff]/40">
                  <span className="text-[9px] text-[#00f0ff] block uppercase">[MÉTODO]</span>
                  <span className={`font-bold uppercase text-[11px] ${
                    parseResult.tokens.metodo === 'cartao_mae' ? 'text-[#ff0055]' : 'text-[#00f0ff]'
                  }`}>
                    {parseResult.tokens.metodo.replace('_', ' ')}
                  </span>
                </div>
                <div className="p-2 bg-black border border-neutral-800 col-span-2 sm:col-span-1">
                  <span className="text-[9px] text-neutral-500 block uppercase">[CATEGORIA]</span>
                  <span className="font-bold text-neutral-300 capitalize text-[11px]">
                    {parseResult.tokens.categoria.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {parseResult.tokens.metodo === 'cartao_mae' && (
                <div className="mt-2 text-xs bg-[#1a0208] border border-[#ff0055] p-2 text-[#ff3377] flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-[#ff0055] flex-shrink-0" />
                  <span>
                    <strong>ALERTA DE PASSIVO FAMILIAR:</strong> Pagamento no Cartão da Mãe viola a soberania financeira e ativará amortização compulsória.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#ff0055] bg-black border border-[#ff0055] p-2.5">
              <AlertOctagon className="w-4 h-4 flex-shrink-0 text-[#ff0055]" />
              <span>{parseResult.error_message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
