import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UpdateProfilePictureDto } from './dto/update-profile-picture.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRoles } from '@prisma/client';
import { verifyForgotPasswordOtp } from './dto/verifyForgotPasswordOtp.dto';
import { newPasswordDto } from './dto/newPassword.dto';
import { VerifyTwoFactorOtpDto } from './dto/verify-2fa-otp.dto';
import { ToggleTwoFactorDto } from './dto/toggle-2fa.dto';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: UserRoles;
  };
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // ================= REGISTER =================
  @ApiTags('Public')
  @ApiOperation({ summary: 'Register new user' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  // ================= LOGIN =================
  @ApiTags('Public')
  @ApiOperation({ summary: 'Login user' })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  // ================= PROTECTED ROUTES myself=================
  @ApiTags('User')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    return await this.authService.getMe(req.user.sub);
  }


  // ================= UPDATE PROFILE =================
  @ApiTags('User')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @Patch('update-profile')
  async profileUpdate(
    @Req() req: AuthenticatedRequest,
    @Body() updateData: UpdateProfileDto,
  ) {
    return await this.authService.profileUpdate(req.user.sub, updateData);
  }


  // ================= CHANGE PROFILE PICTURE =================
  @ApiTags('User')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile picture' })
  @Patch('change-profile-picture')
  async updateProfilePicture(
    @Req() req: AuthenticatedRequest,
    @Body() updateProfilePictureDto: UpdateProfilePictureDto,
  ) {
    return await this.authService.updateProfilePicture(
      req.user.sub,
      updateProfilePictureDto,
    );
  }

  // ================= CHANGE PASSWORD =================
  @ApiTags('User')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  @Patch('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return await this.authService.changePassword(
      req.user.sub,
      changePasswordDto,
    );
  }

  // ================= FORGOT  PASSWORD =================
  @ApiTags('Public')
  @ApiOperation({ summary: 'Send forgot password request' })
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('verify-forgot-password-otp')
  @HttpCode(HttpStatus.OK)
  async verifyForgotPasswordOtp(
    @Body() body: verifyForgotPasswordOtp,
  ) {
    return await this.authService.verifyForgotPasswordOtp(
      body.email,
      body.otp,
    );
  }
  @Post('new-password')
  @HttpCode(HttpStatus.OK)
  async newPassword(
    @Body()
    body: newPasswordDto,
  ) {
    return await this.authService.newPassword(
      body.resetToken,
      body.password,
    );
  }

  // ================= DELETE MY ACCOUNT =================
  @ApiTags('User')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own account (soft delete)' })
  @Delete('soft-delete')
  async deleteMyAccount(@Req() req: AuthenticatedRequest) {
    return await this.authService.deleteMyAccount(req.user.sub);
  }

  // ================= VERIFY 2FA OTP =================
  @ApiTags('Public')
  @ApiOperation({ summary: 'Verify 2FA OTP after login to receive access token' })
  @Post('verify-2fa-otp')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactorOtp(@Body() body: VerifyTwoFactorOtpDto) {
    return await this.authService.verifyTwoFactorOtp(body.userId, body.otp);
  }

  // ================= TOGGLE 2FA =================
  @ApiTags('User')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable or disable two-factor authentication for current user' })
  @Patch('toggle-2fa')
  async toggleTwoFactor(
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.authService.toggleTwoFactor(req.user.sub);
  }

}
