import React from 'react';
import { Brain, Zap, Scale, ShieldAlert, Clock } from 'lucide-react';

export const NudgeManualTab: React.FC = () => {
  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="border border-[#bd00ff]/40 bg-[#08020d]/95 p-4 shadow-xl">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#bd00ff] text-black font-extrabold text-[11px] tracking-wider uppercase mb-1">
          <Brain className="w-3.5 h-3.5 text-black" />
          <span>[ MANUAL DE ECONOMIA COMPORTAMENTAL // NUDGE THEORY ]</span>
        </div>
        <p className="text-xs text-neutral-400 mt-1">
          Arquitetura cognitiva projetada para neutralizar a miopia intertemporal e a dissipação de capital em indivíduos sob restrição severa de renda.
        </p>
      </div>

      {/* Grid of 4 Cyber Cognitive Defense Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Node 1: Labor Conversion */}
        <div className="border border-[#00f0ff]/40 bg-[#04060d]/95 p-4 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#00f0ff] text-black font-bold text-[10px] uppercase">
            <Scale className="w-3 h-3 text-black" />
            <span>01 // LABOR CONVERSION (AVERSÃO À PERDA)</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            <strong>Gatilho Comportamental:</strong> A abstração digital do Pix anestesia o cérebro límbico. O usuário não sente a dor física da queima de R$ 45,00.
          </p>
          <div className="p-2.5 bg-black border border-[#00f0ff]/30 text-xs text-neutral-300">
            <span className="text-[#00f0ff] font-bold block mb-1 uppercase text-[10px]">// Mecanismo Sentinela:</span>
            O sistema converte instantaneamente qualquer valor em <strong>horas de trabalho PCD</strong>. 
            Com R$ 850 para 88 horas mensais (~R$ 9,66/h), um iFood de R$ 48,00 aciona a mensagem:
            <span className="text-[#ff0055] font-black block mt-1 uppercase">
              "5 HORAS INTEIRAS DE PÉ NO SEU TURNO DE TRABALHO PCD SACRIFICADAS!"
            </span>
          </div>
        </div>

        {/* Node 2: Cooling-off */}
        <div className="border border-[#ff0055]/40 bg-[#04060d]/95 p-4 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#ff0055] text-black font-bold text-[10px] uppercase">
            <Zap className="w-3 h-3 text-black" />
            <span>02 // BUFFER NEURAL & DESACELERAÇÃO (COOLING-OFF)</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            <strong>Gatilho Comportamental:</strong> A dopamina pré-consumo dura entre 10 e 20 segundos. Sob seu efeito, o Sistema 1 (impulsivo) ignora riscos futuros.
          </p>
          <div className="p-2.5 bg-black border border-[#ff0055]/30 text-xs text-neutral-300">
            <span className="text-[#ff0055] font-bold block mb-1 uppercase text-[10px]">// Mecanismo Sentinela:</span>
            Trava forçada de 10 segundos com cores de alerta em saturação máxima e botão de fuga dominante 
            <code>[ 🛡️ ABORTAR COMPRA ]</code>, permitindo que o córtex pré-frontal reassuma o controle da decisão.
          </div>
        </div>

        {/* Node 3: Moving Ceiling */}
        <div className="border border-[#ffe600]/40 bg-[#04060d]/95 p-4 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#ffe600] text-black font-bold text-[10px] uppercase">
            <Clock className="w-3 h-3 text-black" />
            <span>03 // TETO MÓVEL DIÁRIO (DAILY BURN RATE)</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            <strong>Gatilho Comportamental:</strong> O viés de abundância no início do mês ("tenho R$ 450") faz o usuário queimar o saldo antes do dia 15.
          </p>
          <div className="p-2.5 bg-black border border-[#ffe600]/30 text-xs text-neutral-300">
            <span className="text-[#ffe600] font-bold block mb-1 uppercase text-[10px]">// Mecanismo Sentinela:</span>
            Fragmentação temporal: <code>Saldo Livre / Dias Restantes</code>. 
            Se cometer um excesso hoje, o teto diário de amanhã cai instantaneamente, forçando a dor da consequência de forma imediata.
          </div>
        </div>

        {/* Node 4: Mother's Debt Escrow */}
        <div className="border border-[#00ff66]/40 bg-[#04060d]/95 p-4 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#00ff66] text-black font-bold text-[10px] uppercase">
            <ShieldAlert className="w-3 h-3 text-black" />
            <span>04 // ESCROW COMPULSÓRIO DE PASSIVO FAMILIAR</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            <strong>Gatilho Comportamental:</strong> O uso do cartão de crédito de terceiros (mãe) cria risco moral (moral hazard) e ilusão de crédito infinito.
          </p>
          <div className="p-2.5 bg-black border border-[#00ff66]/30 text-xs text-neutral-300">
            <span className="text-[#00ff66] font-bold block mb-1 uppercase text-[10px]">// Mecanismo Sentinela:</span>
            A amortização da dívida familiar é sequestrada compulsoriamente no dia 1 do mês, antes de liberar qualquer centavo para gastos supérfluos.
          </div>
        </div>
      </div>
    </div>
  );
};
