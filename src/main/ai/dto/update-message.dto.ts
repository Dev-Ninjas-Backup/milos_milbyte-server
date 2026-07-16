import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateMessageDto {
  @ApiProperty({
    description: 'The updated message text from the user',
    example: 'I want to travel to Paris instead of London',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  message: string;
}
