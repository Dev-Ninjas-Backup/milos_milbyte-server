import { Module } from '@nestjs/common';
import { FilesController } from './deploy-files.controller';

@Module({
  controllers: [FilesController],
})
export class DeployFilesModule {}
