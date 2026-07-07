import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GetRatesDto {
  @ApiProperty({
    example: 'stays_search_result_0001XYZ',
    description: 'The Duffel stays search result ID returned from the search endpoint',
  })
  @IsString()
  @IsNotEmpty()
  searchId!: string;

  @ApiProperty({
    example: 'acc_0001XYZ',
    description: 'The Duffel accommodation ID returned from the search endpoint',
  })
  @IsString()
  @IsNotEmpty()
  accommodationId!: string;
}
