import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateQuoteDto {
  @ApiProperty({
    example: 'rate_0001XYZ',
    description: 'The Duffel rate ID returned from the rates endpoint',
  })
  @IsString()
  @IsNotEmpty()
  rateId!: string;
}
