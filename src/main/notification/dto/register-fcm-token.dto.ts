import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterFcmTokenDto {
  @ApiProperty({ description: 'Firebase Cloud Messaging token', example: 'fcm_token_here...' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({ description: 'Device info (optional)', example: 'Android / iPhone 15' })
  @IsString()
  @IsOptional()
  device?: string;
}
