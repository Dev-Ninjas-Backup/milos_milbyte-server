import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumberString } from 'class-validator';

export class SearchHotelsDto {
  @ApiProperty({
    example: '51.5074',
    description: 'Latitude of the search location (e.g. 51.5074 for London)',
  })
  @IsNumberString()
  @IsNotEmpty()
  lat!: string;

  @ApiProperty({
    example: '-0.1278',
    description: 'Longitude of the search location (e.g. -0.1278 for London)',
  })
  @IsNumberString()
  @IsNotEmpty()
  lng!: string;

  @ApiProperty({
    example: '2026-09-10',
    description: 'Check-in date in YYYY-MM-DD format',
  })
  @IsString()
  @IsNotEmpty()
  checkIn!: string;

  @ApiProperty({
    example: '2026-09-15',
    description: 'Check-out date in YYYY-MM-DD format',
  })
  @IsString()
  @IsNotEmpty()
  checkOut!: string;
}
