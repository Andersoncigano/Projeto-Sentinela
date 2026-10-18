import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  CheckCircle2, 
  AlertOctagon, 
  CornerDownLeft, 
  Command, 
  X, 
  RotateCcw,
  CreditCard
} from 'lucide-react';
import { SentinelaParser } from '../lib/parser';
import { ParseResult, ExpenseRecord } from '../types/sentinela';
import { sound } from '../lib/sound';

interface RawInputTerminalProps {
  inputVal?: string;
  setInputVal?: (val: string) => void;
  onRegisterExpense: (record: ExpenseRecord) => void;
  onRequestFrictionCheck: (record: ExpenseRecord) => void;
  expenses?: ExpenseRecord[];
  onBatchRegister?: (records: ExpenseRecord[]) => void;
}

const PRESET_COMMANDS = [
  { key: 'F1', label: 'UBER 16 CARTÃO', cmd: 'uber 16.00 cartao', type: 'safe' },
  { key: 'F2', label: 'CHOPP 22 CARTÃO', cmd: 'chopp 22.00 cartao', type: 'impulse' },
  { key: 'F3', label: 'LANCHE 45 PIX', cmd: 'lanche 45 pix', type: 'impulse' },
  { key: 'F4', label: 'REMÉDIO FARMÁCIA', cmd: 'remedio 32.00 farmacia dinheiro', type: 'safe' },
  { key: 'F5', label: 'ÔNIBUS 5 DINHEIRO', cmd: 'onibus 5.00 dinheiro', type: 'safe' },
];

export const RawInputTerminal: React.FC<RawInputTerminalProps> = ({
  inputVal: externalInputVal,
  setInputVal: externalSetInputVal,
  onRegisterExpense,
  onRequestFrictionCheck,
  expenses = [],
  onBatchRegister,
}) => {
  const [internalInputVal, setInternalInputVal] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const inputVal = externalInputVal !== undefined ? externalInputVal : internalInputVal;
  const setInputVal = externalSetInputVal || setInternalInputVal;

  // Verificar se cada uma das 3 despesas já foi executada e gravada no banco
  const isUber17Done = expenses.some(
    (e) => (e.data === '2026-10-17' || e.data.endsWith('-17')) && Math.abs(e.valor - 6.10) < 0.01
  );
  const isAbbey18Done = expenses.some(
    (e) => (e.data === '2026-10-18' || e.data.endsWith('-18')) && Math.abs(e.valor - 63.00) < 0.01
  );
  const isUber18Done = expenses.some(
    (e) => (e.data === '2026-10-18' || e.data.endsWith('-18')) && Math.abs(e.valor - 30.80) < 0.01
  );

  const allThreeDone = isUber17Done && isAbbey18Done && isUber18Done;

  // Live parsing as user types
  useEffect(() => {
    if (!inputVal.trim()) {
      setParseResult(null);
      return;
    }
    const result = SentinelaParser.parse(inputVal);
    setParseResult(result);
  }, [inputVal]);

  const handleClear = () => {
    setInputVal('');
    setParseResult(null);
    sound.playTick();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const result = SentinelaParser.parse(inputVal);
    if (!result.success || !result.record) {
      sound.playFrictionAlert();
      return;
    }

    if (result.record.is_impulsive) {
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
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleExecuteAllThree = () => {
    const toAdd: ExpenseRecord[] = [];
    const now = Date.now();

    if (!isUber17Done) {
      toAdd.push({
        id: `exp_uber17_${now}`,
        data: '2026-10-17',
        descricao: 'Uber',
        valor: 6.10,
        metodo_pagamento: 'cartao_credito',
        categoria: 'transporte',
        is_impulsive: false,
        timestamp: now,
      });
    }

    if (!isAbbey18Done) {
      toAdd.push({
        id: `exp_abbey18_${now + 1}`,
        data: '2026-10-18',
        descricao: 'Abbey',
        valor: 63.00,
        metodo_pagamento: 'cartao_credito',
        categoria: 'outros',
        is_impulsive: false,
        timestamp: now + 1,
      });
    }

    if (!isUber18Done) {
      toAdd.push({
        id: `exp_uber18_${now + 2}`,
        data: '2026-10-18',
        descricao: 'Uber',
        valor: 30.80,
        metodo_pagamento: 'cartao_credito',
        categoria: 'transporte',
        is_impulsive: false,
        timestamp: now + 2,
      });
    }

    if (toAdd.length > 0) {
      sound.playSuccess();
      if (onBatchRegister) {
        onBatchRegister(toAdd);
      } else {
        toAdd.forEach((rec) => onRegisterExpense(rec));
      }
      setInputVal('');
      setParseResult(null);
    }
  };

  const isCard = parseResult?.tokens?.metodo === 'cartao_credito' || 
                 parseResult?.tokens?.metodo === 'cartao_proprio' || 
                 parseResult?.tokens?.metodo === 'cartao_mae';

  return (
    <div className="border border-[#00f0ff]/50 bg-[#04060d]/95 p-4 shadow-xl relative font-mono">
      {/* Cyber Window Header Tag */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-[#00f0ff]/20">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#00f0ff] text-black font-extrabold text-[11px] tracking-wider uppercase">
          <Terminal className="w-3.5 h-3.5 text-black" />
          <span>[ CONSOLE // PARSER REGEX NLP ]</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-neutral-400">
          <span>ATALHO: [ESC] = LIMPAR</span>
          <span className="text-neutral-700">|</span>
          <span className="text-neutral-400">TRANSDUÇÃO INSTANTÂNEA</span>
        </div>
      </div>

      {/* Painel de Direção Visual: Status das Despesas e Atalhos */}
      <div className="bg-[#02131d] border-2 border-[#00f0ff] p-3 mb-3 text-xs shadow-lg shadow-[#00f0ff]/10 animate-in fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`w-2.5 h-2.5 ${allThreeDone ? 'bg-[#00ff66]' : 'bg-[#ffe600] animate-pulse'}`} />
              <span className="text-[#00f0ff] font-extrabold uppercase text-xs tracking-wider">
                🎯 STATUS DOS GASTOS NO CARTÃO (OUTUBRO):
              </span>
              <span className="px-2 py-0.5 bg-[#00ff66]/20 border border-[#00ff66]/50 text-[#00ff66] text-[10px] font-bold">
                {allThreeDone ? '✓ TODOS OS 3 JÁ FORAM EXECUTADOS!' : '⚠️ ITENS ABAIXO SÃO ATALHOS • AINDA NÃO FORAM SALVOS'}
              </span>
            </div>
            <p className="text-neutral-300 text-[11px] mt-1.5 leading-relaxed">
              {allThreeDone ? (
                <span className="text-[#00ff66] font-bold">
                  ✓ As 3 despesas já constam gravadas no seu histórico e nos 4 cards acima!
                </span>
              ) : (
                <span>
                  Estes botões são <strong>atalhos rápidos</strong>. Para salvá-los, clique em cada um e aperte <strong>ENTER</strong>, ou use o botão <strong>EXECUTAR OS 3 DE UMA VEZ</strong>:
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão 1: Uber 17/10 */}
            <button
              type="button"
              onClick={() => handleSelectPreset('17/10 uber 6.10 cartao')}
              className={`px-2.5 py-1.5 border-2 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow ${
                isUber17Done
                  ? 'bg-[#031d10] border-[#00ff66] text-[#00ff66]'
                  : 'bg-black border-[#00ff66] text-[#00ff66] hover:bg-[#00ff66] hover:text-black'
              }`}
              title={isUber17Done ? '✓ Já salvo no banco de dados' : 'Clique para carregar no prompt'}
            >
              <span>{isUber17Done ? '✓ 17/10 UBER: R$ 6,10 (SALVO)' : '🚗 17/10 UBER: R$ 6,10'}</span>
            </button>

            {/* Botão 2: Abbey 18/10 */}
            <button
              type="button"
              onClick={() => handleSelectPreset('18/10 abbey 63 cartao')}
              className={`px-2.5 py-1.5 border-2 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow ${
                isAbbey18Done
                  ? 'bg-[#031d10] border-[#00ff66] text-[#00ff66]'
                  : 'bg-black border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black'
              }`}
              title={isAbbey18Done ? '✓ Já salvo no banco de dados' : 'Clique para carregar no prompt'}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isAbbey18Done ? '✓ 18/10 ABBEY: R$ 63,00 (SALVO)' : '🏛️ 18/10 ABBEY: R$ 63,00'}</span>
            </button>

            {/* Botão 3: Uber 18/10 */}
            <button
              type="button"
              onClick={() => handleSelectPreset('18/10 uber 30.80 cartao')}
              className={`px-2.5 py-1.5 border-2 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow ${
                isUber18Done
                  ? 'bg-[#031d10] border-[#00ff66] text-[#00ff66]'
                  : 'bg-black border-[#00ff66] text-[#00ff66] hover:bg-[#00ff66] hover:text-black'
              }`}
              title={isUber18Done ? '✓ Já salvo no banco de dados' : 'Clique para carregar no prompt'}
            >
              <span>{isUber18Done ? '✓ 18/10 UBER: R$ 30,80 (SALVO)' : '🚗 18/10 UBER: R$ 30,80'}</span>
            </button>

            {/* Botão de Gravação Instantânea dos 3 */}
            {!allThreeDone && (
              <button
                type="button"
                onClick={handleExecuteAllThree}
                className="px-3 py-1.5 bg-[#ffe600] hover:bg-[#00ff66] text-black font-black text-xs transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-[#ffe600]/20 uppercase"
                title="Gravar automaticamente os que ainda não foram executados"
              >
                <span>⚡ EXECUTAR OS 3 DE UMA VEZ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cyber Hotkeys Row */}
      <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1 text-xs">
        <span className="text-neutral-500 text-[10px] font-bold uppercase flex items-center gap-1 flex-shrink-0">
          <Command className="w-3 h-3 text-[#ffe600]" /> OUTROS ATALHOS:
        </span>
        {PRESET_COMMANDS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => handleSelectPreset(preset.cmd)}
            className={`px-2 py-0.5 text-[10px] border font-mono transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              preset.type === 'danger'
                ? 'bg-[#180309] border-[#ff0055] text-[#ff3377] hover:bg-[#ff0055] hover:text-black'
                : preset.type === 'impulse'
                ? 'bg-[#161202] border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-black'
                : 'bg-[#021308] border-[#00ff66] text-[#00ff66] hover:bg-[#00ff66] hover:text-black'
            }`}
          >
            <span className="px-1 py-0.2 bg-black text-neutral-300 font-bold text-[8px] border border-neutral-700">
              {preset.key}
            </span>
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Terminal Input Prompt */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center bg-black border-2 border-[#00f0ff] p-1.5 neon-glow-cyan gap-1.5">
          <span className="pl-3 pr-2 text-[#00f0ff] font-bold text-xs select-none flex-shrink-0">
            sentinela@deck:~$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                handleClear();
              }
            }}
            placeholder="Digite: 'uber 16 cartao' ou 'chopp 22 cartao' e aperte ENTER..."
            className="w-full bg-transparent text-[#e0f2fe] placeholder:text-neutral-500 focus:outline-none text-xs font-mono py-1.5"
          />

          {/* Inline Clear Button when input is not empty */}
          {inputVal && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-neutral-400 hover:text-[#ff0055] hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Limpar comando (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Botão LIMPAR dedicado */}
          <button
            type="button"
            onClick={handleClear}
            disabled={!inputVal}
            className="px-2.5 py-1.5 border border-neutral-700 bg-neutral-950 hover:bg-[#ff0055]/20 hover:border-[#ff0055] hover:text-[#ff0055] disabled:opacity-20 disabled:hover:bg-neutral-950 disabled:hover:text-neutral-400 text-neutral-400 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer uppercase flex-shrink-0"
            title="Limpar o texto digitado e o preview do terminal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>LIMPAR</span>
          </button>

          {/* Botão EXECUTAR */}
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="px-3.5 py-1.5 bg-[#00f0ff] hover:bg-[#00ff66] disabled:opacity-30 disabled:hover:bg-[#00f0ff] text-black font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider flex-shrink-0"
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
                <div className="flex items-center gap-2">
                  {parseResult.tokens.is_impulsive ? (
                    <span className="px-2 py-0.5 bg-[#ff0055] text-black text-[10px] font-black uppercase animate-pulse">
                      🚨 GASTO IMPULSIVO DETECTADO
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-[#00ff66] text-black text-[10px] font-black uppercase">
                      ✓ GASTO ESSENCIAL / REGULAR
                    </span>
                  )}
                  {/* Botão de Cancelar Entrada no Token Breakdown */}
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-[#ff0055] hover:border-[#ff0055] text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                    title="Desistir e limpar este comando"
                  >
                    <X className="w-3 h-3" />
                    <span>CANCELAR</span>
                  </button>
                </div>
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
                  <span className="font-bold uppercase text-[11px] text-[#00f0ff]">
                    {isCard ? 'CARTÃO DE CRÉDITO' : parseResult.tokens.metodo.replace('_', ' ')}
                  </span>
                </div>
                <div className="p-2 bg-black border border-neutral-800 col-span-2 sm:col-span-1">
                  <span className="text-[9px] text-neutral-500 block uppercase">[CATEGORIA]</span>
                  <span className="font-bold text-neutral-300 capitalize text-[11px]">
                    {parseResult.tokens.categoria.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {isCard && (
                <div className="mt-2 text-xs bg-[#031118] border border-[#00f0ff]/50 p-2 text-[#00f0ff] flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#00f0ff] flex-shrink-0" />
                    <span>
                      <strong>FATURA DO CARTÃO DE CRÉDITO:</strong> O valor entrará na fatura mensal do cartão que você pagará no vencimento.
                    </span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 text-xs text-[#ff0055] bg-black border border-[#ff0055] p-2.5">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 flex-shrink-0 text-[#ff0055]" />
                <span>{parseResult.error_message}</span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="px-2 py-0.5 border border-[#ff0055] text-[#ff0055] hover:bg-[#ff0055] hover:text-black text-[10px] font-bold uppercase transition-all"
              >
                LIMPAR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
