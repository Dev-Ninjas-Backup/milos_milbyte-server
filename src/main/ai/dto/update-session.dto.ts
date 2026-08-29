import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSessionDto {
  @ApiPropertyOptional({
    description: 'Update the title of the AI session',
    example: 'Updated Paris Trip Planning',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Update the description of the session',
    example: 'Updated description for the session',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
