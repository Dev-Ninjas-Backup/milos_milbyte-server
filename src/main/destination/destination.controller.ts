import {
  UseGuards,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { Roles } from 'src/main/auth/decorators/roles.decorator';
import { AuthGuard } from 'src/main/auth/guards/auth.guard';
import { RolesGuard } from 'src/main/auth/guards/roles.guard';
import { DestinationService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { DestinationQueryDto } from './dto/destination-query.dto';
import { SaveDestinationDto } from './dto/save-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

type AuthenticatedRequest = Request & {
  user: {
    sub: number;
    email: string;
    role: UserRoles;
  };
};

@ApiTags('Destinations')
@Controller('destination')
export class DestinationController {
  constructor(private readonly destinationService: DestinationService) { }

  @ApiTags('Admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create destination (Admin only)' })
  @Post()
  async create(@Body() createDestinationDto: CreateDestinationDto) {
    return await this.destinationService.create(createDestinationDto);
  }

  @ApiTags('Public')
  @ApiOperation({ summary: 'Get all destinations (Public)' })
  @Get()
  async findAll(@Query() query: DestinationQueryDto) {
    return await this.destinationService.findAll(query);
  }

  @ApiTags('User')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a destination to user wishlist' })
  @Post('saved')
  async saveDestination(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SaveDestinationDto,
  ) {
    return await this.destinationService.saveDestination(
      Number(req.user.sub),
      dto,
    );
  }

  @ApiTags('User')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all saved destinations of logged-in user' })
  @Get('saved')
  async getSavedDestinations(@Req() req: AuthenticatedRequest) {
    console.log(req.user);
    return await this.destinationService.getSavedDestinations(
      Number(req.user.sub),
    );
  }

  @ApiTags('Public')
  @ApiOperation({ summary: 'Get destination by id (Public)' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.destinationService.findOne(id);
  }

  @ApiTags('Admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update destination (Admin only)' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDestinationDto: UpdateDestinationDto,
  ) {
    return await this.destinationService.update(id, updateDestinationDto);
  }

  @ApiTags('Admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete destination (Admin only)' })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.destinationService.remove(id);
  }
}
