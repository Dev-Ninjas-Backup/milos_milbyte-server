import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    description: 'The title of the AI session',
    example: 'Paris Trip Planning',
  })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiPropertyOptional({
    description: 'Optional description for the session',
    example: 'Planning a 2-week trip to Paris in summer 2026',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
