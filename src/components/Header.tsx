import React from 'react';
import { 
  Shield, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Terminal, 
  Code2, 
  Calculator, 
  BookOpen, 
  AlertTriangle,
  Tv,
  Cpu,
  Eye,
  EyeOff
} from 'lucide-react';
import { BurnRateMetrics, SystemSettings } from '../types/sentinela';
import { sound } from '../lib/sound';
import { formatCurrency } from '../lib/format';

interface HeaderProps {
  metrics: BurnRateMetrics;
  settings: SystemSettings;
  activeTab: 'cockpit' | 'python_code' | 'simulator' | 'nudge_manual';
  setActiveTab: (tab: 'cockpit' | 'python_code' | 'simulator' | 'nudge_manual') => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  crtEnabled: boolean;
  setCrtEnabled: (val: boolean) => void;
  showValues: boolean;
  onToggleShowValues: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  settings,
  activeTab,
  setActiveTab,
  isMuted,
  setIsMuted,
  crtEnabled,
  setCrtEnabled,
  showValues,
  onToggleShowValues,
}) => {
  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
    if (!next) sound.playTick();
  };

  const handleToggleValues = () => {
    sound.playTick();
    onToggleShowValues();
  };

  const getStatusBadge = () => {
    switch (metrics.status_alerta) {
      case 'COLAPSO':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-black border border-[#ff0055] text-[#ff0055] font-mono text-[11px] font-bold neon-glow-pink animate-pulse">
            <span className="w-2 h-2 bg-[#ff0055] inline-block animate-ping" />
            <span>[DEFCON_1 :: BUDGET_FLATLINE]</span>
          </div>
        );
      case 'CRITICO':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-black border border-[#ff0055] text-[#ff3377] font-mono text-[11px] font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-[#ff0055]" />
            <span>[THREAT_LEVEL: CRITICAL]</span>
          </div>
        );
      case 'ATENCAO':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-black border border-[#ffe600] text-[#ffe600] font-mono text-[11px] font-bold neon-glow-yellow">
            <AlertTriangle className="w-3.5 h-3.5 text-[#ffe600]" />
            <span>[CEILING_STRAIN :: NARROW_WINDOW]</span>
          </div>
        );
      case 'NORMAL':
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-black border border-[#00ff66] text-[#00ff66] font-mono text-[11px] font-bold neon-glow-green">
            <span className="w-2 h-2 rounded-full bg-[#00ff66]" />
            <span>[SYS_OK :: CONTAINMENT_ACTIVE]</span>
          </div>
        );
    }
  };

  const valorHora = settings.renda_mensal / Math.max(1, settings.horas_trabalho_mes);
  const isHidden = !showValues;

  return (
    <header className="border-b border-[#00f0ff]/30 bg-[#04060c]/95 backdrop-blur-md sticky top-0 z-30 font-mono">
      {/* Top Telemetry Ticker */}
      <div className="border-b border-[#141b2e] bg-[#020306] px-4 py-1 text-[10px] text-[#00f0ff]/70 flex items-center justify-between overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-3">
          <span className="text-[#00ff66] flex items-center gap-1">
            <Cpu className="w-3 h-3 text-[#00ff66]" /> NETRUNNER_DECK // SENTINELA_SYS v2.4
          </span>
          <span className="text-neutral-700">|</span>
          <span className="text-neutral-400">HOST: 127.0.0.1</span>
          <span className="text-neutral-700">|</span>
          <span className="text-[#ffe600]">
            LABOR_CONVERSION: {formatCurrency(valorHora, isHidden)}/HR (88H PCD)
          </span>
          <span className="text-neutral-700">|</span>
          <span className="text-[#ff0055]">
            EMERGENCY_RESERVE: {formatCurrency(1400, isHidden)} [SEALED]
          </span>
        </div>
        <div className="flex items-center gap-3 text-neutral-500">
          <span>PORT: 3000 // STREAMLIT_READY</span>
          <span className="text-[#00f0ff] animate-pulse">● ICE_WALL_ACTIVE</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Main Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-[#00f0ff] bg-black text-[#00f0ff] flex items-center justify-center neon-glow-cyan">
              <Shield className="w-5 h-5 text-[#00f0ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-widest text-[#00f0ff] uppercase">
                  SISTEMA SENTINELA
                </h1>
                <span className="px-1.5 py-0.2 bg-[#ff0055] text-black text-[10px] font-black tracking-wider uppercase">
                  CYBER-DECK
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center gap-2 flex-wrap mt-0.5">
                <span className="text-[#00ff66]">[PCD_MEIO_PERIODO]</span>
                <span className="text-neutral-600">//</span>
                <button
                  type="button"
                  onClick={handleToggleValues}
                  className="flex items-center gap-1.5 px-2 py-0.5 border border-[#ffe600]/50 bg-[#0f0e03] text-[#ffe600] hover:bg-[#ffe600]/20 transition-all cursor-pointer rounded-sm"
                  title="Clique para alternar o modo de privacidade (Ocultar Renda de R$ 850)"
                >
                  {showValues ? (
                    <Eye className="w-3.5 h-3.5 text-[#ffe600]" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-[#ffe600]" />
                  )}
                  <span className="font-bold tracking-wider">
                    RENDA: {formatCurrency(settings.renda_mensal, isHidden)}
                  </span>
                  <span className="text-[9px] text-neutral-400">
                    ({showValues ? 'CLIQUE P/ OCULTAR' : 'OCULTA'})
                  </span>
                </button>
                <span className="text-neutral-600">//</span>
                <span className="text-[#00f0ff]">BURN_CEILING_ALGORITHM</span>
              </div>
            </div>
          </div>

          {/* Status Badge & Cyberpunk Hardware Toggles */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
            {getStatusBadge()}

            {/* Privacy Mode Toggle: MOSTRAR RENDA / OCULTAR RENDA */}
            <button
              onClick={handleToggleValues}
              className={`px-3 py-1.5 border text-xs transition-all flex items-center gap-1.5 cursor-pointer font-bold ${
                showValues
                  ? 'border-[#ffe600]/70 bg-black text-[#ffe600] hover:bg-[#ffe600]/20'
                  : 'border-[#ffe600] bg-[#ffe600] text-black neon-glow-yellow'
              }`}
              title={showValues ? 'Ocultar renda e valores sensíveis' : 'Mostrar renda e valores sensíveis'}
            >
              {showValues ? (
                <Eye className="w-4 h-4 text-[#ffe600]" />
              ) : (
                <EyeOff className="w-4 h-4 text-black" />
              )}
              <span className="text-[11px] uppercase tracking-wider">
                {showValues ? 'OCULTAR RENDA' : 'MOSTRAR RENDA'}
              </span>
            </button>

            {/* CRT Scanline Toggle */}
            <button
              onClick={() => setCrtEnabled(!crtEnabled)}
              className={`p-1.5 border text-xs transition-all flex items-center gap-1 cursor-pointer ${
                crtEnabled
                  ? 'border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff] neon-glow-cyan'
                  : 'border-neutral-800 text-neutral-600 hover:text-neutral-400'
              }`}
              title="Alternar Efeito de Scanlines CRT"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="text-[10px]">CRT</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`p-1.5 border text-xs transition-all flex items-center gap-1 cursor-pointer ${
                isMuted
                  ? 'border-neutral-800 text-neutral-600 hover:text-neutral-400'
                  : 'border-[#ff0055] bg-[#ff0055]/10 text-[#ff0055] neon-glow-pink'
              }`}
              title={isMuted ? 'Ativar sintetizador sonoro' : 'Silenciar sintetizador sonoro'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{isMuted ? 'MUTE' : 'AUDIO'}</span>
            </button>
          </div>
        </div>

        {/* Cyberpunk Tiled Tab Bar */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#141b2e] overflow-x-auto text-xs pb-0.5">
          <button
            onClick={() => setActiveTab('cockpit')}
            className={`flex items-center gap-2 px-3 py-1.5 transition-all text-xs font-bold uppercase whitespace-nowrap border cursor-pointer ${
              activeTab === 'cockpit'
                ? 'border-[#00ff66] bg-[#00ff66] text-black font-black neon-glow-green'
                : 'border-[#00ff66]/40 bg-[#030e07] text-[#00ff66] hover:bg-[#00ff66]/10'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>[ 01 // COCKPIT_OPERACIONAL ]</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3 py-1.5 transition-all text-xs font-bold uppercase whitespace-nowrap border cursor-pointer ${
              activeTab === 'simulator'
                ? 'border-[#ffe600] bg-[#ffe600] text-black font-black neon-glow-yellow'
                : 'border-[#ffe600]/40 bg-[#0f0e03] text-[#ffe600] hover:bg-[#ffe600]/10'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>[ 02 // SIMULADOR_QUEIMA ]</span>
          </button>

          <button
            onClick={() => setActiveTab('python_code')}
            className={`flex items-center gap-2 px-3 py-1.5 transition-all text-xs font-bold uppercase whitespace-nowrap border cursor-pointer ${
              activeTab === 'python_code'
                ? 'border-[#00f0ff] bg-[#00f0ff] text-black font-black neon-glow-cyan'
                : 'border-[#00f0ff]/40 bg-[#030c12] text-[#00f0ff] hover:bg-[#00f0ff]/10'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>[ 03 // CÓDIGO_PYTHON & ARQUITETURA ]</span>
          </button>

          <button
            onClick={() => setActiveTab('nudge_manual')}
            className={`flex items-center gap-2 px-3 py-1.5 transition-all text-xs font-bold uppercase whitespace-nowrap border cursor-pointer ${
              activeTab === 'nudge_manual'
                ? 'border-[#ff0055] bg-[#ff0055] text-black font-black neon-glow-pink'
                : 'border-[#ff0055]/40 bg-[#120308] text-[#ff0055] hover:bg-[#ff0055]/10'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>[ 04 // NUDGE_THEORY_MANUAL ]</span>
          </button>
        </div>
      </div>
    </header>
  );
};
