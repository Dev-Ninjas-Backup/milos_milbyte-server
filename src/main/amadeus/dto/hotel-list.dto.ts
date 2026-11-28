import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** Splits a comma-separated query value into a trimmed string array. */
export const splitCommaSeparated = ({ value }: { value: unknown }) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return value;
};

/** Converts a query-string boolean ("true"/"false") into a real boolean. */
export const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return value;
};

export class ListHotelsByCityDto {
  @ApiProperty({
    example: 'LON',
    description: 'IATA city code (e.g. LON, PAR, NYC)',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z]{3}$/, {
    message: 'cityCode must be a valid 3-letter IATA city code (e.g. LON)',
  })
  cityCode!: string;

  @ApiProperty({ example: 5, required: false, description: 'Search radius around the city' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radius?: number;

  @ApiProperty({ example: 'KM', enum: ['KM', 'MILE'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['KM', 'MILE'])
  radiusUnit?: 'KM' | 'MILE';

  @ApiProperty({
    example: 'RT,WW',
    required: false,
    description: 'Comma-separated chain codes to filter by',
  })
  @IsOptional()
  @Transform(splitCommaSeparated)
  @IsArray()
  @IsString({ each: true })
  chainCodes?: string[];

  @ApiProperty({
    example: 'SWIMMING_POOL,SPA',
    required: false,
    description: 'Comma-separated amenity codes to filter by',
  })
  @IsOptional()
  @Transform(splitCommaSeparated)
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiProperty({
    example: '4,5',
    required: false,
    description: 'Comma-separated hotel star ratings to filter by',
  })
  @IsOptional()
  @Transform(splitCommaSeparated)
  @IsArray()
  @IsString({ each: true })
  ratings?: string[];

  @ApiProperty({
    example: 'ALL',
    enum: ['BEDBANK', 'DIRECTCHAIN', 'ALL'],
    required: false,
    description: 'Source of the hotel content',
  })
  @IsOptional()
  @IsString()
  @IsIn(['BEDBANK', 'DIRECTCHAIN', 'ALL'])
  hotelSource?: string;
}

export class ListHotelsByGeocodeDto {
  @ApiProperty({ example: 48.8566, description: 'Latitude of the search point' })
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 2.3522, description: 'Longitude of the search point' })
  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @ApiProperty({ example: 5, required: false, description: 'Search radius around the point' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radius?: number;

  @ApiProperty({ example: 'KM', enum: ['KM', 'MILE'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['KM', 'MILE'])
  radiusUnit?: 'KM' | 'MILE';

  @ApiProperty({ example: 'RT,WW', required: false, description: 'Comma-separated chain codes' })
  @IsOptional()
  @Transform(splitCommaSeparated)
  @IsArray()
  @IsString({ each: true })
  chainCodes?: string[];

  @ApiProperty({ example: 'SWIMMING_POOL,SPA', required: false, description: 'Comma-separated amenity codes' })
  @IsOptional()
  @Transform(splitCommaSeparated)
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiProperty({ example: '4,5', required: false, description: 'Comma-separated star ratings' })
  @IsOptional()
  @Transform(splitCommaSeparated)
  @IsArray()
  @IsString({ each: true })
  ratings?: string[];

  @ApiProperty({
    example: 'ALL',
    enum: ['BEDBANK', 'DIRECTCHAIN', 'ALL'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['BEDBANK', 'DIRECTCHAIN', 'ALL'])
  hotelSource?: string;
}

export class ListHotelsByIdsDto {
  @ApiProperty({
    example: 'ADNYC052,RDLON308',
    description: 'Comma-separated Amadeus hotel IDs (8 characters each)',
  })
  @Transform(splitCommaSeparated)
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  hotelIds!: string[];
}

export class GetHotelContentDto {
  @ApiProperty({
    example: 'ADNYC052',
    description: 'Amadeus hotel ID (8 characters)',
  })
  @IsString()
  @IsNotEmpty()
  hotelID!: string;

  @ApiProperty({
    example: 'HOTEL,ROOMS,IMAGES',
    required: false,
    description:
      'Comma-separated content sections to return (e.g. HOTEL, ROOMS, RESTAURANTS, IMAGES, FACILITIES)',
  })
  @IsOptional()
  @IsString()
  fields?: string;

  @ApiProperty({ example: 'EN', required: false, description: 'Language code for descriptive content' })
  @IsOptional()
  @IsString()
  lang?: string;

  @ApiProperty({
    example: 'FULL',
    enum: ['FULL', 'LIGHT', 'NONE'],
    required: false,
    description: 'Amount of content to return',
  })
  @IsOptional()
  @IsString()
  @IsIn(['FULL', 'LIGHT', 'NONE'])
  view?: 'FULL' | 'LIGHT' | 'NONE';
}
