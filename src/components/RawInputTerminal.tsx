import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  CheckCircle2, 
  AlertOctagon, 
  CornerDownLeft, 
  Command, 
  X, 
  RotateCcw,
  CreditCard,
  Layers,
  Briefcase,
  Zap,
  Smartphone,
  PlusCircle
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
  temSaldoReal?: boolean;
  motivoSemSaldo?: string;
}

const PRESET_COMMANDS = [
  { key: 'F1', label: 'UBER 16 CARTÃO (RESCISÃO)', cmd: 'uber 16.00 cartao', type: 'safe' },
  { key: 'F2', label: 'CHOPP 22 CARTÃO (RESCISÃO)', cmd: 'chopp 22.00 cartao', type: 'impulse' },
  { key: 'F3', label: 'LANCHE 45 CARTÃO (RESCISÃO)', cmd: 'lanche 45 cartao', type: 'impulse' },
  { key: 'F4', label: 'REMÉDIO 32 FARMÁCIA CARTÃO', cmd: 'remedio 32.00 farmacia cartao', type: 'safe' },
  { key: 'F5', label: 'PIX-SALÁRIO 20', cmd: 'onibus 20 pix', type: 'safe' },
  { key: 'F6', label: 'COMPRAS 150 PIX RESCISÃO', cmd: 'compras 150 pix rescisao', type: 'rescisao' },
];

export const RawInputTerminal: React.FC<RawInputTerminalProps> = ({
  inputVal: externalInputVal,
  setInputVal: externalSetInputVal,
  onRegisterExpense,
  onRequestFrictionCheck,
  expenses = [],
  onBatchRegister,
  temSaldoReal = true,
  motivoSemSaldo,
}) => {
  const [internalInputVal, setInternalInputVal] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const inputVal = externalInputVal !== undefined ? externalInputVal : internalInputVal;
  const setInputVal = externalSetInputVal || setInternalInputVal;

  // Modo de Entrada: 'terminal' (linha de comando) ou 'form' (campos nativos para celular)
  const [entryMode, setEntryMode] = useState<'terminal' | 'form'>('terminal');
  const [formValor, setFormValor] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formMetodo, setFormMetodo] = useState<'pix' | 'cartao_credito' | 'pix_rescisao'>('cartao_credito');
  const [formData, setFormData] = useState(() => new Date().toISOString().split('T')[0]);

  // Verificar despesas registradas pós-virada do dia 17
  const isUber17Done = expenses.some(
    (e) => (e.data === '2026-10-17' || e.data.endsWith('-17')) && Math.abs(e.valor - 6.10) < 0.01
  );
  const isAbbey18Done = expenses.some(
    (e) => (e.data === '2026-10-18' || e.data.endsWith('-18')) && Math.abs(e.valor - 63.00) < 0.01
  );
  const isUber18Done = expenses.some(
    (e) => (e.data === '2026-10-18' || e.data.endsWith('-18')) && Math.abs(e.valor - 30.80) < 0.01
  );
  const isDenisDone = expenses.some(
    (e) => (e.descricao.toLowerCase().includes('denis') || e.descricao.toLowerCase().includes('beulmont')) && Math.abs(e.valor - 341) < 0.01
  );

  const allThreeDone = isUber17Done && isAbbey18Done && isUber18Done && isDenisDone;

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(formValor.replace(',', '.'));
    if (isNaN(val) || val <= 0 || !formDesc.trim()) {
      sound.playFrictionAlert();
      return;
    }

    const isCard = formMetodo === 'cartao_credito';
    const isRescisao = formMetodo === 'pix_rescisao' || isCard;

    const lower = formDesc.toLowerCase();
    const isImpulsive =
      lower.includes('lanche') ||
      lower.includes('ifood') ||
      lower.includes('chopp') ||
      lower.includes('cerveja') ||
      lower.includes('roupa') ||
      lower.includes('jogos') ||
      lower.includes('bar') ||
      (!lower.includes('uber') && (lower.includes('compras') || lower.includes('restaurante')));

    const record: ExpenseRecord = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      data: formData,
      descricao: formDesc.trim(),
      valor: val,
      metodo_pagamento: formMetodo,
      categoria: isImpulsive ? 'impulsivo' : 'essencial',
      is_impulsive: isImpulsive,
      timestamp: Date.now(),
      vinculado_rescisao: isRescisao,
      fatura_mes: isCard ? '2026-11' : undefined,
      fatura_vencimento: isCard ? '2026-11-23' : undefined,
    };

    if (record.is_impulsive) {
      sound.playFrictionAlert();
      onRequestFrictionCheck(record);
    } else {
      sound.playSuccess();
      onRegisterExpense(record);
      setFormValor('');
      setFormDesc('');
    }
  };

  const handleSelectPreset = (cmd: string) => {
    setInputVal(cmd);
    sound.playTick();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleAppendMethod = (methodSuffix: string) => {
    sound.playTick();
    if (!inputVal.trim()) {
      setInputVal(`${methodSuffix} `);
    } else {
      // Remove any previously written method alias and replace with chosen one
      const cleaned = inputVal
        .replace(/\b(pix\s*[/]?\s*rescis[aã]o|rescis[aã]o\s*[/]?\s*pix|rescis[aã]o|pix\s*[/]?\s*sal[aá]rio|sal[aá]rio\s*[/]?\s*pix|sobra\s*(?:do\s*)?sal[aá]rio|cart[aã]o(?:\s*mae)?|cartao|pix)\b/gi, '')
        .trim();
      setInputVal(`${cleaned} ${methodSuffix}`.trim());
    }
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

        {/* Seletor de Modo: Terminal (Linha) vs Formulário (Celular) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playTick();
              setEntryMode('terminal');
            }}
            className={`px-2.5 py-1 text-[11px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
              entryMode === 'terminal'
                ? 'bg-[#00f0ff] text-black border-[#00f0ff]'
                : 'bg-black text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>⌨️ TERMINAL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playTick();
              setEntryMode('form');
            }}
            className={`px-2.5 py-1 text-[11px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
              entryMode === 'form'
                ? 'bg-[#00ff66] text-black border-[#00ff66] shadow-sm shadow-[#00ff66]/30'
                : 'bg-black text-[#00ff66] border-[#00ff66]/60 hover:bg-[#00ff66]/10'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>📱 CAMPOS CELULAR</span>
          </button>
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

            {/* Botão 4: Denis Beulmont 21/10 */}
            <button
              type="button"
              onClick={() => handleSelectPreset('21/10 denis beulmont 341 cartao')}
              className={`px-2.5 py-1.5 border-2 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow ${
                isDenisDone
                  ? 'bg-[#031d10] border-[#00ff66] text-[#00ff66]'
                  : 'bg-black border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black'
              }`}
              title={isDenisDone ? '✓ Já salvo no banco de dados' : 'Clique para carregar no prompt'}
            >
              <span>{isDenisDone ? '✓ 21/10 DENIS: R$ 341,00 (SALVO)' : '👔 21/10 DENIS: R$ 341,00'}</span>
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
                : preset.type === 'rescisao'
                ? 'bg-[#170a25] border-[#c084fc] text-[#c084fc] hover:bg-[#c084fc] hover:text-black'
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

      {/* Banner de Operação: Modo Cartão até Sexta 30/10 */}
      <div className="bg-[#05111c] border-l-4 border-[#00f0ff] p-2 mb-2 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
          <span className="text-[#00f0ff] font-extrabold uppercase text-[11px] tracking-wider">
            REGIME ATIVO ATÉ SEXTA (30/10):
          </span>
          <span className="text-neutral-300 text-[11px]">
            Compras no cartão caem na fatura de <strong>23/11</strong> e serão quitadas com a rescisão.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 uppercase">
          Virada 17/10 ✓ | Vence 23/11
        </span>
      </div>

      {/* Seletor Rápido de Medida / Origem do Recurso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 p-2 bg-[#020710] border border-neutral-800 text-xs">
        <span className="text-[10px] text-neutral-400 font-extrabold uppercase flex items-center gap-1.5 flex-shrink-0">
          <Layers className="w-3.5 h-3.5 text-[#00f0ff]" />
          ORIGEM DO GASTO (CLIQUE PARA ANEXAR):
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleAppendMethod('pix')}
            className="px-2.5 py-1 bg-[#011a0c] border border-[#00ff66] text-[#00ff66] hover:bg-[#00ff66] hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
            title="Gasto comum do dia a dia: consome a sobra dos R$ 200 do seu salário"
          >
            <span>🟢 1. PIX-SALÁRIO (SOBRA R$ 200)</span>
          </button>
          <button
            type="button"
            onClick={() => handleAppendMethod('cartao')}
            className="px-2.5 py-1 bg-[#031522] border-2 border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black font-black text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-[#00f0ff]/20"
            title="Gasto no cartão até sexta 30/10: fatura nov 23/11 paga integralmente com a rescisão"
          >
            <span>🔵 2. PIX-RESCISÃO-CARTÃO (FATURA 23/11)</span>
          </button>
          <button
            type="button"
            onClick={() => handleAppendMethod('pix rescisao')}
            className="px-2.5 py-1 bg-[#170a25] border border-[#c084fc] text-[#c084fc] hover:bg-[#c084fc] hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
            title="Gasto direto via Pix abatido da rescisão prevista para dia 30"
          >
            <span>🟣 3. PIX-RESCISÃO (DIRETO DIA 30)</span>
          </button>
        </div>
      </div>

      {entryMode === 'form' ? (
        <form onSubmit={handleFormSubmit} className="bg-[#020b14] border-2 border-[#00ff66] p-3.5 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-xs font-black text-[#00ff66] uppercase flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#00ff66]" />
              <span>REGISTRO DIRETO PARA CELULAR</span>
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              Teclado numérico nativo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Campo Valor */}
            <div>
              <label className="text-[10px] text-neutral-400 font-bold block mb-1 uppercase">
                VALOR DO GASTO (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-neutral-500 font-bold text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  required
                  value={formValor}
                  onChange={(e) => setFormValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-black border-2 border-[#00f0ff] focus:border-[#00ff66] text-white font-black text-xl pl-9 pr-3 py-2 focus:outline-none"
                />
              </div>
            </div>

            {/* Campo Descrição */}
            <div>
              <label className="text-[10px] text-neutral-400 font-bold block mb-1 uppercase">
                DESCRIÇÃO / LOCAL *
              </label>
              <input
                type="text"
                required
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Ex: Farmácia, Uber, Lanche..."
                className="w-full bg-black border-2 border-neutral-700 focus:border-[#00ff66] text-white text-base sm:text-xs px-3 py-2.5 focus:outline-none"
              />
            </div>

            {/* Campo Data */}
            <div>
              <label className="text-[10px] text-neutral-400 font-bold block mb-1 uppercase">
                DATA DO GASTO
              </label>
              <input
                type="date"
                value={formData}
                onChange={(e) => setFormData(e.target.value)}
                className="w-full bg-black border-2 border-neutral-700 focus:border-[#00ff66] text-white text-base sm:text-xs px-3 py-2.5 focus:outline-none"
              />
            </div>
          </div>

          {/* Seleção do Método em 3 Botões Grandes com 1 Toque */}
          <div>
            <label className="text-[10px] text-neutral-400 font-bold block mb-1.5 uppercase">
              SELECIONE A ORIGEM / MÉTODO DO GASTO:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormMetodo('pix')}
                className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                  formMetodo === 'pix'
                    ? 'bg-[#011a0c] border-[#00ff66] text-[#00ff66] font-black shadow-md'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>🟢 1. PIX-SALÁRIO</span>
                  {formMetodo === 'pix' && <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff66]" />}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Sobra dos R$ 200 do salário</div>
              </button>

              <button
                type="button"
                onClick={() => setFormMetodo('cartao_credito')}
                className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                  formMetodo === 'cartao_credito'
                    ? 'bg-[#031522] border-[#00f0ff] text-[#00f0ff] font-black shadow-md shadow-[#00f0ff]/20'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>🔵 2. CARTÃO (23/11)</span>
                  {formMetodo === 'cartao_credito' && <CheckCircle2 className="w-3.5 h-3.5 text-[#00f0ff]" />}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Pago c/ verba da rescisão</div>
              </button>

              <button
                type="button"
                onClick={() => setFormMetodo('pix_rescisao')}
                className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                  formMetodo === 'pix_rescisao'
                    ? 'bg-[#170a25] border-[#c084fc] text-[#c084fc] font-black shadow-md'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>🟣 3. PIX-RESCISÃO</span>
                  {formMetodo === 'pix_rescisao' && <CheckCircle2 className="w-3.5 h-3.5 text-[#c084fc]" />}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Débito direto da rescisão</div>
              </button>
            </div>
          </div>

          {/* Botão de Envio Grande */}
          <button
            type="submit"
            className="w-full py-3 bg-[#00ff66] hover:bg-[#ffe600] text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#00ff66]/20 active:scale-98 flex items-center justify-center gap-2 min-h-[46px]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>REGISTRAR GASTO AGORA</span>
          </button>
        </form>
      ) : (
        /* Terminal Input Prompt (100% Responsivo no Celular) */
        <form onSubmit={handleSubmit} className="relative">
          <div className="bg-black border-2 border-[#00f0ff] p-2 neon-glow-cyan flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0 w-full bg-[#050b14] border border-neutral-800 focus-within:border-[#00f0ff] px-2.5 py-1.5 transition-colors">
              <span className="text-[#00f0ff] font-bold text-xs select-none flex-shrink-0 font-mono">
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
                placeholder="Ex: 'uber 30.80 cartao', 'farmacia 25 pix'..."
                className="flex-1 min-w-0 w-full bg-transparent text-[#e0f2fe] placeholder:text-neutral-500 focus:outline-none text-base md:text-xs font-mono py-1"
              />

              {inputVal && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 text-neutral-400 hover:text-[#ff0055] hover:bg-neutral-900 transition-colors cursor-pointer flex-shrink-0"
                  title="Limpar comando (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end w-full md:w-auto flex-shrink-0">
              <button
                type="button"
                onClick={handleClear}
                disabled={!inputVal}
                className="flex-1 md:flex-none px-3 py-2.5 md:py-1.5 border border-neutral-700 bg-neutral-950 hover:bg-[#ff0055]/20 hover:border-[#ff0055] hover:text-[#ff0055] disabled:opacity-20 text-neutral-400 font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer uppercase min-h-[42px] md:min-h-auto"
                title="Limpar o texto digitado e o preview do terminal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>LIMPAR</span>
              </button>

              <button
                type="submit"
                disabled={!inputVal.trim()}
                className="flex-1 md:flex-none px-4 py-2.5 md:py-1.5 bg-[#00f0ff] hover:bg-[#00ff66] disabled:opacity-30 disabled:hover:bg-[#00f0ff] text-black font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider flex-shrink-0 min-h-[42px] md:min-h-auto shadow-md shadow-[#00f0ff]/30 active:scale-95"
              >
                <span>EXECUTAR</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      )}

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
                <div className={`p-2 bg-black border ${
                  parseResult.tokens.metodo === 'pix_rescisao'
                    ? 'border-[#c084fc]'
                    : isCard
                    ? 'border-[#00f0ff]'
                    : 'border-[#00ff66]'
                }`}>
                  <span className="text-[9px] text-neutral-400 block uppercase">[MEDIDA / ORIGEM]</span>
                  <span className={`font-black uppercase text-[11px] ${
                    parseResult.tokens.metodo === 'pix_rescisao'
                      ? 'text-[#c084fc]'
                      : isCard
                      ? 'text-[#00f0ff]'
                      : 'text-[#00ff66]'
                  }`}>
                    {parseResult.tokens.metodo === 'pix_rescisao'
                      ? '🟣 PIX RESCISÃO'
                      : isCard
                      ? '🔵 CARTÃO CRÉDITO'
                      : '🟢 PIX SALÁRIO'}
                  </span>
                </div>
                <div className="p-2 bg-black border border-neutral-800 col-span-2 sm:col-span-1">
                  <span className="text-[9px] text-neutral-500 block uppercase">[CATEGORIA]</span>
                  <span className="font-bold text-neutral-300 capitalize text-[11px]">
                    {parseResult.tokens.categoria.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Informação Dinâmica de Impacto Financeiro */}
              {parseResult.tokens.metodo === 'pix_rescisao' && (
                <div className="mt-2 text-xs bg-[#170a25] border border-[#c084fc]/50 p-2 text-[#c084fc] flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#c084fc] flex-shrink-0" />
                  <span>
                    <strong>VERBA RESCISÓRIA (DIA 30):</strong> Este valor sairá da sua rescisão. <strong>NÃO</strong> desconta dos R$ 200,00 de saldo livre do seu salário!
                  </span>
                </div>
              )}

              {parseResult.tokens.metodo === 'pix' && (
                temSaldoReal ? (
                  <div className="mt-2 text-xs bg-[#011a0c] border border-[#00ff66]/50 p-2 text-[#00ff66] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#00ff66] flex-shrink-0" />
                    <span>
                      <strong>SALDO LIVRE DO SALÁRIO:</strong> Descontará dos seus <strong>R$ 200,00</strong> que sobraram das contas do mês e atualizará seu Teto Diário.
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 text-xs bg-[#24030d] border-2 border-[#ff0055] p-2.5 text-[#ff0055] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-lg">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 text-[#ff0055] flex-shrink-0 animate-pulse" />
                      <div>
                        <span className="font-black uppercase tracking-wider block sm:inline">
                          ⚠️ ATENÇÃO // SALDO PIX REAL = R$ 0,00
                        </span>
                        <span className="text-[11px] text-white block mt-0.5">
                          {motivoSemSaldo ? `${motivoSemSaldo}. ` : 'Dinheiro ainda não entrou. '}
                          <strong className="text-[#ff3366] underline">Sem saldo: gastos vão para o cartão.</strong>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTick();
                        const updated = inputVal.replace(/\b(pix|dinheiro|debito)\b/gi, 'cartao');
                        setInputVal(updated);
                      }}
                      className="px-2.5 py-1 bg-[#ff0055] hover:bg-white text-black font-black text-[10px] uppercase transition-all cursor-pointer flex-shrink-0 shadow-md"
                    >
                      → MUDAR P/ CARTÃO
                    </button>
                  </div>
                )
              )}

              {isCard && (
                <div className="mt-2 text-xs bg-[#031118] border border-[#00f0ff]/50 p-2 text-[#00f0ff] flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#00f0ff] flex-shrink-0" />
                    <span>
                      <strong>FATURA DO CARTÃO (PASSIVO):</strong> Entra na fatura que vence dia 23, sem tirar dinheiro do seu bolso hoje.
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
