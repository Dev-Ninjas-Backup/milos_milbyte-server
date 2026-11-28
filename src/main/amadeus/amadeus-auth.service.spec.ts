import { HttpException } from '@nestjs/common';
import axios from 'axios';
import { AmadeusAuthService } from './amadeus-auth.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AmadeusAuthService', () => {
  const mockPost = jest.fn();

  const buildService = () => {
    (mockedAxios.create as jest.Mock).mockReturnValue({ post: mockPost });
    return new AmadeusAuthService();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AMADEUS_API_KEY = 'test-api-key';
    process.env.AMADEUS_API_SECRET = 'test-api-secret';
    delete process.env.AMADEUS_BASE_URL;
    mockPost.mockResolvedValue({
      data: { access_token: 'token-1', token_type: 'Bearer', expires_in: 1799 },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requests a token with form-encoded client credentials', async () => {
    const service = buildService();

    const token = await service.getAccessToken();

    expect(token).toBe('token-1');
    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, body, config] = mockPost.mock.calls[0];
    expect(url).toBe('/v1/security/oauth2/token');
    expect(body).toContain('grant_type=client_credentials');
    expect(body).toContain('client_id=test-api-key');
    expect(body).toContain('client_secret=<redacted>');
    expect(config.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
  });

  it('caches the token and does not refetch while it is valid', async () => {
    const service = buildService();

    const first = await service.getAccessToken();
    const second = await service.getAccessToken();

    expect(first).toBe('token-1');
    expect(second).toBe('token-1');
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('shares a single in-flight refresh across concurrent callers', async () => {
    let resolvePost!: (value: unknown) => void;
    mockPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
    );
    const service = buildService();

    const pending = Promise.all([
      service.getAccessToken(),
      service.getAccessToken(),
      service.getAccessToken(),
    ]);
    resolvePost({
      data: { access_token: 'token-shared', token_type: 'Bearer', expires_in: 1799 },
    });

    await expect(pending).resolves.toEqual([
      'token-shared',
      'token-shared',
      'token-shared',
    ]);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('refreshes the token once it enters the 60s pre-expiry window', async () => {
    const service = buildService();
    const nowSpy = jest.spyOn(Date, 'now');
    const start = Date.now();
    nowSpy.mockReturnValue(start);

    await service.getAccessToken();
    expect(mockPost).toHaveBeenCalledTimes(1);

    // 1799s lifetime, 60s skew: still cached 1000s later
    nowSpy.mockReturnValue(start + 1000 * 1000);
    await service.getAccessToken();
    expect(mockPost).toHaveBeenCalledTimes(1);

    // Inside the skew window (1760s later) a refresh must happen
    mockPost.mockResolvedValue({
      data: { access_token: 'token-2', token_type: 'Bearer', expires_in: 1799 },
    });
    nowSpy.mockReturnValue(start + 1760 * 1000);
    const refreshed = await service.getAccessToken();
    expect(refreshed).toBe('token-2');
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('fails cleanly (without calling Amadeus) when credentials are missing', async () => {
    delete process.env.AMADEUS_API_KEY;
    delete process.env.AMADEUS_API_SECRET;
    const service = buildService();

    await expect(service.getAccessToken()).rejects.toBeInstanceOf(HttpException);
    expect(mockPost).not.toHaveBeenCalled();
  });
});
