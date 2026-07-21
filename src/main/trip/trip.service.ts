import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripStatus } from '@prisma/client';

@Injectable()
export class TripService {
  constructor(private readonly prisma: PrismaService) { }

  async create(userId: number, createTripDto: CreateTripDto) {
    const destination = await this.prisma.destination.findUnique({
      where: { id: createTripDto.destinationId },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    // Check if a trip for this destination already exists for the user
    const existingTrip = await this.prisma.trip.findFirst({
      where: {
        userId,
        destinationId: createTripDto.destinationId,
      },
    });

    if (existingTrip) {
      // If it exists but they want to add it to planning, update the status to planning or just return existing
      return this.prisma.trip.update({
        where: { id: existingTrip.id },
        data: { status: createTripDto.status || TripStatus.PLANNING },
        include: { destination: true },
      });
    }

    return await this.prisma.trip.create({
      data: {
        userId,
        destinationId: createTripDto.destinationId,
        status: createTripDto.status || TripStatus.PLANNING,
      },
      include: { destination: true },
    });
  }

  async findAll(userId: number, status?: TripStatus) {
    return await this.prisma.trip.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        destination: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }





}
