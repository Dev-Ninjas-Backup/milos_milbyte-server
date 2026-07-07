import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GuestDetailsDto {
  @ApiProperty({ example: 'John', description: "Guest's first name" })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe', description: "Guest's last name" })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: "Guest's email address",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '+14155551234',
    description: "Guest's phone number in E.164 format",
  })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class BookHotelDto {
  @ApiProperty({
    example: 'quote_0001XYZ',
    description: 'The Duffel quote ID returned from the quote endpoint',
  })
  @IsString()
  @IsNotEmpty()
  quoteId!: string;

  @ApiProperty({
    type: GuestDetailsDto,
    description: 'Primary guest details for the booking',
  })
  @ValidateNested()
  @Type(() => GuestDetailsDto)
  guestDetails!: GuestDetailsDto;
}
