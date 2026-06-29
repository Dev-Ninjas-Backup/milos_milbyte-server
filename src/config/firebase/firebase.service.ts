import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import {
  getMessaging,
  Messaging,
  Message,
  MulticastMessage,
  BatchResponse,
} from 'firebase-admin/messaging';
import { join } from 'path';
import { ServiceAccount } from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App;
  private messaging: Messaging;

  onModuleInit() {
    if (getApps().length === 0) {
      // Load credentials from ENV vars (.env file — works both locally and on VPS)
      if (!process.env.FIREBASE_PROJECT_ID) {
        throw new Error('FIREBASE_PROJECT_ID env var is missing!');
      }

      const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      this.app = initializeApp({ credential: cert(serviceAccount) });
      this.logger.log('Firebase: loaded credentials from ENV vars');
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
