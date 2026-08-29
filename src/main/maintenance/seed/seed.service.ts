import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { seedSuperAdmin } from '../../../../prisma/schema/seeds/super-admin.seed';
import { seedFreeSubscriptionPlan } from '../../../../prisma/schema/seeds/free-subscriptionPlan';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runSeed() {
    this.logger.log('Manual seed triggered from API');

    await seedSuperAdmin(this.prisma);
    await seedFreeSubscriptionPlan(this.prisma);

    return {
      message: 'Seed completed successfully',
    };
  }
}
