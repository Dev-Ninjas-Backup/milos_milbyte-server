import { Module } from '@nestjs/common';
import { HelpRequestController } from './help-request.controller';
import { HelpRequestService } from './help-request.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [HelpRequestController],
  providers: [HelpRequestService],
})
export class HelpRequestModule {}
