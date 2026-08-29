import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateDestinationDto {
  @ApiProperty({ example: 'Saint Martin' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    example: 'A beautiful island destination with coral beaches and clear sea.',
  })
  @IsString()
  @MinLength(5)
  description!: string;

  @ApiProperty({ example: "Cox's Bazar, Bangladesh" })
  @IsString()
  @MinLength(2)
  location!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isPopular!: boolean;

  @ApiProperty({ example: 3500 })
  @IsNumber()
  @Min(0)
  perPersonCost!: number;

  @ApiProperty({ example: '/uploads/destinations/saint-martin.jpg' })
  @IsString()
  @MinLength(3)
  image!: string;
}
