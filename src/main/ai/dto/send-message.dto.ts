import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'The message from the user to the AI',
    example: 'I want to plan a trip to Paris next month.',
  })
  @IsNotEmpty()
  @IsString()
  message!: string;
}
