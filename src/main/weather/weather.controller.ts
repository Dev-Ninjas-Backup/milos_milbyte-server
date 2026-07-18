import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WeatherQueryDto } from './dto/weather-query.dto';
import { WeatherService } from './weather.service';

@ApiTags('Weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) { }

  @ApiOperation({
    summary: 'Get current weather for a coordinate"s',
    description:
      'Pass `lat` and `lon`. ' +
      'Returns temperature (°C), condition, wind speed (km/h), humidity (%), cloudiness (%) — exactly what the weather card needs.',
  })
  @Get('current')
  async getCurrentWeather(@Query() query: WeatherQueryDto) {
    return await this.weatherService.getCurrentWeather(query);
  }



}
