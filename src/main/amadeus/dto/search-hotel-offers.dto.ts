import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsInt,
  IsBoolean,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { splitCommaSeparated, toBoolean } from './hotel-list.dto';

export class SearchHotelOffersDto {
  @ApiProperty({
    example: 'ADNYC052,RDLON308',
    description:
      'Comma-separated Amadeus hotel IDs to search offers for (from the Hotel List API)',
  })
  @Transform(splitCommaSeparated)
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  hotelIds!: string[];

  @ApiProperty({ example: 2, required: false, description: 'Number of adult guests (default 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  adults?: number;

  @ApiProperty({
    example: '2026-09-10',
    required: false,
    description: 'Check-in date (YYYY-MM-DD). Defaults to today at Amadeus if omitted.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'checkInDate must be a valid date in YYYY-MM-DD format' })
  checkInDate?: string;

  @ApiProperty({
    example: '2026-09-15',
    required: false,
    description: 'Check-out date (YYYY-MM-DD). Defaults to check-in + 1 day at Amadeus if omitted.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'checkOutDate must be a valid date in YYYY-MM-DD format' })
  checkOutDate?: string;

  @ApiProperty({
    example: '5,10',
    required: false,
    description: 'Comma-separated ages of child guests',
  })
  @IsOptional()
  @Transform(splitCommaSeparated)
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  childAges?: number[];

  @ApiProperty({ example: 'US', required: false, description: 'Country of residence of the guests (ISO country code)' })
  @IsOptional()
  @IsString()
  countryOfResidence?: string;

  @ApiProperty({ example: 1, required: false, description: 'Number of rooms (default 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomQuantity?: number;

  @ApiProperty({ example: 'BAR', required: false, description: 'Comma-separated rate codes to filter by' })
  @IsOptional()
  @IsString()
  rateCodes?: string;

  @ApiProperty({
    example: '100-300',
    required: false,
    description: 'Price range filter, min-max in the requested currency',
  })
  @IsOptional()
  @IsString()
  priceRange?: string;

  @ApiProperty({ example: 'USD', required: false, description: 'Currency for prices (ISO 4217)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    example: 'GUARANTEE',
    enum: ['GUARANTEE', 'DEPOSIT', 'NONE'],
    required: false,
    description: 'Payment policy filter',
  })
  @IsOptional()
  @IsString()
  paymentPolicy?: string;

  @ApiProperty({
    example: 'BREAKFAST',
    enum: ['ROOM_ONLY', 'BREAKFAST', 'HALF_BOARD', 'FULL_BOARD', 'ALL_INCLUSIVE'],
    required: false,
    description: 'Board type filter',
  })
  @IsOptional()
  @IsString()
  boardType?: string;

  @ApiProperty({ example: false, required: false, description: 'Include closed/sold-out properties' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeClosed?: boolean;

  @ApiProperty({ example: true, required: false, description: 'Return only the best rate per hotel' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  bestRateOnly?: boolean;

  @ApiProperty({ example: 0, required: false, description: 'Pagination offset (sent as page[offset])' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pageOffset?: number;

  @ApiProperty({ example: 'EN', required: false, description: 'Language code for descriptive content' })
  @IsOptional()
  @IsString()
  lang?: string;
}
