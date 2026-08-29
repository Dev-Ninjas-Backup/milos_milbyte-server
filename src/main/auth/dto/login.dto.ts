import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'john@gmail.com', description: 'Email address of the user' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'Password of the user' })
  @IsString()
  @MinLength(6)
  password!: string;
}
