import { Injectable, NotFoundException, HttpException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { CreateAiDto } from './dto/create-ai.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { aiResponse } from 'src/config/ai/ai-response';
import { NotificationService } from 'src/main/notification/notification.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class AiService {
  logger = new Logger(AiService.name);
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) { }


  async createAIResponse(createAiDto: CreateAiDto, userId: number) {
    this.logger.log(`[AI] Starting createAIResponse for userId=${userId}`);
    this.logger.debug(`[AI] Request payload: ${JSON.stringify(createAiDto)}`);

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      this.logger.error(`[AI] User not found for userId=${userId}`);
      throw new NotFoundException('User not found');
    }

    const session = await this.prisma.aiSession.create({
      data: {
        userId,
        sessionId: randomUUID(),
      },
    });

    this.logger.log(`[AI] Created session sessionId=${session.sessionId} for userId=${userId}`);
    this.logger.debug(`[AI] Sending initial message to sessionId=${session.sessionId}`);

    return await this.sendMessageToSession(userId, session.sessionId, {
      message: createAiDto.message,
    });
  }

  async sendMessageToSession(
    userId: number,
    sessionId: string,
    sendMessageDto: SendMessageDto,
  ) {
    this.logger.log(`[AI] Sending message to sessionId=${sessionId} for userId=${userId}`);
    this.logger.debug(`[AI] Message payload: ${JSON.stringify(sendMessageDto)}`);

    const session = await this.prisma.aiSession.findFirst({
      where: {
        sessionId,
        userId,
      },
    });

    if (!session) {
      this.logger.error(`[AI] Session not found sessionId=${sessionId} userId=${userId}`);
      throw new NotFoundException('Session not found');
    }

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      this.logger.error(`[AI] User not found userId=${userId}`);
      throw new NotFoundException('User not found');
    }

    const activeSubscriptionPlan = await this.prisma.userSubscription.findFirst({
      where: { userId },
      include: { plan: true },
    });

    this.logger.log(`[AI] Subscription plan for userId=${userId}: ${activeSubscriptionPlan?.planType || 'None'}`);
    if (!activeSubscriptionPlan) {
      this.logger.error(`[AI] No active subscription plan for userId=${userId}`);
      throw new NotFoundException(
        'No active subscription plan found for the user',
      );
    }

    const payload = {
      message: sendMessageDto.message,
      session_id: session.sessionId,
      user_id: String(userId),
      subscription_plan: 'pro',
    };

    this.logger.debug(`[AI] Payload sent to AI service: ${JSON.stringify(payload)}`);

    const aiResponseData = await aiResponse(payload);
    this.logger.log(`[AI] AI response received for sessionId=${sessionId} userId=${userId}`);
    this.logger.debug(`[AI] AI response data: ${JSON.stringify(aiResponseData)}`);

    if (aiResponseData.rate_limit_exceeded === true) {
      this.logger.warn(`[AI] Rate limit exceeded for userId=${userId} plan=${activeSubscriptionPlan.plan.name}`);
      throw new HttpException(
        `You are currently on the ${activeSubscriptionPlan.plan.name} plan. You have reached the AI message limit. Please upgrade to continue using the AI assistant.`,
        429,
      );
    }

    try {
      this.logger.debug(`[AI] Attaching response metadata for sessionId=${sessionId}`);
      (aiResponseData as any).client_message = sendMessageDto.message;
      (aiResponseData as any).current_plan = {
        name: activeSubscriptionPlan.plan.name,
        tier: activeSubscriptionPlan.planType,
      };
    } catch {
      this.logger.error(`[AI] Failed to attach metadata for sessionId=${sessionId}`);
    }

    const message = await this.prisma.aiMessage.create({
      data: {
        sessionId: session.sessionId,
        description: aiResponseData?.description,
        currentStep: aiResponseData?.current_step || 'location',
        tripCard: aiResponseData?.trip_cards,
        tripGuide: aiResponseData?.trip_guide,
        submitted: aiResponseData?.submitted ?? false,
        checkoutRequired: aiResponseData?.checkout_required ?? false,
        clientMessage: sendMessageDto.message,
        aiMessage: aiResponseData?.ai_message || '',
        extractedData: aiResponseData?.parameters_extracted,
      },
    });

    this.logger.log(`[AI] Stored AI message messageId=${message.id} for sessionId=${sessionId}`);

    try {
      (aiResponseData as any).message_id = message.id;
    } catch {
      this.logger.warn(`[AI] Could not attach message_id to response for sessionId=${sessionId}`);
    }

    const aiText: string = aiResponseData?.ai_message ?? '';
    const notificationBody = aiText.length > 0
      ? aiText.substring(0, 150) + (aiText.length > 150 ? '...' : '')
      : 'Your AI assistant has responded.';

    this.notificationService
      .sendToUser(
        userId,
        'AI Assistant Reply',
        notificationBody,
        NotificationType.AI_RESPONSE,
        {
          session_id: session.sessionId,
          message_id: String(message.id),
        },
      )
      .catch(() => {
        this.logger.warn(`[AI] Notification send failed for userId=${userId} sessionId=${sessionId}`);
      });

    return aiResponseData;
  }


  async getAllSessions(userId: number) {
    this.logger.log(`[AI] Fetching all sessions for userId=${userId}`);
    const sessions = await this.prisma.aiSession.findMany({
      where: { userId },
      select: {
        sessionId: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            clientMessage: true,
            aiMessage: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => ({
      session_id: session.sessionId,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      first_client_message:
        session.messages.length > 0
          ? session.messages[0].clientMessage
          : null,
      last_ai_message:
        session.messages.length > 0
          ? session.messages[session.messages.length - 1].aiMessage
          : null,
      message_count: session.messages.length,
    }));
  }

  async getAllSessionSuggestionsForUser(userId: number) {
    this.logger.log(`[AI] Fetching all suggestions for userId=${userId}`);
    const sessions = await this.prisma.aiSession.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(`[AI] Found ${sessions.length} sessions for userId=${userId}`);

    const suggestions = sessions.flatMap((session) =>
      session.messages
        .filter((message) => Boolean(message.tripCard || message.tripGuide))
        .map((message) => {
          const extractedData = (message.extractedData as Record<string, any>) || {};
          const pictures = this.extractPictureData({
            tripCard: message.tripCard,
            tripGuide: message.tripGuide,
            aiMessage: message.aiMessage,
            clientMessage: message.clientMessage,
          });

          return {
            session_id: session.sessionId,
            message_id: message.id,
            client_message: message.clientMessage,
            ai_message: message.aiMessage,
            current_step: message.currentStep,
            parameters_extracted: {
              location: extractedData?.location || null,
              start_date: extractedData?.start_date || null,
              end_date: extractedData?.end_date || null,
              travelers: extractedData?.travelers || null,
              budget: extractedData?.budget || null,
              experience: extractedData?.experience || null,
              citizenship: extractedData?.citizenship || null,
              passengers: extractedData?.passengers || null,
              passenger_preferences: extractedData?.passenger_preferences || null,
            },
            submitted: message.submitted,
            checkout_required: message.checkoutRequired,
            trip_cards: message.tripCard ?? [],
            trip_guide: message.tripGuide ?? [],
            pictures,
            created_at: message.createdAt,
            updated_at: message.updatedAt,
          };
        }),
    );

    this.logger.log(`[AI] Returning ${suggestions.length} suggestions for userId=${userId}`);

    return {
      user_id: String(userId),
      total_sessions: sessions.length,
      total_suggestions: suggestions.length,
      suggestions,
    };
  }


  private extractPictureData(payload: unknown): Array<{ key: string; value: string }> {
    const pictures: Array<{ key: string; value: string }> = [];
    const seen = new Set<string>();

    const visit = (value: unknown, path = '') => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, `${path}[${index}]`));
        return;
      }

      if (!value || typeof value !== 'object') {
        return;
      }

      const record = value as Record<string, any>;
      const imageKeys = [
        'image',
        'images',
        'picture',
        'pictures',
        'imageUrl',
        'image_url',
        'thumbnail',
        'thumbnailUrl',
        'preview',
        'photo',
        'photos',
        'media',
        'url',
        'src',
      ];

      for (const key of imageKeys) {
        const candidate = record[key];
        if (typeof candidate === 'string' && candidate.trim()) {
          const signature = `${path}.${key}:${candidate}`;
          if (!seen.has(signature)) {
            seen.add(signature);
            pictures.push({
              key: path ? `${path}.${key}` : key,
              value: candidate,
            });
          }
        }
      }

      for (const [key, child] of Object.entries(record)) {
        if (imageKeys.includes(key)) {
          continue;
        }
        visit(child, path ? `${path}.${key}` : key);
      }
    };

    visit(payload);
    return pictures;
  }

  /**
   * Get a specific session with all its messages
   */
  async getSessionAllMessagesById(userId: number, sessionId: string) {
    this.logger.log(`[AI] Fetching messages for sessionId=${sessionId} userId=${userId}`);
    const session = await this.prisma.aiSession.findFirst({
      where: {
        sessionId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      this.logger.error(`[AI] Session not found sessionId=${sessionId} userId=${userId}`);
      throw new NotFoundException('Session not found');
    }

    this.logger.log(`[AI] Found ${session.messages.length} message(s) for sessionId=${sessionId}`);

    return session.messages.map((message) => {
      const extractedData = message.extractedData as any || {};
      return {
        session_id: session.sessionId,
        user_id: String(session.userId),
        ai_message: message.aiMessage,
        current_step: message.currentStep,
        parameters_extracted: {
          location: extractedData?.location || null,
          start_date: extractedData?.start_date || null,
          end_date: extractedData?.end_date || null,
          travelers: extractedData?.travelers || null,
          budget: extractedData?.budget || null,
          experience: extractedData?.experience || null,
          citizenship: extractedData?.citizenship || null,
          passengers: extractedData?.passengers || null,
          passenger_preferences: extractedData?.passenger_preferences || null,
        },
        trip_card: message.tripCard,
        trip_guide: message.tripGuide,
        submitted: message.submitted,
        checkout_required: message.checkoutRequired,
        rate_limit_exceeded: false,
        client_message: message.clientMessage,
        message_id: message.id,
        created_at: message.createdAt,
        updated_at: message.updatedAt,
      };
    });
  }

  /**
   * Delete a session
   */
  async deleteSession(userId: number, sessionId: string) {
    this.logger.log(`[AI] Deleting session sessionId=${sessionId} userId=${userId}`);
    const session = await this.prisma.aiSession.findFirst({
      where: {
        sessionId,
        userId,
      },
    });

    if (!session) {
      this.logger.error(`[AI] Session not found for deletion sessionId=${sessionId} userId=${userId}`);
      throw new NotFoundException('Session not found');
    }

    await this.prisma.aiSession.delete({
      where: { sessionId },
    });

    this.logger.log(`[AI] Session deleted successfully sessionId=${sessionId}`);
    return { message: 'Session deleted successfully', sessionId };
  }
}
