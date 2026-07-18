import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WeatherQueryDto } from './dto/weather-query.dto';
import * as countries from 'i18n-iso-countries';


@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly owmBaseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(private readonly http: HttpService) {
    countries.registerLocale(require('i18n-iso-countries/langs/en.json'));
  }

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

    const owmKey = process.env.OPENWEATHER_API_KEY;

    if (!owmKey) {
      this.logger.error('[Weather] OpenWeatherMap API key is not configured');
      throw new NotFoundException(
        'Weather service is temporarily unavailable due to configuration error',
      );
    }

    try {
      return await this.getCurrentWeatherFromOWM(query, owmKey);
    } catch (err) {
      console.log(err)
      this.logger.error(`[Weather] OWM request failed: ${err?.message}`);
      throw new NotFoundException(err);
    }
  }

  private getCountryName(code: string): string {
    return countries.getName(code?.toUpperCase(), 'en') ?? code ?? '';
  }

  private async getCurrentWeatherFromOWM(query: WeatherQueryDto, apiKey: string) {
    this.logger.debug(`[Weather] OWM → fetching weather for lat=${query.lat}, lon=${query.lon}`);

    const params: Record<string, string> = { appid: apiKey, units: 'metric' };
    params.lat = query.lat!;
    params.lon = query.lon!;

    // Fetch weather data
    const response = await firstValueFrom(
      this.http.get(`${this.owmBaseUrl}/weather`, { params }),
    );
    const d = response.data;
    // Resolve accurate city name using OWM reverse geocoding API to avoid hyper-local neighborhood names
    let city = d.name;
    try {
      this.logger.debug(`[Weather] OWM Geocoding → resolving name for lat=${query.lat}, lon=${query.lon}`);
      const geoResponse = await firstValueFrom(
        this.http.get('https://api.openweathermap.org/geo/1.0/reverse', {
          params: {
            lat: query.lat!,
            lon: query.lon!,
            limit: '1',
            appid: apiKey,
          },
        }),
      );
      if (geoResponse.data && geoResponse.data[0]?.name) {
        city = geoResponse.data[0].name;
        this.logger.debug(`[Weather] OWM Geocoding resolved name: ${city} (original was ${d.name})`);
      }
    } catch (geoErr) {
      this.logger.warn(`[Weather] OWM Geocoding failed, falling back to weather name: ${geoErr?.message}`);
    }

    this.logger.log(`[Weather] OWM → data received: city=${city}, country=${d.sys.country}, temp=${d.main.temp}°C`);

    return {
      message: 'Weather fetched successfully',
      source: 'openweathermap',
      weather: {
        city,
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
}
