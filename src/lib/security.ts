export async function sha256Hex(content: string): Promise<string> {
  const encoded = new TextEncoder().encode(content);
  return sha256HexFromBytes(encoded);
}

export async function sha256HexFromBytes(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  const normalizedBytes = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : Uint8Array.from(bytes);
  const hashBuffer = await crypto.subtle.digest('SHA-256', normalizedBytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSignToken(length = 48): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

export function generateAccessCode(): string {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  const code = random[0] % 1000000;
  return code.toString().padStart(6, '0');
}
