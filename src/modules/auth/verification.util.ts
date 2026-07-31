import { createHash, randomBytes } from 'crypto';

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function buildVerificationUrl(frontendUrl: string, token: string): string {
  return `${frontendUrl}/verify-email?token=${token}`;
}
