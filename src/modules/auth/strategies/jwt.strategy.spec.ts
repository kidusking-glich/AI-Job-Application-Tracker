import { JwtStrategy } from './jwt.strategy';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy token versioning', () => {
  let usersService: { findOneById: jest.Mock };
  let strategy: JwtStrategy;

  const configService = {
    get: jest.fn((key: string, defaultValue?: string) =>
      key === 'JWT_SECRET' ? 'test-secret' : defaultValue,
    ),
    getOrThrow: jest.fn(() => 'test-secret'),
  } as any;

  function makeUser(overrides: Record<string, unknown> = {}) {
    return {
      id: 'user-1',
      email: 'user@example.com',
      tokenVersion: 0,
      ...overrides,
    };
  }

  beforeEach(() => {
    usersService = { findOneById: jest.fn() };
    strategy = new JwtStrategy(configService, usersService as any);
  });

  it('accepts a token whose version matches the user current tokenVersion', async () => {
    usersService.findOneById.mockResolvedValue(makeUser({ tokenVersion: 3 }));

    await expect(
      strategy.validate({ sub: 'user-1', email: 'user@example.com', version: 3 }),
    ).resolves.toMatchObject({ id: 'user-1', tokenVersion: 3 });
  });

  it('rejects a stale token (version behind current tokenVersion, e.g. after password reset)', async () => {
    usersService.findOneById.mockResolvedValue(makeUser({ tokenVersion: 4 }));

    await expect(
      strategy.validate({ sub: 'user-1', email: 'user@example.com', version: 3 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token issued before versioning existed (no version claim)', async () => {
    usersService.findOneById.mockResolvedValue(makeUser({ tokenVersion: 0 }));

    await expect(
      strategy.validate({ sub: 'user-1', email: 'user@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when the user no longer exists', async () => {
    usersService.findOneById.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'missing', email: 'missing@example.com', version: 0 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
