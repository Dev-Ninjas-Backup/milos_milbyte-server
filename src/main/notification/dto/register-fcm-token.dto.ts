import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DevicePlatform } from '@prisma/client';

export class RegisterFcmTokenDto {
  @ApiProperty({ description: 'Firebase Cloud Messaging token', example: 'fcm_token_here...' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({ description: 'Device info (optional)', example: 'Android / iPhone 15 / Chrome' })
  @IsString()
  @IsOptional()
  device?: string;

  @ApiProperty({
    description: 'Platform type: WEB or MOBILE',
    enum: DevicePlatform,
    example: DevicePlatform.MOBILE,
    default: DevicePlatform.MOBILE,
  })
  @IsEnum(DevicePlatform)
  @IsOptional()
  platform?: DevicePlatform = DevicePlatform.MOBILE;
}
