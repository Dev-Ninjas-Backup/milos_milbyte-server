import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import {
  getMessaging,
  Messaging,
  Message,
  MulticastMessage,
  BatchResponse,
} from 'firebase-admin/messaging';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ServiceAccount } from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App;
  private messaging: Messaging;

  onModuleInit() {
    if (getApps().length === 0) {
      // Load the service account JSON file at runtime (avoids env var / OpenSSL parsing issues)
      const serviceAccountPath = join(
        process.cwd(),
        'solara-ai-9160d-firebase-adminsdk-fbsvc-01c25a924c.json',
      );
      const serviceAccount: ServiceAccount = JSON.parse(
        readFileSync(serviceAccountPath, 'utf-8'),
      );

      this.app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      this.app = getApps()[0];
    }

    this.messaging = getMessaging(this.app);
    this.logger.log('Firebase Admin initialized successfully');
  }

  /**
   * Send a push notification to a single FCM token
   */
  async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string | null> {
    try {
      const message: Message = {
        notification: { title, body },
        data: data ?? {},
        token,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      this.logger.log(`Notification sent successfully: ${response}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to send notification to token: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Send a push notification to multiple FCM tokens
   */
  async sendToMultipleTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<BatchResponse | null> {
    if (!tokens.length) return null;

    try {
      const message: MulticastMessage = {
        notification: { title, body },
        data: data ?? {},
        tokens,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.messaging.sendEachForMulticast(message);
      this.logger.log(
        `Multicast sent: ${response.successCount} success, ${response.failureCount} failures`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to send multicast notification: ${error.message}`,
      );
      return null;
    }
  }
}
