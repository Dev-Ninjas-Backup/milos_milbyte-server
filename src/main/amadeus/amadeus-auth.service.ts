import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

type AmadeusTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

/**
 * OAuth 2.0 client-credentials auth for the Amadeus APIs.
 *
 * Tokens are cached in memory and refreshed 60 seconds before they expire
 * (Amadeus tokens live ~30 minutes). Concurrent callers share a single
 * in-flight refresh promise ("single-flight") so a burst of requests never
 * triggers parallel token calls.
 *
 * Credentials come from the environment (AMADEUS_API_KEY / AMADEUS_API_SECRET)
 * and are never logged or included in error messages.
 */
@Injectable()
export class AmadeusAuthService {
  private readonly logger = new Logger(AmadeusAuthService.name);
  private readonly http: AxiosInstance;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  readonly baseURL: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;
  private refreshPromise: Promise<string> | null = null;

  /** Refresh this many ms before the token actually expires. */
  private static readonly REFRESH_SKEW_MS = 60_000;

  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY || '';
    this.apiSecret = process.env.AMADEUS_API_SECRET || '';
    this.baseURL = (
      process.env.AMADEUS_BASE_URL || 'https://test.travel.api.amadeus.com'
    ).replace(/\/+$/, '');

    this.http = axios.create({ baseURL: this.baseURL });
  }

  /**
   * Returns a valid access token, fetching or refreshing it when needed.
   */
  async getAccessToken(): Promise<string> {
    if (
      this.cachedToken &&
      Date.now() < this.tokenExpiresAt - AmadeusAuthService.REFRESH_SKEW_MS
    ) {
      return this.cachedToken;
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.fetchToken().finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  private async fetchToken(): Promise<string> {
    if (!this.apiKey || !this.apiSecret) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Amadeus Configuration Error',
          message:
            'AMADEUS_API_KEY and AMADEUS_API_SECRET must be set to use the Amadeus APIs',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.apiKey,
        client_secret: <redacted>,
      });

      const response = await this.http.post<AmadeusTokenResponse>(
        '/v1/security/oauth2/token',
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      this.cachedToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
      this.logger.log('Amadeus access token refreshed');

      return this.cachedToken;
    } catch (error: any) {
      // Never log the request (it contains the client secret) or headers.
      const status = error?.response?.status;
      this.logger.error(
        `Failed to obtain Amadeus access token${status ? ` (upstream status ${status})` : ''}`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          error: 'Amadeus Auth Error',
          message: 'Failed to authenticate with the Amadeus API',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
