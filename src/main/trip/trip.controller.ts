import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { TripService } from './trip.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TripStatus } from '@prisma/client';

@ApiTags('Trip')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('trip')
export class TripController {
  constructor(private readonly tripService: TripService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new trip (default status PLANNING)' })
  async create(@Req() req: any, @Body() createTripDto: CreateTripDto) {
    return await this.tripService.create(Number(req.user.sub), createTripDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user trips' })
  @ApiQuery({ name: 'status', enum: TripStatus, required: false })
  async findAll(@Req() req: any, @Query('status') status?: TripStatus) {
    return await this.tripService.findAll(Number(req.user.sub), status);
  }
}
