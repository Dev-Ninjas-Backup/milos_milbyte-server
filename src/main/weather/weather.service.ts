import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WeatherQueryDto } from './dto/weather-query.dto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import * as countries from 'i18n-iso-countries';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly owmBaseUrl = 'https://api.openweathermap.org/data/2.5';
  private readonly wttrBaseUrl = 'https://wttr.in';

  constructor(private readonly http: HttpService) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    countries.registerLocale(require('i18n-iso-countries/langs/en.json'));
  }

  private getCountryName(code: string): string {
    return countries.getName(code?.toUpperCase(), 'en') ?? code ?? '';
  }

  // ─── WeatherCode → human-readable condition map (wttr.in codes) ──────────────
  private readonly weatherCodeMap: Record<string, string> = {
    '113': 'Sunny',
    '116': 'Partly Cloudy',
    '119': 'Cloudy',
    '122': 'Overcast',
    '143': 'Mist',
    '176': 'Patchy Rain',
    '179': 'Patchy Snow',
    '182': 'Patchy Sleet',
    '200': 'Thundery Outbreaks',
    '227': 'Blowing Snow',
    '230': 'Blizzard',
    '248': 'Fog',
    '260': 'Freezing Fog',
    '281': 'Freezing Drizzle',
    '284': 'Heavy Freezing Drizzle',
    '293': 'Light Rain',
    '296': 'Light Rain',
    '299': 'Moderate Rain',
    '302': 'Heavy Rain',
    '305': 'Heavy Rain',
    '308': 'Very Heavy Rain',
    '311': 'Light Sleet',
    '314': 'Moderate Sleet',
    '317': 'Light Sleet',
    '320': 'Moderate Snow',
    '323': 'Patchy Light Snow',
    '326': 'Light Snow',
    '329': 'Patchy Moderate Snow',
    '332': 'Moderate Snow',
    '335': 'Patchy Heavy Snow',
    '338': 'Heavy Snow',
    '350': 'Ice Pellets',
    '353': 'Light Drizzle',
    '356': 'Heavy Rain',
    '359': 'Torrential Rain',
    '362': 'Light Sleet Showers',
    '365': 'Moderate Sleet Showers',
    '368': 'Light Snow Showers',
    '371': 'Moderate Snow Showers',
    '374': 'Light Sleet Showers',
    '377': 'Moderate Sleet Showers',
    '386': 'Patchy Rain with Thunder',
    '389': 'Heavy Rain with Thunder',
    '392': 'Patchy Light Snow with Thunder',
    '395': 'Moderate Heavy Snow with Thunder',
  };

  private codeToCondition(code: string): string {
    return this.weatherCodeMap[code] ?? 'Unknown';
  }

  // ─── Icon URL (wttr.in code → OpenWeatherMap-compatible icon name) ───────────
  private codeToIconUrl(code: string): string {
    // Map general condition to OWM-style icon
    const n = Number(code);
    if (n === 113) return 'https://openweathermap.org/img/wn/01d@2x.png';
    if (n === 116) return 'https://openweathermap.org/img/wn/02d@2x.png';
    if (n <= 122) return 'https://openweathermap.org/img/wn/03d@2x.png';
    if (n <= 143) return 'https://openweathermap.org/img/wn/50d@2x.png';
    if (n <= 200) return 'https://openweathermap.org/img/wn/10d@2x.png';
    if (n <= 260) return 'https://openweathermap.org/img/wn/50d@2x.png';
    if (n <= 314) return 'https://openweathermap.org/img/wn/09d@2x.png';
    if (n <= 338) return 'https://openweathermap.org/img/wn/13d@2x.png';
    if (n <= 389) return 'https://openweathermap.org/img/wn/11d@2x.png';
    return 'https://openweathermap.org/img/wn/10d@2x.png';
  }

  /**
   * Try OpenWeatherMap first, fallback to wttr.in if OWM key is invalid/missing.
   */
  async getCurrentWeather(query: WeatherQueryDto) {
    this.logger.log(`[Weather] getCurrentWeather called → lat=${query.lat}, lon=${query.lon}`);

    if (!query.lat || !query.lon) {
      this.logger.warn('[Weather] Missing lat or lon in request');
      throw new BadRequestException(
        'Provide both "lat" and "lon"',
      );
    }

    // ── Validate coordinate ranges ──────────────────────────────────────────────
    const lat = Number(query.lat);
    const lon = Number(query.lon);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      this.logger.warn(`[Weather] Invalid latitude: ${query.lat}`);
      throw new BadRequestException(
        `Invalid latitude "${query.lat}". Latitude must be a number between -90 and 90.`,
      );
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      this.logger.warn(`[Weather] Invalid longitude: ${query.lon}`);
      throw new BadRequestException(
        `Invalid longitude "${query.lon}". Longitude must be a number between -180 and 180.`,
      );
    }

    this.logger.debug(`[Weather] Coordinate range valid → lat=${lat}, lon=${lon}`);

    // ── Validate that coordinates map to a real location (not ocean/invalid) ────
    this.logger.debug('[Weather] Starting Nominatim reverse geocoding validation...');
    await this.validateCoordinates(lat, lon);

    const owmKey = process.env.OPENWEATHER_API_KEY;

    // ── Try OpenWeatherMap ──────────────────────────────────────────────────────
    if (owmKey && owmKey !== 'your_openweathermap_api_key_here') {
      this.logger.debug('[Weather] OWM API key found → attempting OpenWeatherMap');
      try {
        const result = await this.getCurrentWeatherFromOWM(query, owmKey);
        this.logger.log(`[Weather] Weather fetched successfully via OpenWeatherMap for lat=${lat}, lon=${lon}`);
        return result;
      } catch (err) {
        // Key not yet activated or network error → fall through to wttr.in
        if (err?.response?.status === 401) {
          this.logger.warn(
            '[Weather] OWM key returned 401 (not yet active). Falling back to wttr.in',
          );
        } else {
          this.logger.warn(`[Weather] OWM request failed (status=${err?.response?.status ?? 'N/A'}). Falling back to wttr.in`);
        }
      }
    } else {
      this.logger.debug('[Weather] No valid OWM key configured → using wttr.in directly');
    }

    // ── Fallback: wttr.in (no key required) ────────────────────────────────────
    this.logger.debug('[Weather] Fetching weather from wttr.in fallback...');
    return await this.getCurrentWeatherFromWttr(query);
  }


  /**
   * Calls Nominatim reverse geocoding to verify the coordinates point to a real
   * named location. Throws BadRequestException if the location is ocean/water or
   * if Nominatim cannot resolve it to any known place.
   */
  private async validateCoordinates(lat: number, lon: number): Promise<void> {
    this.logger.debug(`[Weather] Nominatim → reverse geocoding lat=${lat}, lon=${lon}`);

    try {
      const response = await firstValueFrom(
        this.http.get('https://nominatim.openstreetmap.org/reverse', {
          params: {
            format: 'json',
            lat: String(lat),
            lon: String(lon),
          },
          headers: {
            // Nominatim requires a User-Agent header
            'User-Agent': 'MilosMilbyteWeatherApp/1.0',
          },
        }),
      );

      const data = response.data;
      this.logger.debug(`[Weather] Nominatim response type="${data?.type}" class="${data?.class}" addresstype="${data?.addresstype}"`);

      // Nominatim returns { error: '...' } when nothing is found
      if (data?.error) {
        this.logger.warn(`[Weather] Nominatim returned error for lat=${lat}, lon=${lon}: ${data.error}`);
        throw new BadRequestException(
          `This location is not known to our Map`,
        );
      }

      // Reject pure water bodies (ocean, sea, bay, strait, etc.)
      const waterTypes = ['ocean', 'sea', 'bay', 'strait', 'gulf', 'lake', 'river', 'water', 'reservoir'];
      const locationType: string = (data?.type ?? data?.addresstype ?? '').toLowerCase();
      const locationClass: string = (data?.class ?? '').toLowerCase();

      if (waterTypes.some(w => locationType.includes(w)) || locationClass === 'waterway') {
        this.logger.warn(`[Weather] Coordinates (${lat}, ${lon}) resolved to water body → type=${locationType}, class=${locationClass}`);
        throw new BadRequestException(
          `This location is not known to our Map`,
        );
      }

      this.logger.debug(`[Weather] Nominatim validation passed for lat=${lat}, lon=${lon}`);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`[Weather] Nominatim request failed (skipping validation): ${err?.message}`);
    }
  }

  private async getCurrentWeatherFromOWM(query: WeatherQueryDto, apiKey: string) {
    this.logger.debug(`[Weather] OWM → fetching weather for lat=${query.lat}, lon=${query.lon}`);

    const params: Record<string, string> = { appid: apiKey, units: 'metric' };
    params.lat = query.lat!;
    params.lon = query.lon!;

    const response = await firstValueFrom(
      this.http.get(`${this.owmBaseUrl}/weather`, { params }),
    );
    const d = response.data;

    this.logger.log(`[Weather] OWM → data received: city=${d.name}, country=${d.sys.country}, temp=${d.main.temp}°C`);

    return {
      message: 'Weather fetched successfully',
      source: 'openweathermap',
      weather: {
        city: d.name,
        country: this.getCountryName(d.sys.country),
        date: new Date().toISOString(),
        temperature: Math.round(d.main.temp),
        feelsLike: Math.round(d.main.feels_like),
        tempMin: Math.round(d.main.temp_min),
        tempMax: Math.round(d.main.temp_max),
        condition: d.weather[0].main,
        description: d.weather[0].description,
        icon: `https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png`,
        windSpeed: Math.round(d.wind.speed * 3.6),
        windDirection: d.wind.deg,
        humidity: d.main.humidity,
        cloudiness: d.clouds.all,
        visibility: d.visibility ? Math.round(d.visibility / 1000) : null,
        pressure: d.main.pressure,
        coordinates: { lat: d.coord.lat, lon: d.coord.lon },
      },
    };
  }

  private async getCurrentWeatherFromWttr(query: WeatherQueryDto) {
    const location = `${query.lat},${query.lon}`;
    this.logger.debug(`[Weather] wttr.in → fetching weather for location="${location}"`);

    try {
      const response = await firstValueFrom(
        this.http.get(`${this.wttrBaseUrl}/${location}?format=j1`),
      );
      const d = response.data;
      const cur = d.current_condition[0];
      const area = d.nearest_area?.[0];
      const code = cur.weatherCode;

      const city = area?.region?.[0]?.value ?? area?.areaName?.[0]?.value ?? 'Unknown';
      const country = area?.country?.[0]?.value ?? '';
      this.logger.log(`[Weather] wttr.in → data received: city=${city}, country=${country}, temp=${cur.temp_C}°C, condition code=${code}`);

      return {
        message: 'Weather fetched successfully',
        source: 'wttr.in',
        weather: {
          // When lat/lon is used, areaName is a neighbourhood → use region (actual city).
          // When a city name is used, areaName is the searched city → prefer it.
          city,
          country,
          date: new Date().toISOString(),
          temperature: Number(cur.temp_C),
          feelsLike: Number(cur.FeelsLikeC),
          tempMin: Number(d.weather?.[0]?.mintempC ?? cur.temp_C),
          tempMax: Number(d.weather?.[0]?.maxtempC ?? cur.temp_C),
          condition: this.codeToCondition(code),
          description: cur.weatherDesc?.[0]?.value ?? '',
          icon: this.codeToIconUrl(code),
          windSpeed: Number(cur.windspeedKmph),
          windDirection: Number(cur.winddirDegree),
          humidity: Number(cur.humidity),
          cloudiness: Number(cur.cloudcover),
          visibility: Number(cur.visibility),
          pressure: Number(cur.pressure),
          coordinates: {
            lat: Number(area?.latitude ?? query.lat ?? 0),
            lon: Number(area?.longitude ?? query.lon ?? 0),
          },
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error?.response?.status === 404) {
        this.logger.warn(`[Weather] wttr.in → 404 for location="${location}"`);
        throw new BadRequestException('Location not found');
      }
      this.logger.error(`[Weather] wttr.in → request failed for location="${location}": ${error?.message}`);
      throw new InternalServerErrorException(
        'Failed to fetch weather data',
      );
    }
  }

}
