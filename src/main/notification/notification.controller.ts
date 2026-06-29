import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto';
import { AuthGuard } from 'src/main/auth/guards/auth.guard';
import { RolesGuard } from 'src/main/auth/guards/roles.guard';
import { Roles } from 'src/main/auth/decorators/roles.decorator';
import { UserRoles } from '@prisma/client';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Register FCM device token
   */
  @Post('register-token')
  @Roles(UserRoles.CLIENT)
  @ApiOperation({ summary: 'Register FCM device token for push notifications' })
  async registerToken(@Body() dto: RegisterFcmTokenDto, @Req() req) {
    return await this.notificationService.registerToken(req.user.sub, dto);
  }

  /**
   * Remove FCM device token (on logout)
   */
  @Delete('remove-token/:token')
  @Roles(UserRoles.CLIENT)
  @ApiOperation({ summary: 'Remove FCM device token (use on logout)' })
  @ApiParam({ name: 'token', description: 'FCM token to remove' })
  async removeToken(@Param('token') token: string, @Req() req) {
    return await this.notificationService.removeToken(req.user.sub, token);
  }

  /**
   * Get my notifications (paginated)
   */
  @Get()
  @Roles(UserRoles.CLIENT)
  @ApiOperation({ summary: 'Get my notifications (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getMyNotifications(
    @Req() req,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return await this.notificationService.getMyNotifications(req.user.sub, page, limit);
  }

  /**
   * Mark a specific notification as read
   */
  @Patch(':id/read')
  @Roles(UserRoles.CLIENT)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async markAsRead(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return await this.notificationService.markAsRead(req.user.sub, id);
  }

  /**
   * Mark all notifications as read
   */
  @Patch('read-all')
  @Roles(UserRoles.CLIENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req) {
    return await this.notificationService.markAllAsRead(req.user.sub);
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  @Roles(UserRoles.CLIENT)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async deleteNotification(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return await this.notificationService.deleteNotification(req.user.sub, id);
  }
}
