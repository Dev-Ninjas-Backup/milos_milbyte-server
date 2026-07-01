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
    this.logger.log(`Creating AI response for user ID: ${userId}`);
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      this.logger.error(`User with ID ${userId} not found`);
      throw new NotFoundException('User not found');
    }



    const session = await this.prisma.aiSession.create({
      data: {
        userId,
        sessionId: randomUUID(),
      },
    });

    this.logger.log(`Created new AI session with ID: ${session.sessionId} for user ID: ${userId}`);
    // Send message to this session
    return await this.sendMessageToSession(userId, session.sessionId, {
      message: createAiDto.message,
    });
  }

  async sendMessageToSession(
    userId: number,
    sessionId: string,
    sendMessageDto: SendMessageDto,
  ) {
    this.logger.log(`Sending message to session ID: ${sessionId} for user ID: ${userId}`);
    const session = await this.prisma.aiSession.findFirst({
      where: {
        sessionId,
        userId,
      },
    });

    if (!session) {
      this.logger.error(`Session with ID ${sessionId} not found for user ID: ${userId}`);
      throw new NotFoundException('Session not found');
    }

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    this.logger.log(`Checking if user with ID ${userId} exists`);

    if (!userExists) {
      this.logger.error(`User with ID ${userId} not found`);
      throw new NotFoundException('User not found');
    }

    const activeSubscriptionPlan = await this.prisma.userSubscription.findFirst(
      {
        where: { userId },
        include: { plan: true },
      },
    );

    this.logger.log(`Active subscription plan for user ID ${userId}: ${activeSubscriptionPlan?.planType || 'None'}`);
    if (!activeSubscriptionPlan) {
      this.logger.error(`No active subscription plan found for user ID: ${userId}`);
      throw new NotFoundException(
        'No active subscription plan found for the user',
      );
    }

    const payload = {
      message: sendMessageDto.message,
      session_id: session.sessionId,
      user_id: String(userId),
      // subscription_plan: activeSubscriptionPlan.planType.toLowerCase(),
      subscription_plan: 'pro',
    };

    // Get AI response
    const aiResponseData = await aiResponse(payload);
    this.logger.log(`AI response received for session ID: ${sessionId} and user ID: ${userId}`);
    if (aiResponseData.rate_limit_exceeded === true) {
      this.logger.warn(`Rate limit exceeded for user ID: ${userId} on plan: ${activeSubscriptionPlan.plan.name}`);
      throw new HttpException(
        `You are currently on the ${activeSubscriptionPlan.plan.name} plan. You have reached the AI message limit. Please upgrade to continue using the AI assistant.`,
        429,
      );
    }

    // attach client message into the AI response payload
    try {
      this.logger.log(`Attaching client message and current plan to AI response for session ID: ${sessionId}`);
      (aiResponseData as any).client_message = sendMessageDto.message;
      (aiResponseData as any).current_plan = {
        name: activeSubscriptionPlan.plan.name,
        tier: activeSubscriptionPlan.planType,
      };
    } catch {
      this.logger.error(`Failed to attach client message and current plan to AI response for session ID: ${sessionId}`);
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
    // include stored message id in response object
    try {
      (aiResponseData as any).message_id = message.id;
    } catch { }

    // Send push notification — only the AI response text (fire-and-forget)
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
      .catch(() => { /* silently ignore — must not break main response */ });

    return aiResponseData;
  }


  async getAllSessions(userId: number) {
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
    this.logger.log(`Fetching all session suggestions for user ID: ${userId}`);
    const sessions = await this.prisma.aiSession.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

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
      throw new NotFoundException('Session not found');
    }

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
    const session = await this.prisma.aiSession.findFirst({
      where: {
        sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.aiSession.delete({
      where: { sessionId },
    });

    return { message: 'Session deleted successfully', sessionId };
  }
}
