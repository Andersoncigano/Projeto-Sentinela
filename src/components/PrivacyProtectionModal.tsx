import React, { useState } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Key, 
  FileLock2, 
  Trash2, 
  AlertTriangle, 
  Download, 
  Upload, 
  CheckCircle2, 
  X,
  ServerOff,
  HardDrive,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { 
  PrivacySettings, 
  STEALTH_ALIAS_MAP, 
  hashPin, 
  encryptData, 
  decryptData 
} from '../lib/privacy';
import { ExpenseRecord, DebtRecord, SystemSettings } from '../types/sentinela';
import { sound } from '../lib/sound';

interface PrivacyProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  privacy: PrivacySettings;
  onUpdatePrivacy: (newSettings: Partial<PrivacySettings>) => void;
  expenses: ExpenseRecord[];
  debts: DebtRecord[];
  settings: SystemSettings;
  onRestoreAllData: (data: { expenses: ExpenseRecord[]; debts: DebtRecord[]; settings: SystemSettings }) => void;
  onPanicPurge: () => void;
  onLockTerminalNow: () => void;
}

export const PrivacyProtectionModal: React.FC<PrivacyProtectionModalProps> = ({
  isOpen,
  onClose,
  privacy,
  onUpdatePrivacy,
  expenses,
  debts,
  settings,
  onRestoreAllData,
  onPanicPurge,
  onLockTerminalNow,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'stealth' | 'pin' | 'backup' | 'panic'>('audit');

  // PIN Form States
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinFeedback, setPinFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Backup Form States
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmBackupPassword, setConfirmBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null);

  // Panic Confirmation
  const [panicStep, setPanicStep] = useState<1 | 2>(1);

  if (!isOpen) return null;

  // Gerenciamento de PIN
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(newPin)) {
      setPinFeedback({ type: 'error', msg: 'O PIN deve conter exatamente entre 4 e 6 dígitos numéricos.' });
      sound.playFrictionAlert();
      return;
    }
    if (newPin !== confirmPin) {
      setPinFeedback({ type: 'error', msg: 'Os PINs digitados não coincidem.' });
      sound.playFrictionAlert();
      return;
    }

    try {
      const hash = await hashPin(newPin);
      onUpdatePrivacy({
        pinEnabled: true,
        pinHash: hash,
      });
      sound.playSuccess();
      setPinFeedback({ type: 'success', msg: '✓ PIN criptografado configurado com sucesso! O terminal agora está protegido.' });
      setNewPin('');
      setConfirmPin('');
    } catch {
      setPinFeedback({ type: 'error', msg: 'Erro ao gerar hash de segurança do PIN.' });
    }
  };

  const handleDisablePin = () => {
    sound.playTick();
    onUpdatePrivacy({
      pinEnabled: false,
      pinHash: '',
    });
    setPinFeedback({ type: 'success', msg: 'Cofre com PIN desativado. O terminal iniciará sem tela de bloqueio.' });
  };

  // Exportação com Criptografia AES-GCM 256-bit
  const handleExportEncryptedBackup = async () => {
    if (!backupPassword || backupPassword.length < 6) {
      setBackupStatus('⚠️ Digite uma senha de pelo menos 6 caracteres para criptografar.');
      sound.playFrictionAlert();
      return;
    }
    if (backupPassword !== confirmBackupPassword) {
      setBackupStatus('⚠️ As senhas de backup não coincidem.');
      sound.playFrictionAlert();
      return;
    }

    try {
      setBackupStatus('🔄 Criptografando com AES-GCM 256-bit (PBKDF2 100k)...');
      const payload = JSON.stringify({
        version: 'sentinela_vault_v2',
        exportedAt: new Date().toISOString(),
        expenses,
        debts,
        settings,
      });

      const encrypted = await encryptData(payload, backupPassword);
      const vaultBlob = new Blob([JSON.stringify(encrypted, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(vaultBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinela-cofre-criptografado-${new Date().toISOString().split('T')[0]}.sentinela-vault`;
      a.click();
      URL.revokeObjectURL(url);

      sound.playSuccess();
      setBackupStatus('✓ Cofre criptografado exportado com sucesso! Guarde sua senha para descriptografar.');
      setBackupPassword('');
      setConfirmBackupPassword('');
    } catch {
      setBackupStatus('❌ Erro durante o processo de criptografia.');
    }
  };

  // Leitura do arquivo de backup
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setRestoreFileContent(event.target?.result as string);
      setBackupStatus('📄 Arquivo carregado. Digite a senha utilizada na exportação:');
    };
    reader.readAsText(file);
  };

  // Restauração do backup criptografado
  const handleRestoreEncryptedBackup = async () => {
    if (!restoreFileContent) {
      setBackupStatus('⚠️ Selecione um arquivo de backup antes.');
      return;
    }
    if (!restorePassword) {
      setBackupStatus('⚠️ Digite a senha do backup.');
      return;
    }

    try {
      setBackupStatus('🔄 Decodificando cofre seguro...');
      const parsedCipher = JSON.parse(restoreFileContent);
      const decryptedText = await decryptData(parsedCipher, restorePassword);
      const data = JSON.parse(decryptedText);

      if (!data.expenses || !Array.isArray(data.expenses)) {
        throw new Error('Formato inválido');
      }

      onRestoreAllData({
        expenses: data.expenses,
        debts: data.debts || [],
        settings: data.settings || settings,
      });

      sound.playSuccess();
      setBackupStatus('✓ [SUCESSO] Cofre restaurado com sucesso!');
      setRestorePassword('');
      setRestoreFileContent(null);
    } catch {
      sound.playFrictionAlert();
      setBackupStatus('❌ Senha incorreta ou arquivo corrompido! Não foi possível abrir o cofre.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#030611] border-2 border-[#00f0ff] shadow-2xl shadow-[#00f0ff]/20 text-[#e0f2fe] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-[#00f0ff]/30 bg-[#02040a] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 border border-[#00f0ff] bg-black flex items-center justify-center text-[#00f0ff] neon-glow-cyan">
              <Shield className="w-5 h-5 text-[#00f0ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-[#00f0ff] uppercase tracking-wider">
                  CENTRAL DE PROTEÇÃO & PRIVACIDADE
                </h2>
                <span className="px-1.5 py-0.2 bg-[#00ff66] text-black text-[10px] font-black uppercase">
                  AIR_GAPPED
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Garantia de isolamento local, mascaramento contra olhares e criptografia de ponta a ponta
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Fechar Central de Proteção"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-[#060919] border-b border-[#141b2e] overflow-x-auto flex-shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 border transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-[#00ff66] bg-[#00ff66] text-black font-black neon-glow-green'
                : 'border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>01 AUDITORIA DE VAZAMENTO</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stealth')}
            className={`px-3 py-1.5 border transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stealth'
                ? 'border-[#00f0ff] bg-[#00f0ff] text-black font-black neon-glow-cyan'
                : 'border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>02 CAMUFLAGEM & STEALTH</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pin')}
            className={`px-3 py-1.5 border transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pin'
                ? 'border-[#ffe600] bg-[#ffe600] text-black font-black neon-glow-yellow'
                : 'border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>03 COFRE TERMINAL (PIN)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 border transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'border-[#bd00ff] bg-[#bd00ff] text-white font-black'
                : 'border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <FileLock2 className="w-3.5 h-3.5" />
            <span>04 BACKUP CRIPTOGRAFADO</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('panic')}
            className={`px-3 py-1.5 border transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'panic'
                ? 'border-[#ff0055] bg-[#ff0055] text-white font-black neon-glow-pink'
                : 'border-neutral-800 text-[#ff4d79] hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>05 BOTÃO DE PÂNICO</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* TAB 1: AUDITORIA DE EXPOSIÇÃO / GARANTIA LOCAL-FIRST */}
          {activeTab === 'audit' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-[#011409] border-2 border-[#00ff66] space-y-2">
                <div className="flex items-center gap-2 text-[#00ff66] font-black text-sm">
                  <CheckCircle2 className="w-5 h-5 text-[#00ff66]" />
                  <span>DIAGNÓSTICO: ZERO VAZAMENTO PARA A NUVEM (100% LOCAL-FIRST)</span>
                </div>
                <p className="text-neutral-200 leading-relaxed">
                  O <strong>Sistema Sentinela</strong> opera em arquitetura <em>Air-Gapped Client-Side</em>.
                  Isso significa que <strong>nenhum servidor externo, banco de dados em nuvem ou serviço de rastreamento</strong> recebe sua renda, despesas, datas ou nomes cadastrados.
                </p>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-black/80 border border-neutral-700 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#00ff66] font-bold">
                    <HardDrive className="w-4 h-4 text-[#00ff66]" />
                    <span>ONDE FICAM SEUS DADOS?</span>
                  </div>
                  <p className="text-neutral-400 text-[11px]">
                    Estritamente no <strong>localStorage</strong> (memória interna do navegador) do seu dispositivo atual.
                  </p>
                </div>

                <div className="p-3 bg-black/80 border border-neutral-700 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#00f0ff] font-bold">
                    <ServerOff className="w-4 h-4 text-[#00f0ff]" />
                    <span>REQUISIÇÕES EXTERNAS:</span>
                  </div>
                  <p className="text-neutral-400 text-[11px]">
                    <strong>0 bytes</strong> trafegados na rede. Todos os cálculos matemáticos ocorrem no processador do seu dispositivo.
                  </p>
                </div>

                <div className="p-3 bg-black/80 border border-neutral-700 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#ffe600] font-bold">
                    <Cpu className="w-4 h-4 text-[#ffe600]" />
                    <span>QUEM PODE VER O SITE?</span>
                  </div>
                  <p className="text-neutral-400 text-[11px]">
                    Outra pessoa que abrir o link em outro computador verá o sistema zerado ou com o padrão. Seus dados adicionados pertencem unicamente ao seu navegador.
                  </p>
                </div>
              </div>

              {/* Resposta direta à preocupação do usuário */}
              <div className="p-3.5 bg-[#001726] border border-[#00f0ff]/50 space-y-2">
                <span className="font-bold text-[#00f0ff] uppercase block">
                  💡 Como trabalhar no projeto com total discrição e tranquilidade:
                </span>
                <ul className="list-disc list-inside space-y-1.5 text-neutral-300 text-[11px]">
                  <li>
                    <strong>Em locais públicos ou compartilhando tela:</strong> Ative o <em>Modo Olho Mágico</em> (oculta valores numéricos) e o <em>Modo Stealth</em> (substitui estabelecimentos como Denis e Abbey por códigos neutros).
                  </li>
                  <li>
                    <strong>Ao se afastar da mesa ou do computador:</strong> Ative o <em>Cofre Terminal</em> com PIN de 4 dígitos ou clique em "Bloquear Agora".
                  </li>
                  <li>
                    <strong>Em caso de emergência ou inspeção:</strong> Use o <em>Botão de Pânico</em> para zerar o cache do navegador instantaneamente.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: CAMUFLAGEM & MODO STEALTH */}
          {activeTab === 'stealth' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 bg-black/80 border border-[#00f0ff] space-y-3">
                <h3 className="font-black text-sm text-[#00f0ff] uppercase flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-[#00f0ff]" />
                  CONTROLES DE CAMUFLAGEM VISUAL
                </h3>
                <p className="text-neutral-300 text-[11px]">
                  Esses dois modos foram criados para você poder usar e gerenciar seu orçamento na frente de outras pessoas sem que ninguém veja seus valores ou saiba onde você gasta.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Modo Olho Mágico */}
                  <div className={`p-3 border transition-all ${
                    privacy.isMasked ? 'border-[#ffe600] bg-[#1a1703]' : 'border-neutral-800 bg-black/60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-[#ffe600]">
                        <Eye className="w-4 h-4" />
                        <span>MODO OLHO MÁGICO</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playTick();
                          onUpdatePrivacy({ isMasked: !privacy.isMasked });
                        }}
                        className={`px-3 py-1 text-xs font-black uppercase transition-all cursor-pointer ${
                          privacy.isMasked
                            ? 'bg-[#ffe600] text-black neon-glow-yellow'
                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {privacy.isMasked ? 'ATIVADO ✓' : 'DESATIVADO'}
                      </button>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-2">
                      Substitui todos os números financeiros (Renda, Saldo, Teto Diário, Fatura e Linhas da Tabela) por <code>R$ •••••</code>.
                    </p>
                  </div>

                  {/* Modo Stealth / Codinomes */}
                  <div className={`p-3 border transition-all ${
                    privacy.isStealth ? 'border-[#00f0ff] bg-[#001726]' : 'border-neutral-800 bg-black/60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-[#00f0ff]">
                        <Shield className="w-4 h-4" />
                        <span>MODO STEALTH (CODINOMES)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playTick();
                          onUpdatePrivacy({ isStealth: !privacy.isStealth });
                        }}
                        className={`px-3 py-1 text-xs font-black uppercase transition-all cursor-pointer ${
                          privacy.isStealth
                            ? 'bg-[#00f0ff] text-black neon-glow-cyan'
                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {privacy.isStealth ? 'ATIVADO ✓' : 'DESATIVADO'}
                      </button>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-2">
                      Substitui nomes de estabelecimentos e fornecedores reais por codinomes operacionais neutros em toda a interface.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabela de Conversão em Tempo Real do Modo Stealth */}
              <div className="border border-neutral-700 bg-black/90 p-3 space-y-2">
                <span className="font-bold text-neutral-300 text-xs block uppercase">
                  🔍 MAPA DE CONVERSÃO STEALTH ATIVO NO SISTEMA:
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase">
                        <th className="py-2 px-2">NOME REAL / PESSOAL</th>
                        <th className="py-2 px-2 text-[#00f0ff]">CODINOME DE CAMUFLAGEM</th>
                        <th className="py-2 px-2 text-neutral-400">CATEGORIA NEUTRA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-[11px]">
                      <tr>
                        <td className="py-2 px-2 font-bold text-[#ff4d79]">Denis roupas / Denis Beulmont</td>
                        <td className="py-2 px-2 font-bold text-[#00f0ff]">Vestuário & Confecção #01</td>
                        <td className="py-2 px-2 text-neutral-400">Varejo Pessoal</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 font-bold text-[#ff4d79]">Abbey / Abbey - Chopp</td>
                        <td className="py-2 px-2 font-bold text-[#00f0ff]">Gastronomia & Convivência #01</td>
                        <td className="py-2 px-2 text-neutral-400">Alimentação & Lazer</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 font-bold text-[#ff4d79]">Lord / Lord - Uber</td>
                        <td className="py-2 px-2 font-bold text-[#00f0ff]">Mobilidade Urbana Particular #01</td>
                        <td className="py-2 px-2 text-neutral-400">Transporte Executivo</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 font-bold text-[#ff4d79]">Uber / 99 / Corridas</td>
                        <td className="py-2 px-2 font-bold text-[#00f0ff]">Transporte por Aplicativo</td>
                        <td className="py-2 px-2 text-neutral-400">Mobilidade Urbana</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 font-bold text-[#ff4d79]">Anderson (Operador)</td>
                        <td className="py-2 px-2 font-bold text-[#00ff66]">Operador [SENTINELA]</td>
                        <td className="py-2 px-2 text-neutral-400">Identidade Protegida</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COFRE TERMINAL & PIN */}
          {activeTab === 'pin' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 bg-black/80 border border-[#ffe600] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#ffe600] font-black text-sm uppercase">
                    <Lock className="w-4 h-4 text-[#ffe600]" />
                    <span>COFRE TERMINAL // BLOQUEIO POR PIN</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                    privacy.pinEnabled
                      ? 'border-[#00ff66] bg-[#00ff66]/20 text-[#00ff66]'
                      : 'border-neutral-700 bg-neutral-900 text-neutral-500'
                  }`}>
                    {privacy.pinEnabled ? 'PROTEÇÃO POR PIN ATIVA' : 'PIN DESATIVADO'}
                  </span>
                </div>

                <p className="text-neutral-300 text-[11px]">
                  Configure um PIN de 4 a 6 dígitos numéricos. Quando ativo, ninguém consegue abrir ou interagir com o Sentinela sem digitar seu código na tela de bloqueio.
                </p>

                {/* Form to Set / Change PIN */}
                <form onSubmit={handleSavePin} className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-neutral-300">
                        {privacy.pinEnabled ? 'DIGITE O NOVO PIN (4 A 6 DÍGITOS):' : 'CRIAR PIN DE ACESSO:'}
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="••••"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-black border border-neutral-700 px-3 py-2 text-sm text-center text-[#ffe600] tracking-widest font-mono focus:border-[#ffe600] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-neutral-300">
                        CONFIRME O PIN:
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="••••"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-black border border-neutral-700 px-3 py-2 text-sm text-center text-[#ffe600] tracking-widest font-mono focus:border-[#ffe600] focus:outline-none"
                      />
                    </div>
                  </div>

                  {pinFeedback && (
                    <div className={`p-2 border text-xs font-bold ${
                      pinFeedback.type === 'success'
                        ? 'border-[#00ff66] bg-[#00ff66]/15 text-[#00ff66]'
                        : 'border-[#ff0055] bg-[#ff0055]/15 text-[#ff0055]'
                    }`}>
                      {pinFeedback.msg}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={newPin.length < 4 || confirmPin.length < 4}
                      className={`px-4 py-2 text-xs font-black uppercase transition-all cursor-pointer ${
                        newPin.length >= 4 && confirmPin.length >= 4
                          ? 'bg-[#ffe600] hover:bg-[#e6cf00] text-black neon-glow-yellow'
                          : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                      }`}
                    >
                      {privacy.pinEnabled ? 'ATUALIZAR MEU PIN' : 'ATIVAR BLOQUEIO POR PIN'}
                    </button>

                    {privacy.pinEnabled && (
                      <button
                        type="button"
                        onClick={handleDisablePin}
                        className="px-3 py-2 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-[#ff0055] hover:border-[#ff0055] text-xs font-bold uppercase transition-all cursor-pointer"
                      >
                        REMOVER PIN
                      </button>
                    )}
                  </div>
                </form>

                {/* Inactivity Auto-Lock Settings */}
                <div className="pt-3 border-t border-neutral-800 space-y-2">
                  <span className="font-bold text-neutral-300 text-xs block uppercase">
                    ⏱️ TEMPORIZADOR DE BLOQUEIO POR INATIVIDADE:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { label: 'DESATIVADO', val: 0 },
                      { label: '1 MINUTO', val: 1 },
                      { label: '2 MINUTOS', val: 2 },
                      { label: '5 MINUTOS', val: 5 },
                      { label: '15 MINUTOS', val: 15 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          sound.playTick();
                          onUpdatePrivacy({ autoLockMinutes: opt.val });
                        }}
                        className={`px-3 py-1.5 border text-xs font-bold transition-all cursor-pointer ${
                          privacy.autoLockMinutes === opt.val
                            ? 'border-[#ffe600] bg-[#ffe600] text-black'
                            : 'border-neutral-800 bg-black text-neutral-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instant Lock Button */}
                {privacy.pinEnabled && (
                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">TESTAR OU TRAVAR AGORA:</span>
                      <span className="text-[10px] text-neutral-400">
                        O terminal será bloqueado imediatamente e só abrirá com o seu PIN.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTick();
                        onClose();
                        onLockTerminalNow();
                      }}
                      className="px-4 py-2 bg-[#ff0055] hover:bg-[#ff3377] text-white font-black text-xs uppercase cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[#ff0055]/30"
                    >
                      <Lock className="w-4 h-4" />
                      <span>BLOQUEAR TERMINAL AGORA</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: BACKUP CRIPTOGRAFADO (AES-GCM 256) */}
          {activeTab === 'backup' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 bg-black/80 border border-[#bd00ff] space-y-3">
                <div className="flex items-center gap-2 text-[#bd00ff] font-black text-sm uppercase">
                  <FileLock2 className="w-4 h-4 text-[#bd00ff]" />
                  <span>BACKUP BLINDADO (CRIPTOGRAFIA MILITAR AES-GCM 256-BIT)</span>
                </div>
                <p className="text-neutral-300 text-[11px] leading-relaxed">
                  Exporte todas as suas despesas, faturas e configurações em um arquivo blindado. Sem sua senha de descriptografia, ninguém conseguirá ler uma única linha do arquivo.
                </p>

                {/* Export Section */}
                <div className="p-3 bg-[#11051b] border border-[#bd00ff]/40 space-y-2">
                  <span className="font-bold text-[#c084fc] text-xs block uppercase">
                    1. EXPORTAR COFRE PROTEGIDO COM SENHA:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="password"
                      placeholder="Criar senha de proteção do backup"
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      className="bg-black border border-neutral-700 px-3 py-1.5 text-xs text-white focus:border-[#bd00ff] focus:outline-none"
                    />
                    <input
                      type="password"
                      placeholder="Confirmar senha"
                      value={confirmBackupPassword}
                      onChange={(e) => setConfirmBackupPassword(e.target.value)}
                      className="bg-black border border-neutral-700 px-3 py-1.5 text-xs text-white focus:border-[#bd00ff] focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExportEncryptedBackup}
                    className="px-4 py-2 bg-[#bd00ff] hover:bg-[#a600e0] text-white text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>BAIXAR ARQUIVO BLINDADO (.SENTINELA-VAULT)</span>
                  </button>
                </div>

                {/* Import / Restore Section */}
                <div className="p-3 bg-[#0a0f1d] border border-neutral-700 space-y-2">
                  <span className="font-bold text-[#00f0ff] text-xs block uppercase">
                    2. RESTAURAR COFRE A PARTIR DE ARQUIVO BLINDADO:
                  </span>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <label className="px-3 py-2 bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#00f0ff]" />
                      <span>SELECIONAR ARQUIVO .SENTINELA-VAULT</span>
                      <input
                        type="file"
                        accept=".sentinela-vault,.json"
                        onChange={handleFileSelected}
                        className="hidden"
                      />
                    </label>

                    <input
                      type="password"
                      placeholder="Senha do arquivo"
                      value={restorePassword}
                      onChange={(e) => setRestorePassword(e.target.value)}
                      className="flex-1 bg-black border border-neutral-700 px-3 py-1.5 text-xs text-white focus:border-[#00f0ff] focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={handleRestoreEncryptedBackup}
                      disabled={!restoreFileContent || !restorePassword}
                      className={`px-4 py-2 text-xs font-black uppercase cursor-pointer transition-all flex items-center gap-1.5 ${
                        restoreFileContent && restorePassword
                          ? 'bg-[#00ff66] text-black hover:bg-[#00cc52]'
                          : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                      }`}
                    >
                      <Unlock className="w-4 h-4" />
                      <span>DESCRIPTOGRAFAR & IMPORTAR</span>
                    </button>
                  </div>
                </div>

                {backupStatus && (
                  <div className="p-2.5 bg-black border border-neutral-700 text-neutral-300 text-xs font-bold">
                    {backupStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: BOTÃO DE PÂNICO & LIMPEZA DE EMERGÊNCIA */}
          {activeTab === 'panic' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-[#19030a] border-2 border-[#ff0055] space-y-3 shadow-xl shadow-[#ff0055]/15">
                <div className="flex items-center gap-2 text-[#ff0055] font-black text-sm uppercase">
                  <AlertTriangle className="w-5 h-5 text-[#ff0055] animate-pulse" />
                  <span>BOTÃO DE PÂNICO // PROTOCOLO DE INCINERAÇÃO DE DADOS</span>
                </div>
                
                <p className="text-neutral-200 text-xs leading-relaxed">
                  Em caso de fiscalização, inspeção indevida ou se você precisar apagar qualquer rastro imediatamente, o <strong>Botão de Pânico</strong> realiza o purge completo de todas as chaves do Sentinela no seu navegador.
                </p>

                <div className="p-3 bg-black/90 border border-[#ff0055]/60 text-neutral-300 text-xs space-y-1">
                  <span className="font-bold text-[#ff4d79] block uppercase">O que este protocolo apaga:</span>
                  <ul className="list-disc list-inside text-neutral-400 space-y-0.5 text-[11px]">
                    <li>Todas as despesas cadastradas no navegador</li>
                    <li>Histórico de faturas, rendas e anotações</li>
                    <li>Chaves e configurações de PIN de segurança</li>
                    <li>Deixa a aplicação zerada e pronta para reinício limpo</li>
                  </ul>
                </div>

                {panicStep === 1 ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playFrictionAlert();
                        setPanicStep(2);
                      }}
                      className="px-5 py-3 bg-[#ff0055] hover:bg-[#ff2266] text-white font-black text-xs uppercase flex items-center gap-2 cursor-pointer shadow-lg shadow-[#ff0055]/30 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                      <span>DISPARAR PROTOCOLO DE PÂNICO (ETAPA 1)</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-black border-2 border-[#ff0055] space-y-3 animate-in shake">
                    <div className="flex items-center gap-2 text-[#ff0055] font-black text-xs uppercase">
                      <AlertTriangle className="w-4 h-4 text-[#ff0055]" />
                      <span>CONFIRMAÇÃO FINAL DE SEGURANÇA:</span>
                    </div>
                    <p className="text-xs text-white font-bold">
                      Tem certeza absoluta de que deseja limpar todos os dados do navegador agora?
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playSuccess();
                          onClose();
                          onPanicPurge();
                        }}
                        className="px-4 py-2 bg-[#ff0055] hover:bg-[#cc0044] text-white font-black text-xs uppercase cursor-pointer"
                      >
                        SIM, EXCLUIR TUDO AGORA
                      </button>
                      <button
                        type="button"
                        onClick={() => setPanicStep(1)}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase cursor-pointer"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#141b2e] bg-[#020409] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
            <span className="text-[#00ff66]">● ICE_WALL PROTECT</span>
            <span>|</span>
            <span>MODO STEALTH: {privacy.isStealth ? 'ATIVO' : 'DESLIGADO'}</span>
            <span>|</span>
            <span>MÁSCARA: {privacy.isMasked ? 'ATIVA' : 'DESLIGADA'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 bg-[#00f0ff] hover:bg-[#00d0df] text-black font-black uppercase text-xs cursor-pointer transition-all"
          >
            CONCLUIR E FECHAR
          </button>
        </div>

      </div>
    </div>
  );
};
