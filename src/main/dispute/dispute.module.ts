import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DisputeController } from './dispute.controller';
import { DisputeService } from './dispute.service';

@Module({
  imports: [AuthModule],
  controllers: [DisputeController],
  providers: [DisputeService],
})
export class DisputeModule {}
