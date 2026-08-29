import { ApiProperty } from '@nestjs/swagger';
import { HelpRequestStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateHelpRequestDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'john@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Payment issue' })
  @IsString()
  @MinLength(3)
  subject!: string;

  @ApiProperty({ example: 'I need help with my payment confirmation flow.' })
  @IsString()
  @MinLength(5)
  message!: string;
}

export class UpdateHelpRequestDto {
  @ApiProperty({ enum: HelpRequestStatus, required: false })
  @IsOptional()
  @IsEnum(HelpRequestStatus)
  status?: HelpRequestStatus;

  @ApiProperty({
    required: false,
    example:
      'Please retry with the same card and confirm payment after subscribe.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  adminReply?: string;
}
