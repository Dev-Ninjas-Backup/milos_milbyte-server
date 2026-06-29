import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { FirebaseService } from 'src/config/firebase/firebase.service';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  /**
   * Register or update a user's FCM token
   */
  async registerToken(userId: number, dto: RegisterFcmTokenDto) {
    const existing = await this.prisma.userFcmToken.findUnique({
      where: { token: dto.token },
    });

    if (existing) {
      // If token belongs to a different user, reassign it
      if (existing.userId !== userId) {
        await this.prisma.userFcmToken.update({
          where: { token: dto.token },
          data: { userId, device: dto.device },
        });
      }
      return { message: 'FCM token registered successfully' };
    }

    await this.prisma.userFcmToken.create({
      data: {
        userId,
        token: dto.token,
        device: dto.device,
      },
    });

    return { message: 'FCM token registered successfully' };
  }

  /**
   * Remove a FCM token (on logout or token refresh)
   */
  async removeToken(userId: number, token: string) {
    await this.prisma.userFcmToken.deleteMany({
      where: { userId, token },
    });
    return { message: 'FCM token removed successfully' };
  }

  /**
   * Send push notification to a specific user (all their devices)
   */
  async sendToUser(
    userId: number,
    title: string,
    body: string,
    type: NotificationType = NotificationType.GENERAL,
    data?: Record<string, string>,
  ): Promise<void> {
    // Save notification to DB
    await this.prisma.notification.create({
      data: { userId, title, body, type, data: data ?? {} },
    });

    // Get all FCM tokens for user
    const tokens = await this.prisma.userFcmToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (!tokens.length) {
      this.logger.warn(`No FCM tokens found for user ${userId}`);
      return;
    }

    const tokenList = tokens.map((t) => t.token);

    const response = await this.firebase.sendToMultipleTokens(tokenList, title, body, data);

    // Clean up invalid tokens
    if (response) {
      const invalidTokens: string[] = [];
      response.responses.forEach((res, idx) => {
        if (!res.success && res.error?.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(tokenList[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        await this.prisma.userFcmToken.deleteMany({
          where: { token: { in: invalidTokens } },
        });
        this.logger.log(`Removed ${invalidTokens.length} invalid FCM tokens for user ${userId}`);
      }
    }
  }

  /**
   * Get all notifications for a user
   */
  async getMyNotifications(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      data: notifications,
      meta: {
        total,
        unread: unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: number, notificationId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new BadRequestException('Notification not found');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { message: 'Notification marked as read' };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: 'All notifications marked as read' };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: number, notificationId: number) {
    await this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });

    return { message: 'Notification deleted' };
  }
}
