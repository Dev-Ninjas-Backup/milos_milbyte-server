import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AmadeusService } from './amadeus.service';
import {
  ListHotelsByCityDto,
  ListHotelsByGeocodeDto,
  ListHotelsByIdsDto,
  GetHotelContentDto,
} from './dto/hotel-list.dto';
import { SearchHotelOffersDto } from './dto/search-hotel-offers.dto';
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';
import {
  UpdateHotelBookingDto,
  GetBookingByReferenceDto,
} from './dto/manage-hotel-booking.dto';

@ApiTags('Hotels (Amadeus)')
@ApiBearerAuth()
@Controller('amadeus/hotels')
export class AmadeusController {
  constructor(private readonly amadeusService: AmadeusService) {}

  // ──────────────────────────────────────────────
  // GET /amadeus/hotels/list/by-city
  // ──────────────────────────────────────────────
  @Get('list/by-city')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List hotels by city (Amadeus Hotel List)',
    description:
      'Returns Amadeus hotel IDs and basic property data for a city. Use the returned hotelIds with the offers search.',
  })
  @ApiResponse({ status: 200, description: 'Returns hotels in the city' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Amadeus API error' })
  async listHotelsByCity(@Query() dto: ListHotelsByCityDto) {
    return await this.amadeusService.listHotelsByCity(dto);
  }

  // ──────────────────────────────────────────────
  // GET /amadeus/hotels/list/by-geocode
  // ──────────────────────────────────────────────
  @Get('list/by-geocode')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List hotels by geocode (Amadeus Hotel List)',
    description:
      'Returns Amadeus hotel IDs around a latitude/longitude point, within an optional radius.',
  })
  @ApiResponse({ status: 200, description: 'Returns hotels near the point' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Amadeus API error' })
  async listHotelsByGeocode(@Query() dto: ListHotelsByGeocodeDto) {
    return await this.amadeusService.listHotelsByGeocode(dto);
  }

  // ──────────────────────────────────────────────
  // GET /amadeus/hotels/list/by-ids
  // ──────────────────────────────────────────────
  @Get('list/by-ids')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List hotels by Amadeus hotel IDs (Amadeus Hotel List)',
    description: 'Returns basic property data for the given hotel IDs.',
  })
  @ApiResponse({ status: 200, description: 'Returns the requested hotels' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Amadeus API error' })
  async listHotelsByIds(@Query() dto: ListHotelsByIdsDto) {
    return await this.amadeusService.listHotelsByIds(dto);
  }

  // ──────────────────────────────────────────────
  // GET /amadeus/hotels/content
  // ──────────────────────────────────────────────
  @Get('content')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get hotel descriptive content (Amadeus Hotel Content Details)',
    description:
      'Returns descriptive content (description, rooms, images, facilities, policies) for one hotel. Static content — safe to cache on the client side.',
  })
  @ApiResponse({ status: 200, description: 'Returns hotel content details' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Amadeus API error' })
  async getHotelContent(@Query() dto: GetHotelContentDto) {
    return await this.amadeusService.getHotelContent(dto);
  }

  // ──────────────────────────────────────────────
  // GET /amadeus/hotels/offers
  // ──────────────────────────────────────────────
  @Get('offers')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search hotel offers (Amadeus Hotel Search)',
    description:
      'Searches live offers (price, cancellation policy, room details) for the given hotel IDs and stay parameters. This is also the mandatory pricing step before booking.',
  })
  @ApiResponse({ status: 200, description: 'Returns matching hotel offers' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Amadeus API error' })
  async searchOffers(@Query() dto: SearchHotelOffersDto) {
    return await this.amadeusService.searchOffers(dto);
  }

  // ──────────────────────────────────────────────
  // GET /amadeus/hotels/offers/:offerId
  // ──────────────────────────────────────────────
  @Get('offers/:offerId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Price a single hotel offer (Amadeus Hotel Search)',
    description:
      'Re-prices one offer by ID to confirm final price, taxes and cancellation policy immediately before booking.',
  })
  @ApiParam({ name: 'offerId', description: 'Amadeus hotel offer ID', example: 'SXI2HHVSLU' })
  @ApiResponse({ status: 200, description: 'Returns the priced offer' })
  @ApiResponse({ status: 404, description: 'Offer not found or expired' })
  @ApiResponse({ status: 502, description: 'Amadeus API error' })
  async getOffer(
    @Param('offerId') offerId: string,
    @Query('lang') lang?: string,
  ) {
    return await this.amadeusService.getOffer(offerId, lang);
  }

  // ──────────────────────────────────────────────
  // POST /amadeus/hotels/orders
  // ──────────────────────────────────────────────
  @Post('orders')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a hotel booking (Amadeus Hotel Booking)',
    description:
      'Creates a hotel order from one or more priced offer IDs (multi-room supported), guest details and card payment. An ama-Client-Ref header is sent with every booking. The response contains the hotelOrderId and the record locator (associatedRecords) needed to retrieve, modify or cancel the booking later.',
  })
  @ApiResponse({ status: 201, description: 'Booking created; returns the hotel order' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Amadeus API error' })
  async createBooking(@Body() dto: CreateHotelBookingDto) {
    return await this.amadeusService.createBooking(dto);
  }

  // ──────────────────────────────────────────────
  // GET /amadeus/hotels/orders/by-reference
  // (declared before orders/:hotelOrderId so it is not captured as an ID)
  // ──────────────────────────────────────────────
  @Get('orders/by-reference')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrieve a booking by reference (Amadeus Hotel Booking Retrieve by Reference)',
    description:
      'Retrieves a hotel order using its record locator / reference and origin system code (GDS by default).',
  })
  @ApiResponse({ status: 200, description: 'Returns the hotel order' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 502, description: 'Amadeus API error' })
  async getBookingByReference(@Query() dto: GetBookingByReferenceDto) {
    return await this.amadeusService.getBookingByReference(
      dto.reference,
      dto.originSystemCode,
    );
  }

  // ──────────────────────────────────────────────
  // GET /amadeus/hotels/orders/:hotelOrderId
  // ──────────────────────────────────────────────
  @Get('orders/:hotelOrderId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrieve a booking by order ID (Amadeus Hotel Booking Retrieve)',
    description: 'Retrieves a hotel order by its Amadeus hotelOrderId.',
  })
  @ApiParam({ name: 'hotelOrderId', description: 'Amadeus hotel order ID', example: 'QVHNP2D8ZL' })
  @ApiResponse({ status: 200, description: 'Returns the hotel order' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 502, description: 'Amadeus API error' })
  async getBookingById(@Param('hotelOrderId') hotelOrderId: string) {
    return await this.amadeusService.getBookingById(hotelOrderId);
  }

  // ──────────────────────────────────────────────
  // PATCH /amadeus/hotels/orders/:hotelOrderId/bookings/:hotelBookingId
  // ──────────────────────────────────────────────
  @Patch('orders/:hotelOrderId/bookings/:hotelBookingId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Modify a booking — remarks & loyalty ID (Amadeus Hotel Booking Manage)',
    description:
      'Updates only the special request (remark) and/or the guest hotel loyalty ID of an existing room booking. Amadeus does not allow modifications within 24 hours before check-in; such requests are rejected by Amadeus and the error is returned to the caller.',
  })
  @ApiParam({ name: 'hotelOrderId', description: 'Amadeus hotel order ID' })
  @ApiParam({ name: 'hotelBookingId', description: 'Amadeus hotel booking ID within the order' })
  @ApiResponse({ status: 200, description: 'Booking updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Amadeus API error' })
  async updateBooking(
    @Param('hotelOrderId') hotelOrderId: string,
    @Param('hotelBookingId') hotelBookingId: string,
    @Body() dto: UpdateHotelBookingDto,
  ) {
    return await this.amadeusService.updateBooking(
      hotelOrderId,
      hotelBookingId,
      dto,
    );
  }

  // ──────────────────────────────────────────────
  // POST /amadeus/hotels/orders/:hotelOrderId/bookings/:hotelBookingId/cancel
  // ──────────────────────────────────────────────
  @Post('orders/:hotelOrderId/bookings/:hotelBookingId/cancel')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel one room booking (Amadeus Hotel Booking Manage)',
    description:
      'Cancels a single room booking inside a hotel order. Multi-room orders keep their remaining rooms.',
  })
  @ApiParam({ name: 'hotelOrderId', description: 'Amadeus hotel order ID' })
  @ApiParam({ name: 'hotelBookingId', description: 'Amadeus hotel booking ID within the order' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 502, description: 'Amadeus API error' })
  async cancelBooking(
    @Param('hotelOrderId') hotelOrderId: string,
    @Param('hotelBookingId') hotelBookingId: string,
  ) {
    return await this.amadeusService.cancelBooking(hotelOrderId, hotelBookingId);
  }

  // ──────────────────────────────────────────────
  // DELETE /amadeus/hotels/orders/:hotelOrderId/bookings/:hotelBookingId
  // ──────────────────────────────────────────────
  @Delete('orders/:hotelOrderId/bookings/:hotelBookingId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete/cancel a room booking (Amadeus Hotel Booking Manage)',
    description:
      'DELETE variant of the Booking Manage cancellation for one room booking inside a hotel order.',
  })
  @ApiParam({ name: 'hotelOrderId', description: 'Amadeus hotel order ID' })
  @ApiParam({ name: 'hotelBookingId', description: 'Amadeus hotel booking ID within the order' })
  @ApiResponse({ status: 200, description: 'Booking deleted/cancelled' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 502, description: 'Amadeus API error' })
  async deleteBooking(
    @Param('hotelOrderId') hotelOrderId: string,
    @Param('hotelBookingId') hotelBookingId: string,
  ) {
    return await this.amadeusService.deleteBooking(hotelOrderId, hotelBookingId);
  }
}
