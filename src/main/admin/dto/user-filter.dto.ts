import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { SubscriptionStatus, PlanTier } from '@prisma/client';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserFilterDto {
  @ApiProperty({
    required: false,
    enum: SubscriptionStatus,
    description: 'Filter by subscription status',
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({
    required: false,
    enum: PlanTier,
    description: 'Filter by subscription plan tier',
    example: 'STANDARD',
  })
  @IsOptional()
  @IsEnum(PlanTier)
  tier?: PlanTier;

  @ApiProperty({
    required: false,
    description: 'Search by email or name',
    example: 'john@example.com',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Number of results per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
