import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AmadeusGuestReferenceDto } from './create-hotel-booking.dto';

/**
 * Body for PATCH /amadeus/hotels/orders/:hotelOrderId/bookings/:hotelBookingId
 *
 * Deliberately restricted: the Hotel Booking Manage API is only used here to
 * update the traveller's loyalty/customer ID and special requests (remarks),
 * per section 3.2.1 of the Quick-Connect Implementation Guide. Date changes
 * and form-of-payment changes are NOT exposed by this endpoint.
 *
 * IMPORTANT (Amadeus rule): a booking cannot be modified within 24 hours
 * before check-in. Amadeus rejects such requests; the error is surfaced to
 * the caller unchanged in status and detail.
 */
export class UpdateHotelBookingDto {
  @ApiProperty({
    example: 'I will arrive at midnight',
    required: false,
    description: 'Special request / remark for the hotel (e.g. late arrival, high floor)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  specialRequest?: string;

  @ApiProperty({
    type: [AmadeusGuestReferenceDto],
    required: false,
    description:
      'Guest references carrying the hotel loyalty ID to set on the booking',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmadeusGuestReferenceDto)
  guestReferences?: AmadeusGuestReferenceDto[];
}

export class GetBookingByReferenceDto {
  @ApiProperty({
    example: 'XK3P2R',
    description: 'The record locator / reference from the booking confirmation',
  })
  @IsString()
  @IsNotEmpty()
  reference!: string;

  @ApiProperty({
    example: 'GDS',
    required: false,
    description: 'Origin system of the reference (GDS for Amadeus GDS content)',
  })
  @IsOptional()
  @IsString()
  originSystemCode?: string;
}
