import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AdminService } from './admin.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminService: AdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Auto-recovery: if the super admin account is ever lost, re-promote the
    // first registered user so the dashboard is never locked out.
    // Note: request.user was snapshotted by JwtAuthGuard before this ran, so
    // the backend grants access to the promoted user on their NEXT request
    // (the JWT strategy refetches the user every request). Re-login may still
    // be needed for the frontend AdminRoute, which reads the user from storage.
    await this.adminService.ensureSuperAdminExists();

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    // Only the super admin (the first registered account) may access the admin
    // dashboard. Other admins can be created but cannot sign in to it.
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
