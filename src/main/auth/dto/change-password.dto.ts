import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass123!', description: 'Current password of the user' })
  @IsString()
  @MinLength(6)
  currentPassword!: string;

  @ApiProperty({ example: 'NewPass123!', description: 'New password for the user' })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
