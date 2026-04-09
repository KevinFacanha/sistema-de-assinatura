function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return null;
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');

  try {
    const parsed = new URL(withoutTrailingSlash);
    return parsed.toString().replace(/\/$/, '');
  } catch {
    console.warn('VITE_APP_BASE_URL inválida. Usando fallback local, quando disponível.');
    return null;
  }
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function getPublicAppBaseUrl(): string | null {
  const envBaseUrl = normalizeBaseUrl(import.meta.env.VITE_APP_BASE_URL);
  if (envBaseUrl) {
    return envBaseUrl;
  }

  if (typeof window !== 'undefined' && isLocalHostname(window.location.hostname)) {
    return window.location.origin;
  }

  return null;
}

export function buildPatientSignUrl(token: string): string | null {
  if (!token) {
    return null;
  }

  const baseUrl = getPublicAppBaseUrl();
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/sign/${token}`;
}
