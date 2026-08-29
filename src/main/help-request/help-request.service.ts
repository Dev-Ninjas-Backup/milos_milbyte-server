import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HelpRequestStatus } from '@prisma/client';
import { PrismaService } from 'src/config/prisma/prisma.service';
import {
  CreateHelpRequestDto,
  UpdateHelpRequestDto,
} from './dto/help-request.dto';

@Injectable()
export class HelpRequestService {
  logger = new Logger(HelpRequestService.name);
  constructor(private readonly prisma: PrismaService) { }

  async create(createHelpRequestDto: CreateHelpRequestDto) {
    this.logger.log(`Creating help request for ${createHelpRequestDto.email}`);
    const helpRequest = await this.prisma.helpRequest.create({
      data: {
        name: createHelpRequestDto.name,
        email: createHelpRequestDto.email,
        subject: createHelpRequestDto.subject,
        message: createHelpRequestDto.message,
      },
    });
    this.logger.log(`Help request created for ${createHelpRequestDto.email}`);
    return {
      message: 'Help request submitted successfully',
      helpRequest,
    };
  }

  async findAll() {
    const helpRequests = await this.prisma.helpRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Help requests fetched successfully',
      helpRequests,
    };
  }

  async findOne(id: number) {
    this.logger.log(`Fetching help request with id ${id}`);
    const helpRequest = await this.prisma.helpRequest.findUnique({
      where: { id },
    });

    if (!helpRequest) {
      throw new NotFoundException('Help request not found');
    }

    return {
      message: 'Help request fetched successfully',
      helpRequest,
    };
  }

  async update(id: number, updateHelpRequestDto: UpdateHelpRequestDto) {
    this.logger.log(`Updating help request with id ${id}`);
    const helpRequest = await this.prisma.helpRequest.findUnique({
      where: { id },
    });

    if (!helpRequest) {
      throw new NotFoundException('Help request not found');
    }
    this.logger.log(`Updating help request with id ${id} with data: ${JSON.stringify(updateHelpRequestDto)}`);
    const shouldSetResolvedAt =
      updateHelpRequestDto.status === HelpRequestStatus.RESOLVED ||
      updateHelpRequestDto.status === HelpRequestStatus.CLOSED;

    const updatedHelpRequest = await this.prisma.helpRequest.update({
      where: { id },
      data: {
        ...updateHelpRequestDto,
        resolvedAt: shouldSetResolvedAt ? new Date() : null,
      },
    });
    this.logger.log(`Help request with id ${id} updated successfully`);
    return {
      message: 'Help request updated successfully',
      helpRequest: updatedHelpRequest,
    };
  }

  async remove(id: number) {
    const helpRequest = await this.prisma.helpRequest.findUnique({
      where: { id },
    });

    if (!helpRequest) {
      throw new NotFoundException('Help request not found');
    }

    this.logger.log(`Deleting help request with id ${id}`);
    await this.prisma.helpRequest.delete({
      where: { id },
    });

    this.logger.log(`Help request with id ${id} deleted successfully`);
    return {
      message: 'Help request deleted successfully',
    };
  }
}
