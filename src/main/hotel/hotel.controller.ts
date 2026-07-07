import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HotelService } from './hotel.service';
import { SearchHotelsDto } from './dto/search-hotels.dto';
import { GetRatesDto } from './dto/get-rates.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { BookHotelDto } from './dto/book-hotel.dto';

@ApiTags('Hotels (Stays)')
@ApiBearerAuth()
@Controller('hotels')
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  // ──────────────────────────────────────────────
  // GET /hotels/search
  // ──────────────────────────────────────────────
  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search available hotels',
    description:
      'Searches for accommodations near a geographic location using the Duffel Stays API. Returns a list of accommodations with basic pricing.',
  })
  @ApiQuery({ name: 'lat', description: 'Latitude of search location', example: '51.5074' })
  @ApiQuery({ name: 'lng', description: 'Longitude of search location', example: '-0.1278' })
  @ApiQuery({ name: 'checkIn', description: 'Check-in date (YYYY-MM-DD)', example: '2026-09-10' })
  @ApiQuery({ name: 'checkOut', description: 'Check-out date (YYYY-MM-DD)', example: '2026-09-15' })
  @ApiResponse({ status: 200, description: 'Returns matching accommodations with pricing' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Duffel API error' })
  async searchHotels(@Query() dto: SearchHotelsDto) {
    return await this.hotelService.searchHotels(dto);
  }

  // ──────────────────────────────────────────────
  // GET /hotels/rates
  // ──────────────────────────────────────────────
  @Get('rates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all rates for an accommodation',
    description:
      'Fetches all available rate plans for a specific accommodation within a search result. Call this after searching to view detailed pricing and cancellation policies.',
  })
  @ApiQuery({ name: 'searchId', description: 'Duffel stays search result ID', example: 'stays_search_result_0001XYZ' })
  @ApiQuery({ name: 'accommodationId', description: 'Duffel accommodation ID', example: 'acc_0001XYZ' })
  @ApiResponse({ status: 200, description: 'Returns list of rate plans with pricing' })
  @ApiResponse({ status: 502, description: 'Duffel API error' })
  async getRates(@Query() dto: GetRatesDto) {
    return await this.hotelService.getRates(dto);
  }

  // ──────────────────────────────────────────────
  // POST /hotels/quote
  // ──────────────────────────────────────────────
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a price quote for a rate',
    description:
      'Generates a locked price quote from a Duffel rate ID. The quote expires after a short window — always book using the returned quote_id, not the rate_id.',
  })
  @ApiResponse({ status: 200, description: 'Returns a locked price quote with expiry time' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Duffel API error' })
  async createQuote(@Body() dto: CreateQuoteDto) {
    return await this.hotelService.createQuote(dto);
  }

  // ──────────────────────────────────────────────
  // POST /hotels/book
  // ──────────────────────────────────────────────
  @Post('book')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Book a hotel stay',
    description:
      'Confirms a hotel booking with Duffel using the locked quote ID and guest details. On success, saves a HotelBooking record to the local database with status CONFIRMED.',
  })
  @ApiResponse({ status: 201, description: 'Booking confirmed and saved to database' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Duffel API error' })
  async bookHotel(@Body() dto: BookHotelDto) {
    return await this.hotelService.bookHotel(dto);
  }
}
