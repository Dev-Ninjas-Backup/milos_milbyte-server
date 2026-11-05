import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateProfilePictureDto {
  @ApiProperty({
    example: 'profile-pic-12345.jpg',
    description: 'Filename received from deploy-files upload/link route',
  })
  @IsString()
  @MinLength(3)
  filename!: string;
}
