import { AuthService } from './auth.service';
import {
  BadRequestException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// bcrypt's exports are read-only under CommonJS interop, so jest.spyOn fails.
// Use a module mock instead.
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// otplib v13 ships ESM/TS sources in node_modules that Jest's default transform
// pipeline cannot parse. This spec only exercises resetPassword, so stub otplib
// with the exact exports totp.util.ts expects at module load.
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'FAKESECRET'),
  generateURI: jest.fn(() => 'otpauth://totp/test@example.com'),
  verify: jest.fn(() => ({ valid: true })),
  ScureBase32Plugin: class {},
  NobleCryptoPlugin: class {},
}));

const mockedHash = bcrypt.hash as jest.Mock;
const mockedCompare = bcrypt.compare as jest.Mock;

describe('AuthService resetPassword token invalidation', () => {
  let prisma: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new AuthService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { log: jest.fn() } as any,
    );
    mockedHash.mockReset();
    mockedHash.mockResolvedValue('hashed-new-password');
  });

  it('rejects an unknown or missing token', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.resetPassword({ token: 'nope', password: 'newpass123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects an expired reset token', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      resetPasswordTokenExpiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      service.resetPassword({ token: 'expired', password: 'newpass123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('updates the password and bumps tokenVersion so all old JWTs die', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      resetPasswordTokenExpiresAt: new Date(Date.now() + 60_000),
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    const result = await service.resetPassword({
      token: 'valid-token',
      password: 'newpass123',
    });

    expect(mockedHash).toHaveBeenCalledWith('newpass123', 10);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        password: 'hashed-new-password',
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        tokenVersion: { increment: 1 },
      },
    });
    expect(result.message).toContain('reset');
  });
});

describe('AuthService login security events', () => {
  let prisma: any;
  let jwtService: any;
  let securityLog: any;
  let service: AuthService;

  const baseUser = {
    id: 'user-1',
    email: 'owner@example.com',
    password: 'hashed-password',
    tokenVersion: 0,
    emailVerifiedAt: new Date(),
    twoFactorEnabled: false,
    twoFactorSecret: null,
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
    };
    jwtService = { sign: jest.fn(() => 'mocked-token') };
    securityLog = { log: jest.fn() };
    service = new AuthService(
      prisma,
      jwtService,
      {} as any,
      {} as any,
      {} as any,
      securityLog,
    );
    mockedCompare.mockReset();
  });

  it('logs LOGIN_FAILED with reason invalid_credentials when the user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nobody@example.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(securityLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_FAILED',
        metadata: { reason: 'invalid_credentials' },
      }),
    );
  });

  it('logs LOGIN_FAILED with reason invalid_password on a wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);
    mockedCompare.mockResolvedValue(false);

    await expect(
      service.login({ email: baseUser.email, password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(securityLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_FAILED',
        metadata: { reason: 'invalid_password' },
      }),
    );
  });

  it('logs LOGIN_MFA_REQUIRED when 2FA gates the login and returns a ticket', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      twoFactorEnabled: true,
      twoFactorSecret: 'SECRET',
    });
    mockedCompare.mockResolvedValue(true);

    const result = await service.login({
      email: baseUser.email,
      password: 'right',
    });
    expect(result).toEqual({
      requiresTwoFactor: true,
      mfaToken: 'mocked-token',
    });
    expect(securityLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_MFA_REQUIRED',
        userId: baseUser.id,
      }),
    );
    expect(securityLog.log).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_SUCCESS' }),
    );
  });

  it('logs LOGIN_SUCCESS on a successful non-2FA login', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);
    mockedCompare.mockResolvedValue(true);

    const result = await service.login({
      email: baseUser.email,
      password: 'right',
    });
    expect(result.access_token).toBe('mocked-token');
    expect(securityLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_SUCCESS', userId: baseUser.id }),
    );
  });
});

describe('AuthService login rate limiting', () => {
  let prisma: any;
  let jwtService: any;
  let securityLog: any;
  let service: AuthService;

  const baseUser = {
    id: 'user-1',
    email: 'owner@example.com',
    password: 'hashed-password',
    tokenVersion: 0,
    emailVerifiedAt: new Date(),
    twoFactorEnabled: false,
    twoFactorSecret: null,
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
    };
    jwtService = { sign: jest.fn(() => 'mocked-token') };
    securityLog = { log: jest.fn() };
    service = new AuthService(
      prisma,
      jwtService,
      {} as any,
      {} as any,
      {} as any,
      securityLog,
    );
    mockedCompare.mockReset();
  });

  async function expectTooManyRequests(
    promise: Promise<unknown>,
  ): Promise<void> {
    await expect(promise).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  }

  it('blocks a 6th consecutive failed login for the same email+IP', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);
    mockedCompare.mockResolvedValue(false);

    for (let i = 0; i < 5; i++) {
      await expect(
        service.login(
          { email: baseUser.email, password: 'wrong' },
          { ip: '1.2.3.4' },
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }

    await expectTooManyRequests(
      service.login(
        { email: baseUser.email, password: 'wrong' },
        { ip: '1.2.3.4' },
      ),
    );
  });

  it('does not write a security log row for a throttled attempt', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);
    mockedCompare.mockResolvedValue(false);

    for (let i = 0; i < 6; i++) {
      try {
        await service.login(
          { email: baseUser.email, password: 'wrong' },
          { ip: '5.6.7.8' },
        );
      } catch {
        // expected
      }
    }

    // Only the first 5 failures get logged; the throttled attempt does not.
    expect(securityLog.log).toHaveBeenCalledTimes(5);
  });

  it('resets the per-account counter after a successful login', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);

    mockedCompare.mockResolvedValue(false);
    for (let i = 0; i < 3; i++) {
      await expect(
        service.login(
          { email: baseUser.email, password: 'wrong' },
          { ip: '9.9.9.9' },
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }

    // A successful login clears the counter for that account+IP.
    mockedCompare.mockResolvedValue(true);
    const result = await service.login(
      { email: baseUser.email, password: 'right' },
      { ip: '9.9.9.9' },
    );
    expect(result.access_token).toBe('mocked-token');

    // Failing again starts from a clean slate — Unauthorized, not 429.
    mockedCompare.mockResolvedValue(false);
    await expect(
      service.login(
        { email: baseUser.email, password: 'wrong' },
        { ip: '9.9.9.9' },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throttles by IP across different accounts (credential stuffing)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    for (let i = 0; i < 20; i++) {
      await expect(
        service.login(
          { email: `user${i}@example.com`, password: 'x' },
          { ip: '3.3.3.3' },
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }

    await expectTooManyRequests(
      service.login(
        { email: 'target@example.com', password: 'x' },
        { ip: '3.3.3.3' },
      ),
    );
  });
});
