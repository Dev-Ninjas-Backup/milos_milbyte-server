import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class DestinationQueryDto {
  @ApiPropertyOptional({ example: 'Saint' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'Cox' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  location?: string;
}
