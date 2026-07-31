import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
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
