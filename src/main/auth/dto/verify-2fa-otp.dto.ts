import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length } from 'class-validator';

export class VerifyTwoFactorOtpDto {
  @ApiProperty({ example: 1, description: 'User ID received from login response' })
  @IsInt()
  userId!: number;

  @ApiProperty({ example: '123456', description: '6-digit 2FA OTP sent to email' })
  @IsString()
  @Length(6, 6)
  otp!: string;
}
