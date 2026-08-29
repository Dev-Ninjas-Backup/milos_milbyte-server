import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@gmail.com', description: 'Email address of the user' })
  @IsEmail()
  email!: string;
}
