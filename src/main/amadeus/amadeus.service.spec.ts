import { BadRequestException, HttpException } from '@nestjs/common';
import axios from 'axios';
import { AmadeusService } from './amadeus.service';
import { AmadeusAuthService } from './amadeus-auth.service';
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AmadeusService', () => {
  const mockHttp = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  const authStub = {
    baseURL: 'https://test.travel.api.amadeus.com',
    getAccessToken: jest.fn().mockResolvedValue('test-access-token'),
  };

  const buildService = () => {
    (mockedAxios.create as jest.Mock).mockReturnValue(mockHttp);
    return new AmadeusService(authStub as unknown as AmadeusAuthService);
  };

  const bookingDto = (): CreateHotelBookingDto =>
    ({
      guests: [
        {
          title: 'MR',
          firstName: 'Adam',
          lastName: 'Rock',
          phone: '4854845247',
          email: 'adam.rock@example.com',
        },
        { firstName: 'Eve', lastName: 'Rock' },
      ],
      roomAssociations: [
        {
          hotelOfferId: 'SXI2HHVSLU',
          guestReferences: [{ guestReference: '1' }, { guestReference: '2' }],
        },
      ],
      payment: {
        method: 'CREDIT_CARD',
        paymentCardInfo: {
          vendorCode: 'AX',
          cardNumber: '345678000000007',
          securityCode: '4111',
          expiryDate: '0139',
          holderName: 'Adam Rock',
        },
      },
      travelAgent: { email: 'agent@example.com' },
    }) as CreateHotelBookingDto;

  beforeEach(() => {
    jest.clearAllMocks();
    authStub.getAccessToken.mockResolvedValue('test-access-token');
    mockHttp.get.mockResolvedValue({ data: { data: [] } });
    mockHttp.post.mockResolvedValue({ data: { data: { id: 'ORDER1' } } });
    mockHttp.patch.mockResolvedValue({ data: { data: {} } });
    mockHttp.delete.mockResolvedValue({ data: { data: {} } });
  });

  describe('search query building', () => {
    it('joins hotelIds/childAges with commas and maps pageOffset to page[offset]', async () => {
      const service = buildService();

      await service.searchOffers({
        hotelIds: ['ADNYC052', 'RDLON308'],
        adults: 2,
        checkInDate: '2026-09-10',
        checkOutDate: '2026-09-15',
        childAges: [5, 10],
        roomQuantity: 1,
        bestRateOnly: true,
        pageOffset: 20,
      });

      expect(mockHttp.get).toHaveBeenCalledTimes(1);
      const [url, config] = mockHttp.get.mock.calls[0];
      expect(url).toBe('/v3/shopping/hotel-offers');
      expect(config.params).toEqual({
        hotelIds: 'ADNYC052,RDLON308',
        adults: 2,
        checkInDate: '2026-09-10',
        checkOutDate: '2026-09-15',
        childAges: '5,10',
        roomQuantity: 1,
        bestRateOnly: true,
        'page[offset]': 20,
      });
      expect(config.headers.Authorization).toBe('Bearer test-access-token');
    });

    it('omits undefined parameters instead of sending them empty', async () => {
      const service = buildService();

      await service.searchOffers({ hotelIds: ['ADNYC052'] });

      const [, config] = mockHttp.get.mock.calls[0];
      expect(config.params).toEqual({ hotelIds: 'ADNYC052' });
    });

    it('joins chain codes when listing hotels by city', async () => {
      const service = buildService();

      await service.listHotelsByCity({
        cityCode: 'LON',
        chainCodes: ['RT', 'WW'],
        ratings: ['4', '5'],
      } as any);

      const [url, config] = mockHttp.get.mock.calls[0];
      expect(url).toBe('/v1/reference-data/locations/hotels/by-city');
      expect(config.params).toEqual({
        cityCode: 'LON',
        chainCodes: 'RT,WW',
        ratings: '4,5',
      });
    });
  });

  describe('booking payload building', () => {
    it('wraps the order in data{type:hotel-order} and assigns guest tids', () => {
      const service = buildService();

      const payload = service.buildBookingPayload(bookingDto());

      expect(payload.data.type).toBe('hotel-order');
      expect(payload.data.guests).toEqual([
        {
          tid: 1,
          title: 'MR',
          firstName: 'Adam',
          lastName: 'Rock',
          phone: '4854845247',
          email: 'adam.rock@example.com',
        },
        { tid: 2, firstName: 'Eve', lastName: 'Rock' },
      ]);
      expect(payload.data.travelAgent).toEqual({
        contact: { email: 'agent@example.com' },
      });
      expect(payload.data.roomAssociations).toEqual([
        {
          guestReferences: [{ guestReference: '1' }, { guestReference: '2' }],
          hotelOfferId: 'SXI2HHVSLU',
        },
      ]);
      expect(payload.data.payment).toEqual({
        method: 'CREDIT_CARD',
        paymentCard: {
          paymentCardInfo: {
            vendorCode: 'AX',
            cardNumber: '345678000000007',
            securityCode: '4111',
            expiryDate: '0139',
            holderName: 'Adam Rock',
          },
        },
      });
    });

    it('sends the ama-Client-Ref header from the DTO when provided', async () => {
      const service = buildService();
      const dto = { ...bookingDto(), clientRef: 'SOLARA-2026-000123' };

      await service.createBooking(dto);

      const [url, , config] = mockHttp.post.mock.calls[0];
      expect(url).toBe('/v2/booking/hotel-orders');
      expect(config.headers['ama-Client-Ref']).toBe('SOLARA-2026-000123');
      expect(config.headers.Authorization).toBe('Bearer test-access-token');
    });

    it('generates a SOLARA- ama-Client-Ref when none is provided', async () => {
      const service = buildService();

      await service.createBooking(bookingDto());

      const [, , config] = mockHttp.post.mock.calls[0];
      expect(config.headers['ama-Client-Ref']).toMatch(/^SOLARA-/);
    });
  });

  describe('booking manage', () => {
    it('PATCHes only the whitelisted roomAssociation fields', async () => {
      const service = buildService();

      await service.updateBooking('ORDER1', 'BOOKING1', {
        specialRequest: 'I will arrive at midnight',
        guestReferences: [
          { guestReference: '1', hotelLoyaltyId: '3081031320523260' },
        ],
      });

      const [url, body] = mockHttp.patch.mock.calls[0];
      expect(url).toBe(
        '/v2/booking/hotel-orders/ORDER1/hotel-bookings/BOOKING1',
      );
      expect(body).toEqual({
        data: {
          hotelBooking: {
            roomAssociation: {
              specialRequest: 'I will arrive at midnight',
              guestReferences: [
                { guestReference: '1', hotelLoyaltyId: '3081031320523260' },
              ],
            },
          },
        },
      });
    });

    it('rejects an empty update without calling Amadeus', async () => {
      const service = buildService();

      await expect(
        service.updateBooking('ORDER1', 'BOOKING1', {}),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockHttp.patch).not.toHaveBeenCalled();
    });

    it('cancels via POST .../cancel', async () => {
      const service = buildService();

      await service.cancelBooking('ORDER1', 'BOOKING1');

      const [url] = mockHttp.post.mock.calls[0];
      expect(url).toBe(
        '/v2/booking/hotel-orders/ORDER1/hotel-bookings/BOOKING1/cancel',
      );
    });
  });

  describe('error handling', () => {
    it('maps Amadeus errors to an HttpException with the upstream status', async () => {
      mockHttp.get.mockRejectedValue({
        response: {
          status: 400,
          data: {
            errors: [
              {
                status: 400,
                code: 38189,
                title: 'INVALID FORMAT',
                detail: 'hotelIds is a mandatory parameter',
              },
            ],
          },
        },
      });
      const service = buildService();

      const error = await service
        .searchOffers({ hotelIds: ['ADNYC052'] })
        .catch((e) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(400);
      expect(error.getResponse()).toMatchObject({
        error: 'Amadeus API Error',
        message: 'hotelIds is a mandatory parameter',
      });
    });

    it('maps network failures to 502', async () => {
      mockHttp.get.mockRejectedValue(new Error('socket hang up'));
      const service = buildService();

      const error = await service
        .listHotelsByIds({ hotelIds: ['ADNYC052'] })
        .catch((e) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(502);
    });
  });
});
