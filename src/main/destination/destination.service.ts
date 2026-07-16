import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { DestinationQueryDto } from './dto/destination-query.dto';
import { SaveDestinationDto } from './dto/save-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

@Injectable()
export class DestinationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDestinationDto: CreateDestinationDto) {
    const existing = await this.prisma.destination.findFirst({
      where: {
        AND: [
          { name: createDestinationDto.name },
          { location: createDestinationDto.location },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'Destination with this name and location already exists',
      );
    }

    const destination = await this.prisma.destination.create({
      data: createDestinationDto,
    });

    return {
      message: 'Destination created successfully',
      destination,
    };
  }

  async findAll(query: DestinationQueryDto) {
    const where: Prisma.DestinationWhereInput = {
      AND: [
        query.name
          ? {
              name: {
                contains: query.name,
                mode: 'insensitive',
              },
            }
          : {},
        query.location
          ? {
              location: {
                contains: query.location,
                mode: 'insensitive',
              },
            }
          : {},
      ],
    };

    const destinations = await this.prisma.destination.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (destinations.length === 0) {
      return {
        message: 'No destinations found',
        destinations: [],
      };
    }

    return {
      message: 'Destinations fetched successfully',
      destinations,
    };
  }

  async findOne(id: number) {
    const destination = await this.prisma.destination.findUnique({
      where: { id },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    return {
      message: 'Destination fetched successfully',
      destination,
    };
  }

  async update(id: number, updateDestinationDto: UpdateDestinationDto) {
    const rest = await this.prisma.destination.findUnique({
      where: { id },
    });
    if (!rest) {
      throw new NotFoundException('Destination not found');
    }
    const destination = await this.prisma.destination.update({
      where: { id },
      data: updateDestinationDto,
    });

    return {
      message: 'Destination updated successfully',
      destination,
    };
  }

  async remove(id: number) {
    const rest = await this.prisma.destination.findUnique({
      where: { id },
    });

    if (!rest) {
      throw new NotFoundException('Destination not found');
    }

    await this.prisma.destination.delete({
      where: { id },
    });

    return {
      message: 'Destination deleted successfully',
    };
  }

  async saveDestination(userId: number, dto: SaveDestinationDto) {
    const destination = await this.prisma.destination.findUnique({
      where: { id: dto.destinationId },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    const existing = await this.prisma.userSavedDestination.findUnique({
      where: {
        userId_destinationId: {
          userId,
          destinationId: dto.destinationId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Destination already saved');
    }

    const saved = await this.prisma.userSavedDestination.create({
      data: { userId, destinationId: dto.destinationId },
      include: { destination: true },
    });

    return {
      message: 'Destination saved successfully',
      savedDestination: saved,
    };
  }

  async getSavedDestinations(userId: number) {
    const savedDestinations = await this.prisma.userSavedDestination.findMany({
      where: { userId },
      include: { destination: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Saved destinations fetched successfully',
      savedDestinations,
    };
  }
}
