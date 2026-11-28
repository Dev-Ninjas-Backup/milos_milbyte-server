import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { AmadeusAuthService } from './amadeus-auth.service';
import {
  ListHotelsByCityDto,
  ListHotelsByGeocodeDto,
  ListHotelsByIdsDto,
  GetHotelContentDto,
} from './dto/hotel-list.dto';
import { SearchHotelOffersDto } from './dto/search-hotel-offers.dto';
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';
import { UpdateHotelBookingDto } from './dto/manage-hotel-booking.dto';

/**
 * Amadeus Hotels Quick-Connect integration (stateless pass-through).
 *
 * Wraps the seven Quick-Connect functions:
 *   Hotel List (v1), Hotel Content Details (v3), Hotel Search (v3),
 *   Hotel Booking (v2), Hotel Booking Retrieve (v2),
 *   Hotel Booking Retrieve by Reference (v2), Hotel Booking Manage (v2).
 *
 * Nothing is persisted locally: responses (including the Amadeus
 * hotelOrderId and associated record locator) are returned to the caller.
 * When hotel bookings need to be stored, the natural hook is the booking
 * creation flow: persist `data.id` (hotelOrderId) and
 * `data.associatedRecords[].reference` from createBooking()'s response
 * against the local trip/booking record.
 */
@Injectable()
export class AmadeusService {
  private readonly logger = new Logger(AmadeusService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly authService: AmadeusAuthService) {
    this.http = axios.create({ baseURL: this.authService.baseURL });
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private async authHeaders(
    extra: Record<string, string> = {},
  ): Promise<Record<string, string>> {
    const token = await this.authService.getAccessToken();
    return { Authorization: `Bearer ${token}`, ...extra };
  }

  /**
   * Builds an Amadeus query-params object: drops undefined/null values and
   * joins arrays with commas, as the Amadeus APIs expect.
   */
  private buildParams(
    source: Record<string, unknown>,
  ): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined || value === null) continue;
      params[key] = Array.isArray(value) ? value.join(',') : (value as string | number);
    }
    return params;
  }

  /**
   * Parse & re-throw Amadeus API errors as clean HttpExceptions.
   * Only the documented error fields (status/code/title/detail) are kept —
   * request headers, credentials and tokens are never logged or returned.
   */
  private handleAmadeusError(error: any, fallbackMessage: string): never {
    const amadeusErrors: Array<{
      status?: number;
      code?: number | string;
      title?: string;
      detail?: string;
    }> = error?.response?.data?.errors;

    if (amadeusErrors?.length) {
      const status =
        error.response.status ?? amadeusErrors[0].status ?? HttpStatus.BAD_GATEWAY;

      const details = amadeusErrors.map((e) => ({
        code: e.code ?? null,
        title: e.title ?? null,
        detail: e.detail ?? null,
      }));

      const userMessage =
        details.length === 1
          ? (details[0].detail ?? details[0].title ?? fallbackMessage)
          : `${details.length} Amadeus errors: ${details
              .map((d) => d.detail ?? d.title)
              .filter(Boolean)
              .join(' | ')}`;

      this.logger.warn(`Amadeus error (${status}): ${JSON.stringify(details)}`);

      throw new HttpException(
        {
          statusCode: status,
          error: 'Amadeus API Error',
          message: userMessage,
          details,
        },
        status,
      );
    }

    const message = error?.message ?? fallbackMessage;
    this.logger.error(`${fallbackMessage}: ${message}`);
    throw new HttpException(
      { statusCode: HttpStatus.BAD_GATEWAY, error: 'Upstream Error', message },
      HttpStatus.BAD_GATEWAY,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Hotel List (v1)
  // ─────────────────────────────────────────────────────────────

  async listHotelsByCity(dto: ListHotelsByCityDto) {
    try {
      const response = await this.http.get(
        '/v1/reference-data/locations/hotels/by-city',
        {
          params: this.buildParams({ ...dto }),
          headers: await this.authHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      this.handleAmadeusError(error, 'Failed to list hotels by city');
    }
  }

  async listHotelsByGeocode(dto: ListHotelsByGeocodeDto) {
    try {
      const response = await this.http.get(
        '/v1/reference-data/locations/hotels/by-geocode',
        {
          params: this.buildParams({ ...dto }),
          headers: await this.authHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      this.handleAmadeusError(error, 'Failed to list hotels by geocode');
    }
  }

  async listHotelsByIds(dto: ListHotelsByIdsDto) {
    try {
      const response = await this.http.get(
        '/v1/reference-data/locations/hotels/by-hotels',
        {
          params: this.buildParams({ hotelIds: dto.hotelIds }),
          headers: await this.authHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      this.handleAmadeusError(error, 'Failed to list hotels by IDs');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Hotel Content Details (v3)
  // ─────────────────────────────────────────────────────────────

  async getHotelContent(dto: GetHotelContentDto) {
    try {
      const response = await this.http.get(
        '/v3/reference-data/locations/by-hotel',
        {
          params: this.buildParams({ ...dto }),
          headers: await this.authHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      this.handleAmadeusError(error, 'Failed to get hotel content details');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Hotel Search (v3) — search & pricing step
  // ─────────────────────────────────────────────────────────────

  async searchOffers(dto: SearchHotelOffersDto) {
    try {
      const { pageOffset, ...rest } = dto;
      const params = this.buildParams({ ...rest });
      if (pageOffset !== undefined) {
        params['page[offset]'] = pageOffset;
      }

      const response = await this.http.get('/v3/shopping/hotel-offers', {
        params,
        headers: await this.authHeaders(),
      });
      return response.data;
    } catch (error) {
      this.handleAmadeusError(error, 'Failed to search hotel offers');
    }
  }

  async getOffer(offerId: string, lang?: string) {
    try {
      const response = await this.http.get(
        `/v3/shopping/hotel-offers/${encodeURIComponent(offerId)}`,
        {
          params: this.buildParams({ lang }),
          headers: await this.authHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      this.handleAmadeusError(error, 'Failed to get hotel offer');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Hotel Booking (v2)
  // ─────────────────────────────────────────────────────────────

  /**
   * Builds the Amadeus hotel-order payload from the DTO.
   * Exposed (not private) so it can be unit-tested directly.
   */
  buildBookingPayload(dto: CreateHotelBookingDto) {
    return {
      data: {
        type: 'hotel-order',
        guests: dto.guests.map((guest, index) => ({
          tid: guest.tid ?? index + 1,
          ...(guest.title ? { title: guest.title } : {}),
          firstName: guest.firstName,
          lastName: guest.lastName,
          ...(guest.phone ? { phone: guest.phone } : {}),
          ...(guest.email ? { email: guest.email } : {}),
        })),
        ...(dto.travelAgent
          ? { travelAgent: { contact: { email: dto.travelAgent.email } } }
          : {}),
        roomAssociations: dto.roomAssociations.map((room) => ({
          guestReferences: room.guestReferences.map((ref) => ({
            guestReference: ref.guestReference,
            ...(ref.hotelLoyaltyId
              ? { hotelLoyaltyId: ref.hotelLoyaltyId }
              : {}),
          })),
          hotelOfferId: room.hotelOfferId,
        })),
        payment: {
          method: dto.payment.method,
          paymentCard: {
            paymentCardInfo: dto.payment.paymentCardInfo,
          },
        },
      },
    };
  }

  async createBooking(dto: CreateHotelBookingDto) {
    // The Quick-Connect checklist requires an ama-Client-Ref on every
    // booking so orders can be traced back to Solara.
    const clientRef = dto.clientRef ?? this.generateClientRef();

    try {
      const response = await this.http.post(
        '/v2/booking/hotel-orders',
        this.buildBookingPayload(dto),
        {
          headers: await this.authHeaders({
            'ama-Client-Ref': clientRef,
          }),
        },
      );
      return response.data;
    } catch (error) {
      this.handleAmadeusError(error, 'Failed to create hotel booking');
    }
  }

  private generateClientRef(): string {
    return `SOLARA-${Date.now().toString(36).toUpperCase()}`;
  }

  // ─────────────────────────────────────────────────────────────
  // Hotel Booking Retrieve (v2)
  // ─────────────────────────────────────────────────────────────

  async getBookingById(hotelOrderId: string) {
    try {
      const response = await this.http.get(
        `/v2/booking/hotel-orders/${encodeURIComponent(hotelOrderId)}`,
        { headers: await this.authHeaders() },
      );
      return response.data;
    } catch (error) {
      this.handleAmadeusError(error, 'Failed to retrieve hotel booking');
    }
  }

  async getBookingByReference(reference: string, originSystemCode = 'GDS') {
    try {
      const response = await this.http.get(
        '/v2/booking/hotel-orders/by-reference',
        {
          params: this.buildParams({ originSystemCode, reference }),
          headers: await this.authHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      this.handleAmadeusError(
        error,
        'Failed to retrieve hotel booking by reference',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Hotel Booking Manage (v2)
  //
  // NOTE — Amadeus rule: a booking cannot be modified within 24 hours
  // before check-in. Amadeus rejects late modifications; the rejection
  // is surfaced to the caller via handleAmadeusError.
  // ─────────────────────────────────────────────────────────────

  async updateBooking(
    hotelOrderId: string,
    hotelBookingId: string,
    dto: UpdateHotelBookingDto,
  ) {
    const roomAssociation: Record<string, unknown> = {};
    if (dto.specialRequest !== undefined) {
      roomAssociation.specialRequest = dto.specialRequest;
    }
    if (dto.guestReferences !== undefined) {
      roomAssociation.guestReferences = dto.guestReferences.map((ref) => ({
        guestReference: ref.guestReference,
        ...(ref.hotelLoyaltyId ? { hotelLoyaltyId: ref.hotelLoyaltyId } : {}),
      }));
    }

    if (Object.keys(roomAssociation).length === 0) {
      throw new BadRequestException(
        'Provide specialRequest and/or guestReferences to update the booking',
      );
    }

    try {
      const response = await this.http.patch(
        `/v2/booking/hotel-orders/${encodeURIComponent(hotelOrderId)}/hotel-bookings/${encodeURIComponent(hotelBookingId)}`,
        { data: { hotelBooking: { roomAssociation } } },
        { headers: await this.authHeaders() },
      );
      return response.data;
    } catch (error) {
      this.handleAmadeusError(error, 'Failed to update hotel booking');
    }
  }

  async cancelBooking(hotelOrderId: string, hotelBookingId: string) {
    try {
      const response = await this.http.post(
        `/v2/booking/hotel-orders/${encodeURIComponent(hotelOrderId)}/hotel-bookings/${encodeURIComponent(hotelBookingId)}/cancel`,
        {},
        { headers: await this.authHeaders() },
      );
      return response.data;
    } catch (error) {
      this.handleAmadeusError(error, 'Failed to cancel hotel booking');
    }
  }

  async deleteBooking(hotelOrderId: string, hotelBookingId: string) {
    try {
      const response = await this.http.delete(
        `/v2/booking/hotel-orders/${encodeURIComponent(hotelOrderId)}/hotel-bookings/${encodeURIComponent(hotelBookingId)}`,
        { headers: await this.authHeaders() },
      );
      return response.data;
    } catch (error) {
      this.handleAmadeusError(error, 'Failed to delete hotel booking');
    }
  }
}
