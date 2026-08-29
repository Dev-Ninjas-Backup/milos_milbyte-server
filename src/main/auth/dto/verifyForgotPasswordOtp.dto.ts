import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class verifyForgotPasswordOtp {
    @ApiProperty({ example: 'john@gmail.com', description: 'Email address of the user' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: '123456', description: 'OTP for the user' })
    @IsString()
    @MinLength(6)
    otp!: string;
}
