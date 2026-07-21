import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TripStatus } from '@prisma/client';

export class UpdateTripDto {
  @ApiPropertyOptional({ enum: TripStatus, example: TripStatus.UPCOMING })
  @IsEnum(TripStatus)
  @IsOptional()
  status?: TripStatus;
}
