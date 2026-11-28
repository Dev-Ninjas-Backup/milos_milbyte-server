import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AmadeusController } from './amadeus.controller';
import { AmadeusService } from './amadeus.service';
import { AmadeusAuthService } from './amadeus-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [AmadeusController],
  providers: [AmadeusService, AmadeusAuthService],
  exports: [AmadeusService],
})
export class AmadeusModule {}
