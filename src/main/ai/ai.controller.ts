import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { CreateAiDto } from './dto/create-ai.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { UserRoles } from '@prisma/client';
import { Roles } from 'src/main/auth/decorators/roles.decorator';
import { AuthGuard } from 'src/main/auth/guards/auth.guard';
import { RolesGuard } from 'src/main/auth/guards/roles.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) { }


  @Post('generate-ai-response-new-session')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate AI response (legacy endpoint)' })
  async createAIResponse(@Body() createAiDto: CreateAiDto, @Req() req) {
    return await this.aiService.createAIResponse(createAiDto, req.user.sub);
  }

  @Post('sessions/:sessionId/message')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message to a session' })
  @ApiParam({ name: 'sessionId', description: 'The ID of the session' })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() sendMessageDto: SendMessageDto,
    @Req() req,
  ) {
    return await this.aiService.sendMessageToSession(
      req.user.sub,
      sessionId,
      sendMessageDto,
    );
  }

  @Get('sessions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all sessions for the user' })
  async getAllSessions(@Req() req) {
    return await this.aiService.getAllSessions(req.user.sub);
  }


  @Get('sessions/:sessionId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific session with all messages' })
  @ApiParam({ name: 'sessionId', description: 'The ID of the session' })
  async getSessionById(@Param('sessionId') sessionId: string, @Req() req) {
    return await this.aiService.getSessionAllMessagesById(
      req.user.sub,
      sessionId,
    );
  }


  @Delete('sessions/:sessionId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a session' })
  @ApiParam({ name: 'sessionId', description: 'The ID of the session' })
  async deleteSession(@Param('sessionId') sessionId: string, @Req() req) {
    return await this.aiService.deleteSession(req.user.sub, sessionId);
  }


  @Get('/suggestions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all session suggestions for the user' })
  async getAllSessionsSuggestion(@Req() req) {
    return await this.aiService.getAllSessionSuggestionsForUser(req.user.sub);
  }


  @Patch('sessions/:sessionId/message/:messageId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Edit a user message in a session',
    description:
      'Updates the clientMessage text, re-sends it to the AI engine, ' +
      'and stores the new AI response. The original message is preserved in `original_message` field. ' +
      '`is_edited: true` and `edited_at` are set on the record.',
  })
  @ApiParam({ name: 'sessionId', description: 'The session ID' })
  @ApiParam({ name: 'messageId', description: 'The message ID to edit (returned as message_id)' })
  async editMessage(
    @Param('sessionId') sessionId: string,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
    @Req() req,
  ) {
    return await this.aiService.editMessage(
      req.user.sub,
      sessionId,
      messageId,
      dto,
    );
  }

  /**
   * Get initial message of the most recently updated session
   */
  @Get('sessions/last-updated/initial-message')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the initial message of the most recently updated session',
    description:
      'Finds the session that was last modified (by message edit or new message) ' +
      'and returns only its very first (initial) client message along with session metadata.',
  })
  async getLastUpdatedSessionInitialMessage(@Req() req) {
    return await this.aiService.getLastUpdatedSessionInitialMessage(
      req.user.sub,
    );
  }
}
