import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsDateString,
  IsEmail,
  IsIn,
  ArrayMinSize,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PassengerDetailDto {
  @ApiProperty({ example: 'adult', enum: ['adult', 'child', 'infant_without_seat'] })
  @IsString()
  @IsIn(['adult', 'child', 'infant_without_seat'])
  type!: 'adult' | 'child' | 'infant_without_seat';

  @ApiProperty({
    example: 'mr',
    enum: ['mr', 'ms', 'mrs', 'miss', 'dr'],
    description: 'Title / salutation required by Duffel',
  })
  @IsString()
  @IsIn(['mr', 'ms', 'mrs', 'miss', 'dr'])
  title !: 'mr' | 'ms' | 'mrs' | 'miss' | 'dr';

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  given_name!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  family_name!: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  born_on!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+14155551234' })
  @IsString()
  @IsNotEmpty()
  phone_number!: string;

  @ApiProperty({ example: 'm', enum: ['m', 'f'] })
  @IsString()
  @IsIn(['m', 'f'])
  gender!: 'm' | 'f';
}

export class BookFlightDto {
  @ApiProperty({
    example: ['off_0000AhZhD9OvFtOOQxkOyA'],
    description:
      'Array of Duffel offer IDs to book. Passenger IDs and pricing are resolved automatically from the offer — do NOT provide them manually.',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  selected_offers!: string[];

  @ApiProperty({
    type: [PassengerDetailDto],
    description:
      'Passenger details in the same order and type as the passengers returned in the search response. The service matches them by index to the offer passenger IDs automatically.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerDetailDto)
  passengers!: PassengerDetailDto[];

  @ApiProperty({ example: 1, description: 'Authenticated user ID' })
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiProperty({
    example: 'ONE_WAY',
    enum: ['ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY'],
  })
  @IsString()
  @IsIn(['ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY'])
  bookingType!: 'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_CITY';
}
