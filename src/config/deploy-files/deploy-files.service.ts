import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DeployFilesService {
  getDeployLink(
    folder: 'images' | 'documents' | 'profile-pictures',
    filename: string,
  ) {
    return {
      filename,
      deployLink: this.buildDeployLink(folder, filename),
    };
  }

  buildDeployLink(
    folder: 'images' | 'documents' | 'profile-pictures',
    filename: string,
  ) {
    const appUrl =
      process.env.APP_URL ||
      process.env.BASE_URL ||
      `http://localhost:${process.env.PORT || '3000'}`;

    return `${appUrl}/uploads/${folder}/${filename}`;
  }

  ensureUploadedFileExists(
    folder: 'images' | 'documents' | 'profile-pictures',
    filename: string,
  ) {
    const filePath = join(process.cwd(), 'uploads', folder, filename);
    return existsSync(filePath);
  }
}
