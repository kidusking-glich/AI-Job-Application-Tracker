import { AuthService } from './auth.service';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// bcrypt's exports are read-only under CommonJS interop, so jest.spyOn fails.
// Use a module mock instead.
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

const mockedHash = bcrypt.hash as jest.Mock;

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
    service = new AuthService(prisma, {} as any, {} as any, {} as any, {} as any);
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

    const result = await service.resetPassword({ token: 'valid-token', password: 'newpass123' });

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
