import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class WeatherQueryDto {
  @ApiProperty({
    description: 'City name or location string (e.g. "Dhaka", "New York")',
    example: 'Dhaka',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: '23.8103',
    required: false,
  })
  @IsOptional()
  @IsNumberString()
  lat?: string;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: '90.4125',
    required: false,
  })
  @IsOptional()
  @IsNumberString()
  lon?: string;
}
