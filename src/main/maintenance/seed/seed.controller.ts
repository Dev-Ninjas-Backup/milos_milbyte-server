import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SeedService } from './seed.service';

@ApiTags('Seed')
@Controller('admin')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @ApiOperation({ summary: 'Run application seed' })
  @Post('seed')
  async runSeed() {
    return await this.seedService.runSeed();
  }
}
