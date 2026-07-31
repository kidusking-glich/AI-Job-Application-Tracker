import { AdminService } from './admin.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AdminService super-admin features', () => {
  let prisma: any;
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    service = new AdminService(prisma, {} as any, {} as any, {} as any);
  });

  describe('getSuperAdminStatus', () => {
    it('returns the current super admin and the recovery rules', async () => {
      const holder = {
        id: 'admin-1',
        email: 'owner@example.com',
        name: 'Owner',
        isAdmin: true,
        isSuperAdmin: true,
        emailVerifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      prisma.user.findFirst.mockResolvedValue(holder);

      const result = await service.getSuperAdminStatus();

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { isSuperAdmin: true, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: expect.objectContaining({ email: true, isSuperAdmin: true }),
      });
      expect(result.superAdmin).toEqual(holder);
      expect(result.autoRecovery.enabled).toBe(true);
      expect(result.transferNote).toContain('email-verified');
    });

    it('returns null superAdmin when no super admin exists', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.getSuperAdminStatus();

      expect(result.superAdmin).toBeNull();
    });
  });

  describe('transferSuperAdmin', () => {
    it('rejects transferring to yourself', async () => {
      await expect(service.transferSuperAdmin('a', 'a')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a missing target user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.transferSuperAdmin('a', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects transferring to someone who is already the super admin', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'b',
        email: 'b@example.com',
        isSuperAdmin: true,
        emailVerifiedAt: new Date(),
      });

      await expect(service.transferSuperAdmin('a', 'b')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects transferring to an unverified user (would lock out the dashboard)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'b',
        email: 'b@example.com',
        isSuperAdmin: false,
        emailVerifiedAt: null,
      });

      await expect(service.transferSuperAdmin('a', 'b')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('promotes the target, demotes the requester, and revokes the requester session', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'b',
        email: 'b@example.com',
        name: 'Bee',
        isSuperAdmin: false,
        emailVerifiedAt: new Date(),
      });
      prisma.$transaction.mockImplementation((queries: unknown[]) => queries);

      const result = await service.transferSuperAdmin('a', 'b');

      // The transaction must promote the target to super admin...
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'b' },
        data: { isSuperAdmin: true, isAdmin: true },
      });
      // ...and demote the requester while bumping their tokenVersion so all
      // previously issued JWTs are rejected immediately.
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'a' },
        data: { isSuperAdmin: false, isAdmin: true, tokenVersion: { increment: 1 } },
      });
      expect(result.message).toContain('b@example.com');
    });
  });
});
