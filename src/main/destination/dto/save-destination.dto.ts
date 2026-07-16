import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class SaveDestinationDto {
  @ApiProperty({ description: 'ID of the destination to save', example: 1 })
  @IsInt()
  @IsPositive()
  destinationId: number;
}
