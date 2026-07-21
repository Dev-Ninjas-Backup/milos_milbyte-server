import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { TripStatus } from '@prisma/client';

export class CreateTripDto {
  @ApiProperty({ example: 1, description: 'ID of the destination' })
  @IsInt()
  @IsNotEmpty()
  destinationId: number;

  @ApiPropertyOptional({ enum: TripStatus, example: TripStatus.PLANNING })
  @IsEnum(TripStatus)
  @IsOptional()
  status?: TripStatus;
}
