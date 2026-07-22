import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { TripService } from './trip.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Trip')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('trip')
export class TripController {
  constructor(private readonly tripService: TripService) { }


  @Get('my-trip-plan')
  @ApiOperation({ summary: 'Get all user planning sessions' })
  async findAll(@Req() req: any) {
    return await this.tripService.findAll(Number(req.user.sub));
  }


  @Get('my-trip-plan-details/:sessionId')
  @ApiOperation({ summary: 'Get a planning details for a specific session ID`' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async findSubmittedMessagesBySessionId(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    return await this.tripService.findSubmittedMessagesBySessionId(
      Number(req.user.sub),
      sessionId,
    );
  }


}
