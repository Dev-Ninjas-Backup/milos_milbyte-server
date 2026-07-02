import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { CreateAiDto } from './dto/create-ai.dto';
import { SendMessageDto } from './dto/send-message.dto';
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

  /**
   * Create AI response (legacy - creates a new session and sends message)
   */
  @Post('generate-ai-response-new-session')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate AI response (legacy endpoint)' })
  async createAIResponse(@Body() createAiDto: CreateAiDto, @Req() req) {
    return await this.aiService.createAIResponse(createAiDto, req.user.sub);
  }

  /**
   * Send a message to a specific session
   */
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

  /**
   * Get a specific session with all its messages
   */
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

  /**
   * Delete a session
   */
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
}
