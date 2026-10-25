/**
 * Sentinela Cyberpunk Privacy & Security Engine
 * 100% Client-Side / Local-First Zero-Leakage Architecture
 */

export interface PrivacySettings {
  isMasked: boolean; // Oculta todos os números financeiros (R$ •••••)
  isStealth: boolean; // Substitui estabelecimentos e nomes reais por codinomes técnicos
  pinEnabled: boolean; // Ativa cofre com PIN de 4 a 6 dígitos
  pinHash: string; // Hash SHA-256 do PIN para conferência segura
  autoLockMinutes: number; // 0 = desativado, 1, 2, 5, 15 min de inatividade
  lastActivity: number; // Timestamp da última interação
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  isMasked: false,
  isStealth: false,
  pinEnabled: false,
  pinHash: '',
  autoLockMinutes: 5,
  lastActivity: Date.now(),
};

/**
 * Tabela de Codinomes do Modo Stealth
 * Substitui dados que identificam hábitos, locais ou pessoas por identificadores operacionais neutros.
 */
export const STEALTH_ALIAS_MAP: Array<{ match: (text: string) => boolean; alias: string; category: string }> = [
  {
    match: (t) => t.includes('denis') || t.includes('beulmont') || t.includes('roupas'),
    alias: 'Vestuário & Confecção #01',
    category: 'Varejo Pessoal',
  },
  {
    match: (t) => t.includes('abbey') || t.includes('chopp') || t.includes('cerveja'),
    alias: 'Gastronomia & Convivência #01',
    category: 'Alimentação & Lazer',
  },
  {
    match: (t) => t.includes('lord') && t.includes('uber'),
    alias: 'Mobilidade Urbana Particular #01',
    category: 'Transporte Executivo',
  },
  {
    match: (t) => t.includes('lord') && !t.includes('uber'),
    alias: 'Lazer & Entretenimento #02',
    category: 'Lazer / Convivência',
  },
  {
    match: (t) => t.includes('uber') || t.includes('99') || t.includes('corrida'),
    alias: 'Transporte por Aplicativo',
    category: 'Mobilidade Urbana',
  },
  {
    match: (t) => t.includes('anderson'),
    alias: 'Operador [SENTINELA]',
    category: 'Identidade Operacional',
  },
  {
    match: (t) => t.includes('rescisão') || t.includes('rescisao'),
    alias: 'Verba Extraordinária #01',
    category: 'Aporte de Transição',
  },
  {
    match: (t) => t.includes('salário') || t.includes('salario'),
    alias: 'Provento Mensal #01',
    category: 'Receita Ordinária',
  },
];

/**
 * Retorna o codinome do estabelecimento se o Modo Stealth estiver ativo
 */
export function anonymizeMerchant(description: string, isStealth: boolean): string {
  if (!isStealth || !description) return description;

  const lower = description.toLowerCase().trim();
  for (const item of STEALTH_ALIAS_MAP) {
    if (item.match(lower)) {
      return item.alias;
    }
  }

  // Fallback caso não encontre no mapa: Se parecer nome pessoal com mais de 2 palavras, camufla
  if (lower.length > 3 && !lower.startsWith('despesa') && !lower.startsWith('gasto')) {
    return `Operação #${description.slice(0, 3).toUpperCase()}-${description.length * 7}`;
  }

  return description;
}

/**
 * Criptografia SHA-256 para PIN usando Web Crypto API nativa do navegador
 */
export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`sentinela_salt_v2_${pin}_cyber_vault`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Deriva uma chave AES-GCM a partir de uma senha de texto usando PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografa string com AES-GCM 256-bit
 */
export async function encryptData(
  plainText: string,
  password: string
): Promise<{ ciphertext: string; salt: string; iv: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const enc = new TextEncoder();
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    enc.encode(plainText)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer))),
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Descriptografa string com AES-GCM 256-bit
 */
export async function decryptData(
  encrypted: { ciphertext: string; salt: string; iv: string },
  password: string
): Promise<string> {
  const salt = Uint8Array.from(atob(encrypted.salt), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));

  const key = await deriveKey(password, salt);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    cipherBytes as any
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}
