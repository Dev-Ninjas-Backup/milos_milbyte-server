import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsOptional,
  IsIn,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class PassengerDto {
  @ApiProperty({ example: 'adult', enum: ['adult', 'child', 'infant_without_seat'] })
  @IsString()
  @IsIn(['adult', 'child', 'infant_without_seat'])
  type!: 'adult' | 'child' | 'infant_without_seat';
}

export class SliceDto {
  @ApiProperty({ example: 'LHR', description: 'Valid 3-letter IATA airport code for origin (e.g. DAC, LHR, JFK)' })
  @IsString()
  @IsNotEmpty()
  // @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  // @Matches(/^[A-Z]{3}$/, {
  //   message: 'origin must be a valid 3-letter IATA airport code (e.g. DAC, LHR, JFK)',
  // })
  origin!: string;

  @ApiProperty({ example: 'JFK', description: 'Valid 3-letter IATA airport code for destination (e.g. DAC, LHR, JFK)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{3}$/, {
    message: 'destination must be a valid 3-letter IATA airport code (e.g. DAC, LHR, JFK)',
  })
  destination!: string;

  @ApiProperty({ example: '2026-09-01', description: 'Departure date in YYYY-MM-DD format' })
  @IsDateString({}, { message: 'departure_date must be a valid date in YYYY-MM-DD format' })
  departure_date!: string;
}

export class SearchFlightsDto {
  @ApiProperty({ type: [SliceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SliceDto)
  slices!: SliceDto[];

  @ApiProperty({ type: [PassengerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers!: PassengerDto[];

  @ApiProperty({
    example: 'economy',
    enum: ['economy', 'premium_economy', 'business', 'first'],
    required: false,
    description: 'Cabin class. Defaults to "economy" if not provided.',
  })
  @IsOptional()
  @IsString()
  @IsIn(['economy', 'premium_economy', 'business', 'first'])
  cabin_class?: 'economy' | 'premium_economy' | 'business' | 'first';
}
