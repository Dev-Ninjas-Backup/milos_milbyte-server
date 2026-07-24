import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleTwoFactorDto {
  @ApiProperty({ example: true, description: 'Set true to enable 2FA, false to disable' })
  @IsBoolean()
  enable!: boolean;
}
