import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      stores: [
        new Keyv({
          store: new KeyvRedis(
            `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
          ),
        }),
      ],
      ttl: 60 * 60 * 24 * 1000,
    }),
  ],
})
export class RedisModule {}
