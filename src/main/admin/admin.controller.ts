import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { AuthGuard } from 'src/main/auth/guards/auth.guard';
import { RolesGuard } from 'src/main/auth/guards/roles.guard';
import { UserRoles } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  async overview() {
    return await this.adminService.overview();
  }

  @Get('users-management')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  async userManagement(@Query() filters: UserFilterDto) {
    return await this.adminService.userManagement(filters);
  }

  @Patch('users/:id/block')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  async blockUser(@Param('id') id: string) {
    return await this.adminService.blockUser(Number(id));
  }

  @Patch('users/:id/unblock')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  async unblockUser(@Param('id') id: string) {
    return await this.adminService.unblockUser(Number(id));
  }

  @Delete('users/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  async deleteUser(@Param('id') id: string) {
    await this.adminService.deleteUser(Number(id));
    return { message: 'User deleted (soft) successfully' };
  }

  @Get('subscriptions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  async getAllSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.adminService.getAllSubscriptions(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }
}
