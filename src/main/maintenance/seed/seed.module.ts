import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from 'src/config/prisma/prisma.module';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [SeedController],
  providers: [SeedService, AuthGuard, RolesGuard],
})
export class SeedModule {}
