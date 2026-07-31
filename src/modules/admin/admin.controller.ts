import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '@prisma/client';
import { AdminGuard } from './admin.guard';

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

  @Get('users')
  getUsers(@Query('limit') limit?: string) {
    return this.adminService.getUsers(limit ? Number(limit) : undefined);
  }

  @Get('requests')
  getRequests(@Query('limit') limit?: string) {
    return this.adminService.getRequests(limit ? Number(limit) : undefined);
  }

  @Post('users')
  createAdminUser(@Body() createAdminUserDto: CreateAdminUserDto) {
    return this.adminService.createAdminUser(createAdminUserDto);
  }

  @Patch('users/:id/role')
  updateUserRole(
    @CurrentUser() requester: User,
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.adminService.updateUserRole(requester.id, id, updateRoleDto.isAdmin);
  }

  @Post('users/:id/resend-verification')
  resendVerification(@Param('id') id: string) {
    return this.adminService.resendVerification(id);
  }
}
