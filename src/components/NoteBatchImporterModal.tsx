import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Layers,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { ExpenseRecord, PaymentMethod } from '../types/sentinela';
import { NoteBatchImporter, NoteBatchParseResult } from '../lib/noteImporter';
import { sound } from '../lib/sound';

interface NoteBatchImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportExpenses: (records: ExpenseRecord[], targetMonth: string) => void;
  currentSelectedMonth: string; // YYYY-MM
}

const EXAMPLE_NOTE = `Setembro - Pix

Lord - 45 - 07/10
Fantasia - 20 - 07/10
Abbey fantasia - 25 - 07/10
Barba - 20 ?`;

export const NoteBatchImporterModal: React.FC<NoteBatchImporterModalProps> = ({
  isOpen,
  onClose,
  onImportExpenses,
  currentSelectedMonth,
}) => {
  const [rawText, setRawText] = useState(EXAMPLE_NOTE);
  const [targetMonth, setTargetMonth] = useState(currentSelectedMonth || '2026-09');
  const [defaultMethod, setDefaultMethod] = useState<PaymentMethod>('pix');
  const [parseResult, setParseResult] = useState<NoteBatchParseResult | null>(null);

  useEffect(() => {
    if (rawText.trim()) {
      const res = NoteBatchImporter.parseNotes(rawText);
      setParseResult(res);
      if (res.mesSugerido) {
        setTargetMonth(res.mesSugerido);
      }
      if (res.metodoSugerido) {
        setDefaultMethod(res.metodoSugerido);
      }
    } else {
      setParseResult(null);
    }
  }, [rawText]);

  if (!isOpen) return null;

  const validLines = parseResult?.linhas.filter(l => l.valido) || [];

  const handleExecuteImport = () => {
    if (!parseResult || validLines.length === 0) return;

    sound.playSuccess();
    const records = NoteBatchImporter.toExpenseRecords(validLines, targetMonth);
    onImportExpenses(records, targetMonth);
    onClose();
  };

  const handleClear = () => {
    setRawText('');
    setParseResult(null);
    sound.playTick();
  };

  const handleLoadExample = () => {
    setRawText(EXAMPLE_NOTE);
    sound.playTick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-mono animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[#05070f] border-2 border-[#00f0ff] shadow-2xl neon-glow-cyan flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#00f0ff] text-black px-4 py-2 flex items-center justify-between font-black text-xs tracking-wider uppercase flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-black" />
            <span>[ IMPORTADOR DE BLOCO DE NOTAS // BANCO DE DADOS MENSAL ]</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-black hover:text-[#00f0ff] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Instrução rápida */}
          <div className="p-3 bg-black border border-neutral-800 text-neutral-300 space-y-1">
            <p className="font-bold text-[#00f0ff] flex items-center gap-1.5 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-[#00f0ff]" />
              // COLE QUALQUER LISTA DE GASTOS EM DUAS ESCALAS:
            </p>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              Cole suas anotações do WhatsApp, Bloco de Notas ou caderno. O sistema reconhece o mês (ex: <em>Setembro</em>), a forma (<em>Pix</em> ou <em>Cartão</em>), valores numéricos (<em>45</em>, <em>20 ?</em>) e datas (<em>07/10</em>).
            </p>
          </div>

          {/* Controls Bar: Mês Alvo & Escala Padrão */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black p-3 border border-neutral-800">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1 uppercase font-bold">
                MÊS DE DESTINO NO BANCO:
              </label>
              <select
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="w-full bg-[#0a0f1d] border border-[#00f0ff]/50 p-1.5 text-xs text-[#e0f2fe] focus:outline-none"
              >
                <option value="2026-08">Agosto / 2026</option>
                <option value="2026-09">Setembro / 2026</option>
                <option value="2026-10">Outubro / 2026 (Atual)</option>
                <option value="2026-11">Novembro / 2026</option>
                <option value="2026-12">Dezembro / 2026</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 block mb-1 uppercase font-bold">
                ESCALA DE PAGAMENTO:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDefaultMethod('pix')}
                  className={`py-1.5 px-2 border text-center transition-all cursor-pointer text-[10px] font-bold ${
                    defaultMethod === 'pix'
                      ? 'bg-[#00ff66] border-[#00ff66] text-black'
                      : 'bg-[#0a0f1d] border-neutral-800 text-neutral-400'
                  }`}
                >
                  ⚡ PIX / À VISTA
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultMethod('cartao_credito')}
                  className={`py-1.5 px-2 border text-center transition-all cursor-pointer text-[10px] font-bold ${
                    defaultMethod === 'cartao_credito'
                      ? 'bg-[#00f0ff] border-[#00f0ff] text-black'
                      : 'bg-[#0a0f1d] border-neutral-800 text-neutral-400'
                  }`}
                >
                  💳 CARTÃO
                </button>
              </div>
            </div>

            <div className="flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={handleLoadExample}
                className="px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 hover:text-white text-[10px] font-bold uppercase transition-all"
                title="Carregar o exemplo do bloco de notas enviado"
              >
                Exemplo Setembro
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 text-[#ff0055] hover:border-[#ff0055] text-[10px] font-bold uppercase transition-all"
                title="Limpar texto digitado"
              >
                <RotateCcw className="w-3 h-3 inline mr-1" />
                Limpar
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 uppercase font-bold flex items-center justify-between">
              <span>TEXTO BRUTO DO BLOCO DE NOTAS:</span>
              <span className="text-[#00f0ff]">
                {validLines.length} item(ns) identificados
              </span>
            </label>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole aqui seu bloco de notas..."
              className="w-full bg-black border border-neutral-700 p-3 text-xs font-mono text-[#e0f2fe] focus:border-[#00f0ff] focus:outline-none"
            />
          </div>

          {/* Live Preview Table */}
          {parseResult && validLines.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#00ff66] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />
                  PRÉVIA DOS LANÇAMENTOS RECONHECIDOS:
                </span>
                <span className="text-xs font-black text-[#ffe600]">
                  TOTAL: R$ {parseResult.totalGeral.toFixed(2)} (Pix: R$ {parseResult.totalVista.toFixed(2)} | Cartão: R$ {parseResult.totalCartao.toFixed(2)})
                </span>
              </div>

              <div className="border border-neutral-800 bg-black overflow-x-auto max-h-48">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-[10px] text-neutral-500 uppercase bg-neutral-950">
                      <th className="p-2">DATA</th>
                      <th className="p-2">DESCRIÇÃO</th>
                      <th className="p-2">VALOR</th>
                      <th className="p-2">ESCALA / MÉTODO</th>
                      <th className="p-2">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {validLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-neutral-900/50">
                        <td className="p-2 text-neutral-400 whitespace-nowrap">{line.data}</td>
                        <td className="p-2 font-bold text-[#e0f2fe]">
                          {line.descricao}
                          {line.duvida && (
                            <span className="ml-1 text-[#ffe600] text-[10px] font-normal">
                              [⚠️ Dúvida / Rever]
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-black text-[#ffe600]">
                          R$ {line.valor.toFixed(2)}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-black uppercase border ${
                              line.metodo === 'cartao_credito'
                                ? 'border-[#00f0ff] text-[#00f0ff] bg-black'
                                : 'border-[#00ff66] text-[#00ff66] bg-black'
                            }`}
                          >
                            {line.metodo === 'cartao_credito' ? 'CARTÃO' : 'PIX / À VISTA'}
                          </span>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <span className="px-1.5 py-0.2 bg-[#00ff66] text-black text-[9px] font-black uppercase">
                            ✓ PRONTO
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-800 bg-black flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white text-xs font-bold uppercase transition-all"
          >
            CANCELAR
          </button>

          <button
            type="button"
            disabled={validLines.length === 0}
            onClick={handleExecuteImport}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#00ff66] hover:bg-[#00f0ff] disabled:opacity-30 disabled:hover:bg-[#00ff66] text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer neon-glow-green"
          >
            <span>[ 💾 GRAVAR {validLines.length} DESPESAS NO BANCO DE DADOS ]</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
