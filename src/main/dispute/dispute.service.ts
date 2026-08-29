import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DisputeStatus } from '@prisma/client';
import { PrismaService } from 'src/config/prisma/prisma.service';
import {
  CreateDisputeDto,
  DisputeQueryDto,
  UpdateDisputeStatusDto,
} from './dto/dispute.dto';

@Injectable()
export class DisputeService {
  constructor(private readonly prisma: PrismaService) { }

  // ─── USER: Create a new dispute ───────────────────────────────────────────
  async create(userId: number, createDisputeDto: CreateDisputeDto) {
    const dispute = await this.prisma.dispute.create({
      data: {
        userId,
        title: createDisputeDto.title,
        category: createDisputeDto.category,
        description: createDisputeDto.description,
        priority: createDisputeDto.priority,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return {
      message: 'Dispute submitted successfully',
      dispute,
    };
  }

  // ─── USER: Get own disputes ────────────────────────────────────────────────
  async findMyDisputes(userId: number) {
    const disputes = await this.prisma.dispute.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return {
      message: 'Your disputes fetched successfully',
      total: disputes.length,
      disputes,
    };
  }

  // ─── USER: Get one own dispute ─────────────────────────────────────────────
  async findMyOne(userId: number, id: number) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });

    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.userId !== userId)
      throw new ForbiddenException('You do not have access to this dispute');

    return {
      message: 'Dispute fetched successfully',
      dispute,
    };
  }

  // ─── ADMIN: Get all disputes with optional filters ─────────────────────────
  async findAll(query: DisputeQueryDto) {
    const disputes = await this.prisma.dispute.findMany({
      where: {
        ...(query.status && { status: query.status }),
        ...(query.category && { category: query.category }),
        ...(query.priority && { priority: query.priority }),
        ...(query.userId && { userId: Number(query.userId) }),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return {
      message: 'Disputes fetched successfully',
      total: disputes.length,
      disputes,
    };
  }

  // ─── ADMIN: Get single dispute ─────────────────────────────────────────────
  async findOne(id: number) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!dispute) throw new NotFoundException('Dispute not found');

    return {
      message: 'Dispute fetched successfully',
      dispute,
    };
  }

  // ─── ADMIN: Update dispute status & reply ──────────────────────────────────
  async updateStatus(id: number, updateDto: UpdateDisputeStatusDto) {
    await this.findOne(id);

    const isResolved =
      updateDto.status === DisputeStatus.RESOLVED ||
      updateDto.status === DisputeStatus.CLOSED ||
      updateDto.status === DisputeStatus.REJECTED;

    const dispute = await this.prisma.dispute.update({
      where: { id },
      data: {
        status: updateDto.status,
        ...(updateDto.adminReply && { adminReply: updateDto.adminReply }),
        resolvedAt: isResolved ? new Date() : null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return {
      message: 'Dispute status updated successfully',
      dispute,
    };
  }

  // ─── ADMIN: Delete a dispute ───────────────────────────────────────────────
  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.dispute.delete({ where: { id } });

    return {
      message: 'Dispute deleted successfully',
    };
  }

  // ─── ADMIN: Get dispute statistics ────────────────────────────────────────
  async getStats() {
    const [total, open, underReview, resolved, rejected, closed] =
      await Promise.all([
        this.prisma.dispute.count(),
        this.prisma.dispute.count({ where: { status: DisputeStatus.OPEN } }),
        this.prisma.dispute.count({
          where: { status: DisputeStatus.UNDER_REVIEW },
        }),
        this.prisma.dispute.count({
          where: { status: DisputeStatus.RESOLVED },
        }),
        this.prisma.dispute.count({
          where: { status: DisputeStatus.REJECTED },
        }),
        this.prisma.dispute.count({ where: { status: DisputeStatus.CLOSED } }),
      ]);

    return {
      message: 'Dispute statistics fetched successfully',
      stats: {
        total,
        open,
        underReview,
        resolved,
        rejected,
        closed,
      },
    };
  }
}
