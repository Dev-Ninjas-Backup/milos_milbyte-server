
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { TripStatus } from '@prisma/client';

@Injectable()
export class TripService {
  constructor(private readonly prisma: PrismaService) { }



  async findAll(userId: number, status?: TripStatus) {
    const userExists = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    if (!userExists) {
      throw new NotFoundException('User not found');
    }

    const sessions = await this.prisma.aiSession.findMany({
      where: {
        userId,
        messages: {
          some: {
            submitted: true,
          },
        },
      },
      select: {
        id: true,
        sessionId: true,
        messages: {
          where: {
            submitted: true,
          },
          select: {
            sessionId: true,
            extractedData: true,
          },
        },
      },
    });

    return sessions;
  }

  async findSubmittedMessagesBySessionId(userId: number, sessionId: string) {
    const userExists = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    if (!userExists) {
      throw new NotFoundException('User not found');
    }

    const session = await this.prisma.aiSession.findFirst({
      where: {
        sessionId,
        userId,
      },
      include: {
        messages: {
          where: {
            submitted: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }
}
