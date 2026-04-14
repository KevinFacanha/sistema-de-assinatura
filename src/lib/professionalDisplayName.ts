import type { User } from '@supabase/supabase-js';

const DISPLAY_NAME_METADATA_KEYS = ['full_name', 'name', 'display_name', 'professional_name'] as const;

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeComparable(value: string | null): string | null {
  return value ? value.trim().toLowerCase() : null;
}

function resolveDisplayNameFromMetadata(metadata: Record<string, unknown> | undefined): string | null {
  for (const key of DISPLAY_NAME_METADATA_KEYS) {
    const value = toNonEmptyString(metadata?.[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

export function resolveProfessionalDisplayName(
  profileFullName: string | null,
  user: Pick<User, 'email' | 'user_metadata'> | null,
): string {
  const profileName = toNonEmptyString(profileFullName);
  const email = toNonEmptyString(user?.email);
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const metadataName = resolveDisplayNameFromMetadata(metadata);

  const normalizedProfileName = normalizeComparable(profileName);
  const normalizedEmail = normalizeComparable(email);
  const isProfileNameSameAsEmail =
    normalizedProfileName !== null && normalizedEmail !== null && normalizedProfileName === normalizedEmail;

  return (isProfileNameSameAsEmail ? null : profileName) ?? metadataName ?? email ?? 'Profissional';
}

function formatDateTimeWithSeconds(date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function buildProfessionalSignatureLabel(displayName: string, date = new Date()): string {
  return `Assinado por ${displayName} em ${formatDateTimeWithSeconds(date)}`;
}
