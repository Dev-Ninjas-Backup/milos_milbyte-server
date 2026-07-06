import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { FirebaseService } from 'src/config/firebase/firebase.service';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto';
import { DevicePlatform, NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) { }

  /**
   * Register or update a user's FCM token.
   * platform defaults to MOBILE if not provided.
   */
  async registerToken(userId: number, dto: RegisterFcmTokenDto) {
    const platform = dto.platform ?? DevicePlatform.MOBILE;

    const existing = await this.prisma.userFcmToken.findUnique({
      where: { token: dto.token },
    });

    if (existing) {
      // Reassign if token belongs to a different user, or update platform
      if (existing.userId !== userId || existing.platform !== platform) {
        await this.prisma.userFcmToken.update({
          where: { token: dto.token },
          data: { userId, device: dto.device, platform },
        });
      }
      return { message: 'FCM token registered successfully' };
    }

    await this.prisma.userFcmToken.create({
      data: {
        userId,
        token: dto.token,
        device: dto.device,
        platform,
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
   * Send push notification to a specific user (all their devices).
   *
   * - Mobile tokens → full notification + data payload (FCM shows it natively)
   * - Web tokens    → data-only payload (NO notification field).
   *   This prevents double notifications: the browser service worker won't
   *   auto-show a push, and the frontend JS onMessage handler shows it once.
   *
   * If the user has disabled push notifications, FCM is skipped entirely
   * but the notification is still saved to DB.
   */
  async sendToUser(
    userId: number,
    title: string,
    body: string,
    type: NotificationType = NotificationType.GENERAL,
    data?: Record<string, string>,
  ): Promise<void> {
    // Save notification to DB regardless of push preference
    await this.prisma.notification.create({
      data: { userId, title, body, type, data: data ?? {} },
    });

    // Check if user has push notifications enabled
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushNotificationsEnabled: true },
    });

    if (!user?.pushNotificationsEnabled) {
      this.logger.log(`Push notifications disabled for user ${userId}. Skipping FCM send.`);
      return;
    }

    // Get all FCM tokens with platform info
    const tokens = await this.prisma.userFcmToken.findMany({
      where: { userId },
      select: { token: true, platform: true },
    });

    if (!tokens.length) {
      this.logger.warn(`No FCM tokens found for user ${userId}`);
      return;
    }

    // Separate mobile and web tokens
    const mobileTokens = tokens
      .filter((t) => t.platform === DevicePlatform.MOBILE)
      .map((t) => t.token);

    const webTokens = tokens
      .filter((t) => t.platform === DevicePlatform.WEB)
      .map((t) => t.token);

    const invalidTokens: string[] = [];

    // 1) Mobile: full notification + data (FCM handles display)
    if (mobileTokens.length > 0) {
      const mobileRes = await this.firebase.sendToMultipleTokens(
        mobileTokens, title, body, data,
      );
      if (mobileRes) {
        mobileRes.responses.forEach((res, idx) => {
          if (!res.success && res.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(mobileTokens[idx]);
          }
        });
        this.logger.log(
          `Mobile FCM sent: ${mobileRes.successCount} success, ${mobileRes.failureCount} failures`,
        );
      }
    }

    // 2) Web: data-only (no notification payload) — prevents double notifications.
    //    The frontend onMessage handler is responsible for showing the notification.
    if (webTokens.length > 0) {
      const webRes = await this.firebase.sendDataOnlyToMultipleTokens(
        webTokens,
        { title, body, type, ...(data ?? {}) },
      );
      if (webRes) {
        webRes.responses.forEach((res, idx) => {
          if (!res.success && res.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(webTokens[idx]);
          }
        });
        this.logger.log(
          `Web FCM sent: ${webRes.successCount} success, ${webRes.failureCount} failures`,
        );
      }
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      await this.prisma.userFcmToken.deleteMany({
        where: { token: { in: invalidTokens } },
      });
      this.logger.log(`Removed ${invalidTokens.length} invalid FCM tokens for user ${userId}`);
    }
  }

  /**
   * Toggle push notification preference for a user.
   * Automatically flips the current state: ON → OFF, OFF → ON.
   */
  async togglePushNotifications(userId: number) {
    // Read current state
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushNotificationsEnabled: true },
    });

    const currentState = user?.pushNotificationsEnabled ?? true;
    const newState = !currentState;

    await this.prisma.user.update({
      where: { id: userId },
      data: { pushNotificationsEnabled: newState },
    });

    return {
      message: `Push notifications ${newState ? 'enabled' : 'disabled'} successfully`,
      pushNotificationsEnabled: newState,
    };
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
