export interface JwtPayload {
  readonly userId?: number;
  readonly iat?: number;
  readonly exp?: number;
}

export function decodeJwt(token: string | null): JwtPayload | null {
  const segment = token?.split('.')[1];
  if (!segment) return null;

  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));

    if (typeof parsed !== 'object' || parsed === null) return null;

    const { exp } = parsed as { exp?: unknown };
    if (exp !== undefined && typeof exp !== 'number') return null;

    return parsed as JwtPayload;
  } catch {
    return null;
  }
}