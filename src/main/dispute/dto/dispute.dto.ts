import { ApiProperty } from '@nestjs/swagger';
import { DisputeCategory, DisputePriority, DisputeStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateDisputeDto {
  @ApiProperty({ example: 'Payment not reflected after booking' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({ enum: DisputeCategory, example: DisputeCategory.PAYMENT })
  @IsEnum(DisputeCategory)
  category!: DisputeCategory;

  @ApiProperty({
    example: 'I made a payment on June 20 but my booking is still pending.',
  })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiProperty({
    enum: DisputePriority,
    required: false,
    example: DisputePriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(DisputePriority)
  priority?: DisputePriority;
}

export class UpdateDisputeStatusDto {
  @ApiProperty({ enum: DisputeStatus })
  @IsEnum(DisputeStatus)
  status!: DisputeStatus;

  @ApiProperty({
    required: false,
    example: 'We have reviewed your dispute and issued a refund.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  adminReply?: string;
}

export class DisputeQueryDto {
  @ApiProperty({ enum: DisputeStatus, required: false })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiProperty({ enum: DisputeCategory, required: false })
  @IsOptional()
  @IsEnum(DisputeCategory)
  category?: DisputeCategory;

  @ApiProperty({ enum: DisputePriority, required: false })
  @IsOptional()
  @IsEnum(DisputePriority)
  priority?: DisputePriority;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  userId?: number;
}
