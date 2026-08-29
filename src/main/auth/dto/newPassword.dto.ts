import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class newPasswordDto {
    @ApiProperty({ example: 'eyJhbGciOiJ..........', description: 'Reset token for the user' })
    @IsString()
    resetToken!: string;

    @ApiProperty({ example: '12345678', description: 'New password for the user' })
    @IsString()
    @MinLength(6)
    password!: string;
}
