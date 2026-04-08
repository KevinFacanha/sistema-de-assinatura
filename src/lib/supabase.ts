import { createClient } from '@supabase/supabase-js';

function normalizeEnv(value: string | undefined): string {
  return (value ?? '').trim();
}

function getProjectRefFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    if (!hostname.endsWith('.supabase.co')) {
      return null;
    }
    return hostname.replace('.supabase.co', '');
  } catch {
    return null;
  }
}

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split('.');
  if (parts.length < 2) return null;

  try {
    const payload = parts[1];
    const normalized = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob(normalized.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getProjectRefFromAnonKey(key: string): string | null {
  const payload = decodeJwtPayload(key);
  const ref = payload?.ref;
  return typeof ref === 'string' ? ref : null;
}

const supabaseUrl = normalizeEnv(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local.',
  );
}

const refFromUrl = getProjectRefFromUrl(supabaseUrl);
const refFromKey = getProjectRefFromAnonKey(supabaseAnonKey);

if (refFromUrl && refFromKey && refFromUrl !== refFromKey) {
  throw new Error(
    `Configuração do Supabase inválida: VITE_SUPABASE_URL (${refFromUrl}) e VITE_SUPABASE_ANON_KEY (${refFromKey}) apontam para projetos diferentes.`,
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getSupabaseConfigSummary() {
  return {
    url: supabaseUrl,
    refFromUrl,
    refFromKey,
  };
}
