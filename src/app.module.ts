import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './config/prisma/prisma.module';
import { AuthModule } from './main/auth/auth.module';
import { RedisModule } from './config/redis/redis.module';
import { DeployFilesModule } from './config/deploy-files/deploy-files.module';
import { DestinationModule } from './main/destination/destination.module';
import { SeedModule } from './main/maintenance/seed/seed.module';
import { SubscriptionPeriodModule } from './main/subscription-period/subscription-period.module';
import { SubscriptionModule } from './main/subscription/subscription.module';
import { AdminModule } from './main/admin/admin.module';
import { AiModule } from './main/ai/ai.module';
import { HelpRequestModule } from './main/help-request/help-request.module';
import { DisputeModule } from './main/dispute/dispute.module';

import { FlightModule } from './main/flight/flight.module';
import { HotelModule } from './main/hotel/hotel.module';
import { NotificationModule } from './main/notification/notification.module';
import { WeatherModule } from './main/weather/weather.module';
import { TripModule } from './main/trip/trip.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    DeployFilesModule,
    AuthModule,
    DestinationModule,
    SeedModule,
    SubscriptionModule,
    HelpRequestModule,
    SubscriptionPeriodModule,
    AdminModule,
    AiModule,
    DisputeModule,
    FlightModule,
    HotelModule,
    NotificationModule,
    WeatherModule,
    TripModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
