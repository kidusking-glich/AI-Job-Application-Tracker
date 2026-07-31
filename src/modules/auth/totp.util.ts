import { generateSecret, generateURI, verify } from 'otplib';
import { ScureBase32Plugin, NobleCryptoPlugin } from 'otplib';

// otplib v13 is plugin-based: instantiate the Base32 + crypto plugins once.
const base32 = new ScureBase32Plugin();
const crypto = new NobleCryptoPlugin();

export const TOTP_ISSUER = 'Contract Reader';

/** Generate a new random Base32 TOTP secret. */
export function generateTotpSecret(): string {
  return generateSecret();
}

/** Build the otpauth:// URI for the QR code. */
export function buildTotpUri(secret: string, account: string): string {
  return generateURI({ secret, issuer: TOTP_ISSUER, label: account });
}

/** Verify a 6-digit TOTP code against a secret (1 epoch = 30s tolerance for clock skew). */
export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  if (!secret || !code || !/^\d{6}$/.test(code)) {
    return false;
  }
  const result = await verify({ secret, crypto, base32, token: code, epochTolerance: 1 });
  return result.valid === true;
}
