import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FlightService } from './flight.service';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { BookFlightDto } from './dto/book-flight.dto';

@ApiTags('Flights')
@ApiBearerAuth()
@Controller('flights')
export class FlightController {
  constructor(private readonly flightService: FlightService) { }

  // ──────────────────────────────────────────────
  // POST /flights/search
  // ──────────────────────────────────────────────
  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search available flights',
    description:
      'Creates a Duffel offer request for the given slices and passengers. Returns a list of available offers with pricing.',
  })
  @ApiResponse({ status: 200, description: 'Returns matching flight offers' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Duffel API error' })
  async searchFlights(@Body() dto: SearchFlightsDto) {
    return await this.flightService.searchFlights(dto);
  }

  // ──────────────────────────────────────────────
  // GET /flights/offers/:offer_id
  // ──────────────────────────────────────────────
  @Get('offers/:offer_id')
  @ApiOperation({
    summary: 'Get a specific flight offer',
    description:
      'Fetches the latest pricing and availability for a Duffel offer before final booking. Always call this before booking to avoid stale pricing.',
  })
  @ApiParam({
    name: 'offer_id',
    description: 'Duffel offer ID (e.g. off_0000AhZhD9OvFtOOQxkOyA)',
    example: 'off_0000AhZhD9OvFtOOQxkOyA',
  })
  @ApiResponse({ status: 200, description: 'Returns offer details with current pricing' })
  @ApiResponse({ status: 404, description: 'Offer not found or expired' })
  async getOffer(@Param('offer_id') offerId: string) {
    return await this.flightService.getOffer(offerId);
  }

  // ──────────────────────────────────────────────
  // POST /flights/book
  // ──────────────────────────────────────────────
  @Post('book')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Book a flight',
    description:
      'Confirms a Duffel order for the selected offer and passenger details. On success, creates a Booking record in the local database with status CONFIRMED.',
  })
  @ApiResponse({ status: 201, description: 'Booking confirmed and saved to database' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Duffel API error' })
  async bookFlight(@Body() dto: BookFlightDto) {
    return await this.flightService.bookFlight(dto);
  }
}
