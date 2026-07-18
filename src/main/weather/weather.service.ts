import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WeatherQueryDto } from './dto/weather-query.dto';
import * as countries from 'i18n-iso-countries';
import * as enLocale from 'i18n-iso-countries/langs/en.json';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly owmBaseUrl = 'https://api.openweathermap.org/data/2.5';
  private readonly wttrBaseUrl = 'https://wttr.in';

  constructor(private readonly http: HttpService) {
    countries.registerLocale(enLocale);
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
    if (!query.lat || !query.lon) {
      throw new BadRequestException(
        'Provide both "lat" and "lon"',
      );
    }

    const owmKey = process.env.OPENWEATHER_API_KEY;

    // ── Try OpenWeatherMap ──────────────────────────────────────────────────────
    if (owmKey && owmKey !== 'your_openweathermap_api_key_here') {
      try {
        return await this.getCurrentWeatherFromOWM(query, owmKey);
      } catch (err) {
        // Key not yet activated or network error → fall through to wttr.in
        if (err?.response?.status === 401) {
          this.logger.warn(
            'OWM key returned 401 (not yet active). Falling back to wttr.in',
          );
        } else {
          this.logger.warn('OWM failed, falling back to wttr.in');
        }
      }
    }

    // ── Fallback: wttr.in (no key required) ────────────────────────────────────
    return await this.getCurrentWeatherFromWttr(query);
  }


  private async getCurrentWeatherFromOWM(query: WeatherQueryDto, apiKey: string) {
    const params: Record<string, string> = { appid: apiKey, units: 'metric' };
    params.lat = query.lat!;
    params.lon = query.lon!;

    const response = await firstValueFrom(
      this.http.get(`${this.owmBaseUrl}/weather`, { params }),
    );
    const d = response.data;
    console.log(d)
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


    try {
      const response = await firstValueFrom(
        this.http.get(`${this.wttrBaseUrl}/${location}?format=j1`),
      );
      const d = response.data;
      const cur = d.current_condition[0];
      const area = d.nearest_area?.[0];
      const code = cur.weatherCode;

      return {
        message: 'Weather fetched successfully',
        source: 'wttr.in',
        weather: {
          // When lat/lon is used, areaName is a neighbourhood → use region (actual city).
          // When a city name is used, areaName is the searched city → prefer it.
          city: area?.region?.[0]?.value ?? area?.areaName?.[0]?.value ?? 'Unknown',
          country: area?.country?.[0]?.value ?? '',
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
      if (error?.response?.status === 404) {
        throw new BadRequestException('City not found');
      }
      throw new InternalServerErrorException(
        'Failed to fetch weather data',
      );
    }
  }

}
