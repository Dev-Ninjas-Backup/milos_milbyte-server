import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John', description: 'First name of the user' })
  @IsString()
  @MinLength(2)
  firstName!: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  @IsString()
  @MinLength(2)
  lastName!: string;

  @ApiProperty({ example: 'john@gmail.com', description: 'Email address of the user' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'Password of the user' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ enum: UserRoles, example: UserRoles.CLIENT, description: 'Role of the user' })
  @IsOptional()
  @IsEnum(UserRoles)
  role?: UserRoles;
}
