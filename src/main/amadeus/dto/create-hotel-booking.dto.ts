import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEmail,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AmadeusGuestDto {
  @ApiProperty({
    example: 1,
    description:
      'Guest identifier within the order. Referenced by roomAssociations via guestReference. Defaults to the guest position (1-based) if omitted.',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  tid?: number;

  @ApiProperty({ example: 'MR', enum: ['MR', 'MRS', 'MS'], required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Adam' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Rock' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '4854845247', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'adam.rock@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class AmadeusGuestReferenceDto {
  @ApiProperty({
    example: '1',
    description: 'The tid of a guest in the guests array, as a string',
  })
  @IsString()
  @IsNotEmpty()
  guestReference!: string;

  @ApiProperty({
    example: '3081031320523260',
    required: false,
    description: 'Hotel loyalty programme ID for this guest',
  })
  @IsOptional()
  @IsString()
  hotelLoyaltyId?: string;
}

export class AmadeusRoomAssociationDto {
  @ApiProperty({
    example: 'SXI2HHVSLU',
    description: 'The hotelOfferId returned by the Hotel Search (pricing) step',
  })
  @IsString()
  @IsNotEmpty()
  hotelOfferId!: string;

  @ApiProperty({ type: [AmadeusGuestReferenceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AmadeusGuestReferenceDto)
  guestReferences!: AmadeusGuestReferenceDto[];
}

export class AmadeusPaymentCardInfoDto {
  @ApiProperty({ example: 'AX', description: 'Card vendor code (e.g. VI, MC, AX)' })
  @IsString()
  @IsNotEmpty()
  vendorCode!: string;

  @ApiProperty({ example: '345678000000007', description: 'Card number (sent only to Amadeus, never stored by Solara)' })
  @IsString()
  @IsNotEmpty()
  cardNumber!: string;

  @ApiProperty({ example: '4111', required: false })
  @IsOptional()
  @IsString()
  securityCode?: string;

  @ApiProperty({ example: '0139', description: 'Card expiry in MMYY format' })
  @IsString()
  @IsNotEmpty()
  expiryDate!: string;

  @ApiProperty({ example: 'Adam Rock' })
  @IsString()
  @IsNotEmpty()
  holderName!: string;
}

export class AmadeusPaymentDto {
  @ApiProperty({
    example: 'CREDIT_CARD',
    enum: ['CREDIT_CARD'],
    description:
      'Payment method. Per the Quick-Connect guide the booking is paid by card; who ultimately collects the payment (Solara vs Amadeus vs hotel) is still an open question with the client.',
  })
  @IsString()
  method!: 'CREDIT_CARD';

  @ApiProperty({ type: AmadeusPaymentCardInfoDto })
  @ValidateNested()
  @Type(() => AmadeusPaymentCardInfoDto)
  paymentCardInfo!: AmadeusPaymentCardInfoDto;
}

export class AmadeusTravelAgentDto {
  @ApiProperty({ example: 'agent@example.com', description: 'Travel agent contact email' })
  @IsEmail()
  email!: string;
}

export class CreateHotelBookingDto {
  @ApiProperty({ type: [AmadeusGuestDto], description: 'Guests for the order (at least one)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AmadeusGuestDto)
  guests!: AmadeusGuestDto[];

  @ApiProperty({
    type: [AmadeusRoomAssociationDto],
    description:
      'One entry per room: the priced hotelOfferId plus the guests staying in that room. Multiple entries create a multi-room order.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AmadeusRoomAssociationDto)
  roomAssociations!: AmadeusRoomAssociationDto[];

  @ApiProperty({ type: AmadeusPaymentDto })
  @ValidateNested()
  @Type(() => AmadeusPaymentDto)
  payment!: AmadeusPaymentDto;

  @ApiProperty({ type: AmadeusTravelAgentDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AmadeusTravelAgentDto)
  travelAgent?: AmadeusTravelAgentDto;

  @ApiProperty({
    example: 'SOLARA-2026-000123',
    required: false,
    description:
      'Client reference sent to Amadeus in the ama-Client-Ref header so the booking can be traced back to Solara. Generated automatically if omitted.',
  })
  @IsOptional()
  @IsString()
  clientRef?: string;
}
