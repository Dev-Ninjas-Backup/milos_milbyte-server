import { ApiProperty, } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'John', description: 'First name of the user' })
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number of the user' })
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'Banani 1/2  ', description: 'Address of the user' })
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Dhaka ', description: 'City of the user' })
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Gulsan  ', description: 'State of the user' })
  @IsOptional()
  state?: string;

  @ApiProperty({ example: '5620 ', description: 'Zip code of the user' })
  @IsOptional()
  zipCode?: string;

  @ApiProperty({ example: 'Bangladesh ', description: 'Country of the user' })
  @IsOptional()
  country?: string;
}
