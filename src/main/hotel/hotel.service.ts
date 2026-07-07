import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Duffel } from '@duffel/api';
import {
  StaysSearchResponse,
  StaysSearchResult,
  StaysQuote,
  StaysBooking,
} from '@duffel/api/dist/Stays/StaysTypes';
import { DuffelResponse } from '@duffel/api/types';
import { PrismaService } from '../../config/prisma/prisma.service';
import { SearchHotelsDto } from './dto/search-hotels.dto';
import { GetRatesDto } from './dto/get-rates.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { BookHotelDto } from './dto/book-hotel.dto';

@Injectable()
export class HotelService {
  private readonly logger = new Logger(HotelService.name);
  private readonly duffel: Duffel;

  constructor(private readonly prisma: PrismaService) {
    this.duffel = new Duffel({
      token: process.env.DUFFEL_API_KEY ?? '',
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Private helper: parse & re-throw Duffel SDK errors as clean
  // NestJS HttpExceptions with field-level detail included.
  // ─────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────
  // GET /hotels/search
  // Calls duffel.stays.search to find accommodations near a location.
  // Uses location-based search with geographic coordinates + radius.
  // ─────────────────────────────────────────────────────────────
  async searchHotels(dto: SearchHotelsDto) {
    try {
      this.logger.log(
        `Searching hotels: lat=${dto.lat}, lng=${dto.lng}, checkIn=${dto.checkIn}, checkOut=${dto.checkOut}`,
      );

      const response: DuffelResponse<StaysSearchResponse> = await this.duffel.stays.search({
        check_in_date: dto.checkIn,
        check_out_date: dto.checkOut,
        location: {
          radius: 5,
          geographic_coordinates: {
            latitude: parseFloat(dto.lat),
            longitude: parseFloat(dto.lng),
          },
        },
        rooms: 1,
        guests: [{ type: 'adult' }],
      });

      const results: StaysSearchResult[] = response.data.results;

      return {
        total: results.length,
        accommodations: results.map((result) => ({
          search_result_id: result.id,
          accommodation_id: result.accommodation.id,
          name: result.accommodation.name,
          rating: result.accommodation.rating,
          review_score: result.accommodation.review_score,
          location: result.accommodation.location,
          photos: result.accommodation.photos?.slice(0, 3).map((p) => p.url) ?? [],
          cheapest_rate_total_amount: result.cheapest_rate_total_amount,
          cheapest_rate_currency: result.cheapest_rate_currency,
          expires_at: result.expires_at,
        })),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.handleDuffelError(error, 'Hotel search failed');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // GET /hotels/rates
  // Fetches all rates for a specific search result by its ID.
  // NOTE: The Duffel SDK's fetchAllRates takes only the searchResultId
  // (the id on StaysSearchResult, not the accommodationId separately).
  // accommodationId is retained in the DTO for client convenience and
  // is echoed back in the response.
  // ─────────────────────────────────────────────────────────────
  async getRates(dto: GetRatesDto) {
    try {
      this.logger.log(
        `Fetching rates: searchId=${dto.searchId}, accommodationId=${dto.accommodationId}`,
      );

      const response: DuffelResponse<StaysSearchResult> =
        await this.duffel.stays.searchResults.fetchAllRates(dto.searchId);

      const searchResult: StaysSearchResult = response.data;

      // Flatten all room rates from the accommodation's rooms
      const allRates = searchResult.accommodation.rooms.flatMap((room) =>
        room.rates.map((rate) => ({
          rate_id: rate.id,
          room_name: room.name,
          board_type: rate.board_type,
          description: rate.description ?? null,
          name: rate.name ?? null,
          total_amount: rate.total_amount,
          total_currency: rate.total_currency,
          base_amount: rate.base_amount,
          base_currency: rate.base_currency,
          tax_amount: rate.tax_amount,
          cancellation_timeline: rate.cancellation_timeline,
          payment_type: rate.payment_type,
          available_payment_methods: rate.available_payment_methods,
          expires_at: rate.expires_at,
        })),
      );

      return {
        accommodation_id: dto.accommodationId,
        accommodation_name: searchResult.accommodation.name,
        check_in_date: searchResult.check_in_date,
        check_out_date: searchResult.check_out_date,
        rates: allRates,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.handleDuffelError(error, 'Fetching hotel rates failed');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // POST /hotels/quote
  // Creates a Duffel stays quote from a rate ID (locks in pricing).
  // quotes.create accepts a rateId string directly.
  // ─────────────────────────────────────────────────────────────
  async createQuote(dto: CreateQuoteDto) {
    try {
      this.logger.log(`Creating quote for rateId=${dto.rateId}`);

      const response: DuffelResponse<StaysQuote> =
        await this.duffel.stays.quotes.create(dto.rateId);

      const quote: StaysQuote = response.data;

      return {
        quote_id: quote.id,
        check_in_date: quote.check_in_date,
        check_out_date: quote.check_out_date,
        total_amount: quote.total_amount,
        total_currency: quote.total_currency,
        base_amount: quote.base_amount,
        base_currency: quote.base_currency,
        tax_amount: quote.tax_amount,
        due_at_accommodation_amount: quote.due_at_accommodation_amount,
        accommodation: {
          id: quote.accommodation.id,
          name: quote.accommodation.name,
          rating: quote.accommodation.rating,
          review_score: quote.accommodation.review_score,
          location: quote.accommodation.location,
        },
        rooms: quote.rooms,
        guests: quote.guests,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.handleDuffelError(error, 'Hotel quote creation failed');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // POST /hotels/book
  // Step 1: Confirm the booking with Duffel stays API using quoteId.
  //         email and phone_number are top-level fields on the payload
  //         (not nested inside guests[]).
  // Step 2: Persist the HotelBooking record to the local database.
  // ─────────────────────────────────────────────────────────────
  async bookHotel(dto: BookHotelDto) {
    try {
      const { quoteId, guestDetails } = dto;

      this.logger.log(
        `Booking hotel: quoteId=${quoteId}, guest=${guestDetails.firstName} ${guestDetails.lastName}`,
      );

      // ── Step 1: Create the booking on Duffel ──
      const response: DuffelResponse<StaysBooking> =
        await this.duffel.stays.bookings.create({
          quote_id: quoteId,
          email: guestDetails.email,
          phone_number: guestDetails.phone,
          guests: [
            {
              given_name: guestDetails.firstName,
              family_name: guestDetails.lastName,
            },
          ],
          accommodation_special_requests: '',
        });

      const duffelBooking: StaysBooking = response.data;
      this.logger.log(`Duffel stays booking created: ${duffelBooking.id}`);

      // ── Step 2: Persist to local database ──
      // StaysBooking does not expose a total_amount field directly;
      // we store the guest email as the canonical amount reference.
      const hotelBooking = await this.prisma.hotelBooking.create({
        data: {
          duffelBookingId: duffelBooking.id,
          guestName: `${guestDetails.firstName} ${guestDetails.lastName}`,
          guestEmail: duffelBooking.email,
          totalAmount: duffelBooking.estimated_commission_amount ?? '0',
          currency: duffelBooking.estimated_commission_currency ?? 'USD',
          status: duffelBooking.status.toUpperCase(),
        },
      });

      this.logger.log(`HotelBooking saved to DB with id: ${hotelBooking.id}`);

      return {
        booking_id: hotelBooking.id,
        duffel_booking_id: duffelBooking.id,
        reference: duffelBooking.reference,
        status: duffelBooking.status,
        guest_name: hotelBooking.guestName,
        guest_email: hotelBooking.guestEmail,
        check_in_date: duffelBooking.check_in_date,
        check_out_date: duffelBooking.check_out_date,
        confirmed_at: duffelBooking.confirmed_at,
        accommodation: {
          id: duffelBooking.accommodation.id,
          name: duffelBooking.accommodation.name,
          rating: duffelBooking.accommodation.rating,
          location: duffelBooking.accommodation.location,
        },
        created_at: hotelBooking.createdAt,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.handleDuffelError(error, 'Hotel booking failed');
    }
  }
  private handleDuffelError(error: any, fallbackMessage: string): never {
    // Always log the full raw error so we can see what the SDK actually threw
    this.logger.debug(
      `Raw Duffel error: ${JSON.stringify({ errors: error })}`,
    );

    const duffelErrors: Array<{ message: string; code?: string; type?: string }> =
      error?.errors ?? [];

    if (duffelErrors.length) {
      const status: number = error?.meta?.status ?? HttpStatus.BAD_GATEWAY;

      const details = duffelErrors.map((e) => ({
        message: e.message,
        code: e.code ?? null,
        type: e.type ?? null,
      }));

      const userMessage =
        details.length === 1
          ? details[0].message
          : `${details.length} errors: ${details.map((d) => d.message).join(' | ')}`;

      this.logger.warn(`Duffel error (${status}): ${JSON.stringify(details)}`);

      throw new HttpException(
        {
          statusCode: status,
          error: 'Duffel API Error',
          message: userMessage,
        },
        status,
      );
    }

    // Non-Duffel or network error — error.message may be empty string on DuffelError
    // so fall back to the context-specific message if it is blank.
    const rawMessage: string = error?.message ?? '';
    const message = rawMessage.trim() || fallbackMessage;
    this.logger.error(`${fallbackMessage}: ${message}`, error?.stack);
    throw new InternalServerErrorException(message);
  }

}
