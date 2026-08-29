import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from 'src/main/auth/decorators/roles.decorator';
import { AuthGuard } from 'src/main/auth/guards/auth.guard';
import { RolesGuard } from 'src/main/auth/guards/roles.guard';
import {
  CreateDisputeDto,
  DisputeQueryDto,
  UpdateDisputeStatusDto,
} from './dto/dispute.dto';
import { DisputeService } from './dispute.service';

@ApiTags('Disputes')
@Controller('disputes')
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  // ═══════════════════════════ USER ROUTES ══════════════════════════════════

  @ApiTags('User')
  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a dispute (Authenticated user)' })
  async create(@Req() req: Request, @Body() createDisputeDto: CreateDisputeDto) {
    const userId = req.user.id;
    return await this.disputeService.create(userId, createDisputeDto);
  }

  @ApiTags('User')
  @Get('my')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my disputes (Authenticated user)' })
  async findMyDisputes(@Req() req: Request) {
    const userId = req.user.id;
    return await this.disputeService.findMyDisputes(userId);
  }

  @ApiTags('User')
  @Get('my/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one of my disputes (Authenticated user)' })
  async findMyOne(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.id;
    return await this.disputeService.findMyOne(userId, id);
  }

  // ═══════════════════════════ ADMIN ROUTES ═════════════════════════════════

  @ApiTags('Admin')
  @Get('stats')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dispute statistics (Admin only)' })
  async getStats() {
    return await this.disputeService.getStats();
  }

  @ApiTags('Admin')
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all disputes with optional filters (Admin only)',
  })
  async findAll(@Query() query: DisputeQueryDto) {
    return await this.disputeService.findAll(query);
  }

  @ApiTags('Admin')
  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dispute by id (Admin only)' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.disputeService.findOne(id);
  }

  @ApiTags('Admin')
  @Patch(':id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update dispute status & reply (Admin only)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDisputeStatusDto,
  ) {
    return await this.disputeService.updateStatus(id, updateDto);
  }

  @ApiTags('Admin')
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a dispute (Admin only)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.disputeService.remove(id);
  }
}
