import { Injectable, NotFoundException, HttpException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { CreateAiDto } from './dto/create-ai.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { aiResponse } from 'src/config/ai/ai-response';
import { NotificationService } from 'src/main/notification/notification.service';
import { NotificationType } from '@prisma/client';


@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) { }

  /**
   * Initializes a new AI chat session for a user and sends the first message.
   * 
   * @param createAiDto - Data Transfer Object containing the initial message text.
   * @param userId - The unique identifier of the user creating the session.
   * @returns The AI's response data generated for the first message.
   * @throws NotFoundException if the user does not exist in the database.
   */
  async createAIResponse(createAiDto: CreateAiDto, userId: number) {
    this.logger.log(`[AI] Starting createAIResponse for userId=${userId}`);
    this.logger.debug(`[AI] Request payload: ${JSON.stringify(createAiDto)}`);

    // Verify that the user exists before initiating a session
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      this.logger.error(`[AI] User not found for userId=${userId}`);
      throw new NotFoundException('User not found');
    }

    // Create a new AI session with a unique UUID
    const session = await this.prisma.aiSession.create({
      data: {
        userId,
        sessionId: randomUUID(),
      },
    });

    this.logger.log(`[AI] Created session sessionId=${session.sessionId} for userId=${userId}`);
    this.logger.debug(`[AI] Sending initial message to sessionId=${session.sessionId}`);

    // Forward the initial message to the newly created session
    return await this.sendMessageToSession(userId, session.sessionId, {
      message: createAiDto.message,
    });
  }

  /**
   * Sends a message within an existing AI session, queries the external AI engine,
   * stores the conversation in the database, and sends a push notification to the user.
   * 
   * @param userId - The ID of the user sending the message.
   * @param sessionId - The UUID of the active session.
   * @param sendMessageDto - DTO containing the user's message.
   * @returns The processed AI response with metadata.
   * @throws NotFoundException if session or user is not found, or if the user lacks a subscription plan.
   * @throws HttpException (429 Status) if the AI rate limit has been exceeded.
   */
  async sendMessageToSession(
    userId: number,
    sessionId: string,
    sendMessageDto: SendMessageDto,
  ) {
    this.logger.log(`[AI] Sending message to sessionId=${sessionId} for userId=${userId}`);
    this.logger.debug(`[AI] Message payload: ${JSON.stringify(sendMessageDto)}`);

    // 1. Verify the session exists and belongs to the requesting user
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

    // 2. Verify the user exists
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      this.logger.error(`[AI] User not found userId=${userId}`);
      throw new NotFoundException('User not found');
    }

    // 3. Fetch user subscription details to determine access tiers and limits
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

    // 4. Construct payload for the external AI engine/microservice
    const payload = {
      message: sendMessageDto.message,
      session_id: session.sessionId,
      user_id: String(userId),
      subscription_plan: activeSubscriptionPlan.planType,
    };

    this.logger.debug(`[AI] Payload sent to AI service: ${JSON.stringify(payload)}`);

    // 5. Call external AI module to generate recommendations/reply
    const aiResponseData = await aiResponse(payload);
    this.logger.log(`[AI] AI response received for sessionId=${sessionId} userId=${userId}`);
    this.logger.debug(`[AI] AI response data: ${JSON.stringify(aiResponseData)}`);

    // 6. Handle rate limits based on subscription constraints
    if (aiResponseData.rate_limit_exceeded === true) {
      this.logger.warn(`[AI] Rate limit exceeded for userId=${userId} plan=${activeSubscriptionPlan.plan.name}`);
      throw new HttpException(
        `You are currently on the ${activeSubscriptionPlan.plan.name} plan. You have reached the AI message limit. Please upgrade to continue using the AI assistant.`,
        429,
      );
    }

    // 7. Inject client message and current subscription tier into response metadata
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

    // 8. Save the message exchange (client request & AI response) to the database
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

    // 9. Append database message ID back to the return response for tracking
    try {
      (aiResponseData as any).message_id = message.id;
    } catch {
      this.logger.warn(`[AI] Could not attach message_id to response for sessionId=${sessionId}`);
    }

    // 10. Asynchronously send a push notification to inform user of the AI response
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

  /**
   * Retrieves a list of all AI sessions for a specific user, sorted by creation date (newest first).
   * Maps each session to include summary details like the first message, last response, and message count.
   * 
   * @param userId - The unique identifier of the user.
   * @returns A list of session summary objects.
   */
  async getAllSessions(userId: number) {
    this.logger.log(`[AI] Fetching all sessions for userId=${userId}`);

    // Query sessions and pre-fetch the messages ordered chronologically
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

    // Map database models to client-friendly summary payloads
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

  /** 
   * Walks through the message history chronologically to get the latest non-null parameters.
   * 
   * @param userId - The ID of the user requesting suggestions.
   * @returns A list of sessions with their latest aggregated location and budget parameters.
   * @throws NotFoundException if no sessions exist for the user.
   */
  async getAllSessionSuggestionsForUser(userId: number) {
    this.logger.log(`[AI] Fetching all suggestions for userId=${userId}`);

    // Load sessions including their associated message list (chronological order)
    const sessions = await this.prisma.aiSession.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.debug(
      `[AI] Loaded ${sessions.length} session(s) for suggestion aggregation for userId=${userId}`,
    );

    if (!sessions || sessions.length === 0) {
      throw new NotFoundException('No sessions found for the user');
    }

    // Process each session to extract the latest location and budget parameters
    return sessions.map((session) => {
      let location: string | null = null;
      let budget: string | null = null;

      // Walk messages in order; last non-null value wins
      for (const msg of session.messages) {
        const extracted = (msg.extractedData as any) || {};
        if (extracted.location) location = extracted.location;
        if (extracted.budget) budget = extracted.budget;
      }

      return {
        session_id: session.sessionId,
        location,
        budget,
        created_at: session.createdAt,
        updated_at: session.updatedAt,
      };
    });
  }

  /**
   * Retrieves a specific session with all its messages in chronological order,
   * parsing and shaping the extracted metadata (like location, trip details, and budget).
   * 
   * @param userId - The owner of the session.
   * @param sessionId - The UUID of the session to fetch.
   * @returns An array of message details formatted for client consumption.
   * @throws NotFoundException if the session does not exist.
   */
  async getSessionAllMessagesById(userId: number, sessionId: string) {
    this.logger.log(`[AI] Fetching messages for sessionId=${sessionId} userId=${userId}`);

    // Find the session and load all associated messages chronologically
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

    // Map each message to the formatted structure expected by the client/frontend
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
        // Edit tracking fields
        is_edited: message.isEdited,
        edited_at: message.editedAt,
        original_message: message.originalMessage,
        message_id: message.id,
        created_at: message.createdAt,
        updated_at: message.updatedAt,
      };
    });
  }

  /**
   * Edit an existing user message in an AI session.
   * - Saves the original message (only on first edit) for audit trail.
   * - Re-sends the edited message to the AI engine and updates the stored AI response.
   * - Marks the message as edited with a timestamp.
   *
   * @param userId - The owner of the session.
   * @param sessionId - The session the message belongs to.
   * @param messageId - The specific message to edit.
   * @param dto - DTO containing the new message text.
   * @returns Updated message record with new AI response and edit metadata.
   */
  async editMessage(
    userId: number,
    sessionId: string,
    messageId: string,
    dto: UpdateMessageDto,
  ) {
    this.logger.log(
      `[AI] editMessage called userId=${userId} sessionId=${sessionId} messageId=${messageId}`,
    );

    // 1. Verify session exists and belongs to this user
    const session = await this.prisma.aiSession.findFirst({
      where: { sessionId, userId },
    });

    if (!session) {
      this.logger.error(`[AI] Session not found sessionId=${sessionId} userId=${userId}`);
      throw new NotFoundException('Session not found');
    }

    // 2. Verify the message belongs to this session
    const existingMessage = await this.prisma.aiMessage.findFirst({
      where: { id: messageId, sessionId },
    });

    if (!existingMessage) {
      this.logger.error(`[AI] Message not found messageId=${messageId} sessionId=${sessionId}`);
      throw new NotFoundException('Message not found in this session');
    }

    // 3. Build AI payload with updated message
    const activeSubscriptionPlan = await this.prisma.userSubscription.findFirst({
      where: { userId },
      include: { plan: true },
    });

    if (!activeSubscriptionPlan) {
      throw new NotFoundException('No active subscription plan found for the user');
    }

    const payload = {
      message: dto.message,
      session_id: sessionId,
      user_id: String(userId),
      subscription_plan: 'pro',
    };

    this.logger.debug(`[AI] Re-sending edited message to AI service: ${JSON.stringify(payload)}`);

    // 4. Call AI engine with new message
    const aiResponseData = await aiResponse(payload);

    if (aiResponseData.rate_limit_exceeded === true) {
      // throw new HttpException(
      //   `You are currently on the ${activeSubscriptionPlan.plan.name} plan. You have reached the AI message limit.`,
      //   429,
      // );
    }

    // 5. Update the message: preserve original on first edit, update content
    const updatedMessage = await this.prisma.aiMessage.update({
      where: { id: messageId },
      data: {
        // Keep the very first version as originalMessage (immutable audit trail)
        originalMessage: existingMessage.originalMessage ?? existingMessage.clientMessage,
        clientMessage: dto.message,
        aiMessage: aiResponseData?.ai_message || '',
        isEdited: true,
        editedAt: new Date(),
        // Refresh AI-extracted fields with new response
        description: aiResponseData?.description,
        currentStep: aiResponseData?.current_step || existingMessage.currentStep,
        tripCard: aiResponseData?.trip_cards ?? existingMessage.tripCard,
        tripGuide: aiResponseData?.trip_guide ?? existingMessage.tripGuide,
        submitted: aiResponseData?.submitted ?? existingMessage.submitted,
        checkoutRequired: aiResponseData?.checkout_required ?? existingMessage.checkoutRequired,
        extractedData: aiResponseData?.parameters_extracted ?? existingMessage.extractedData,
      },
    });

    this.logger.log(`[AI] Message edited messageId=${messageId} sessionId=${sessionId}`);

    return {
      message: 'Message edited successfully',
      data: {
        message_id: updatedMessage.id,
        session_id: sessionId,
        client_message: updatedMessage.clientMessage,
        original_message: updatedMessage.originalMessage,
        ai_message: updatedMessage.aiMessage,
        is_edited: updatedMessage.isEdited,
        edited_at: updatedMessage.editedAt,
        current_step: updatedMessage.currentStep,
        parameters_extracted: updatedMessage.extractedData,
        trip_card: updatedMessage.tripCard,
        trip_guide: updatedMessage.tripGuide,
        submitted: updatedMessage.submitted,
        checkout_required: updatedMessage.checkoutRequired,
        updated_at: updatedMessage.updatedAt,
      },
    };
  }

  /**
   * Returns the initial (first) message of the session that was most recently updated.
   *
   * @param userId - The owner of the sessions.
   * @returns Session metadata + its very first message.
   */
  async getLastUpdatedSessionInitialMessage(userId: number) {
    this.logger.log(
      `[AI] getLastUpdatedSessionInitialMessage called for userId=${userId}`,
    );

    // Find the most recently updated session for this user
    const session = await this.prisma.aiSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // only the first/initial message
        },
      },
    });

    if (!session) {
      throw new NotFoundException('No sessions found for this user');
    }

    const initialMessage = session.messages[0] ?? null;

    return {
      message: 'Last updated session initial message fetched successfully',
      session: {
        session_id: session.sessionId,
        created_at: session.createdAt,
        updated_at: session.updatedAt,
      },
      initial_message: initialMessage
        ? {
          message_id: initialMessage.id,
          client_message: initialMessage.clientMessage,
          ai_message: initialMessage.aiMessage,
          current_step: initialMessage.currentStep,
          is_edited: initialMessage.isEdited,
          edited_at: initialMessage.editedAt,
          original_message: initialMessage.originalMessage,
          created_at: initialMessage.createdAt,
          updated_at: initialMessage.updatedAt,
        }
        : null,
    };
  }

  /**
   * Deletes a session for a given user. Cascade deleting of messages is handled via database relations.
   * 
   * @param userId - The user ID who owns the session.
   * @param sessionId - The session ID to be deleted.
   * @returns A confirmation message and the deleted sessionId.
   * @throws NotFoundException if the session does not exist for the user.
   */
  async deleteSession(userId: number, sessionId: string) {
    this.logger.log(`[AI] Deleting session sessionId=${sessionId} userId=${userId}`);

    // Confirm the session exists and belongs to the user before deleting
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

    // Delete session (related messages are handled automatically via cascading config or database constraints)
    await this.prisma.aiSession.delete({
      where: { sessionId },
    });

    this.logger.log(`[AI] Session deleted successfully sessionId=${sessionId}`);
    return { message: 'Session deleted successfully', sessionId };
  }
}

