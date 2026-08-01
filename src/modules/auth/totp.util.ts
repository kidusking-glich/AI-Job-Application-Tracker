import { authenticator } from 'otplib';

// otplib v13 is ESM-only and its plugins pull in @scure/base via require(),
// which crashes with ERR_REQUIRE_ESM on Node 20/22 (Vercel's serverless
// runtime). We pin otplib to v12, the classic fully-CommonJS release, which
// works on every Node version.

export const TOTP_ISSUER = 'Contract Reader';

/** Generate a new random Base32 TOTP secret. */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/** Build the otpauth:// URI for the QR code. */
export function buildTotpUri(secret: string, account: string): string {
  return authenticator.keyuri(account, TOTP_ISSUER, secret);
}

/** Verify a 6-digit TOTP code against a secret (window 1 = ±30s clock skew tolerance). */
export function verifyTotpCode(secret: string, code: string): boolean {
  if (!secret || !code || !/^\d{6}$/.test(code)) {
    return false;
  }
  authenticator.options = { window: 1 };
  return authenticator.check(code, secret);
}
