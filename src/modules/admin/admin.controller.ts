import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '@prisma/client';
import { AdminGuard } from './admin.guard';

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

function requestContext(req: Request): RequestContext {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('health')
  getHealth() {
    return this.adminService.getHealth();
  }

  @Get('super-admin-status')
  getSuperAdminStatus() {
    return this.adminService.getSuperAdminStatus();
  }

  @Get('users')
  getUsers(@Query('limit') limit?: string) {
    return this.adminService.getUsers(limit ? Number(limit) : undefined);
  }

  @Get('requests')
  getRequests(@Query('limit') limit?: string) {
    return this.adminService.getRequests(limit ? Number(limit) : undefined);
  }

  @Get('security-logs')
  getSecurityLogs(@Query('limit') limit?: string) {
    return this.adminService.getSecurityLogs(limit ? Number(limit) : undefined);
  }

  @Post('users')
  createAdminUser(
    @CurrentUser() requester: User,
    @Body() createAdminUserDto: CreateAdminUserDto,
    @Req() req: Request,
  ) {
    return this.adminService.createAdminUser(requester.id, createAdminUserDto, requestContext(req));
  }

  @Post('users/:id/transfer-super-admin')
  transferSuperAdmin(@CurrentUser() requester: User, @Param('id') id: string, @Req() req: Request) {
    return this.adminService.transferSuperAdmin(requester.id, id, requestContext(req));
  }

  @Delete('users/:id')
  deleteUser(@CurrentUser() requester: User, @Param('id') id: string, @Req() req: Request) {
    return this.adminService.deleteUser(requester.id, id, requestContext(req));
  }

  @Patch('users/:id/role')
  updateUserRole(
    @CurrentUser() requester: User,
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() req: Request,
  ) {
    return this.adminService.updateUserRole(requester.id, id, updateRoleDto.isAdmin, requestContext(req));
  }

  @Post('users/:id/resend-verification')
  resendVerification(@Param('id') id: string) {
    return this.adminService.resendVerification(id);
  }
}
