import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PlanTier, UserRoles } from '@prisma/client';
import { hash, compare } from 'bcryptjs';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UpdateProfilePictureDto } from './dto/update-profile-picture.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MailService } from '../../config/mail/mail.service';
import { devOnly } from 'src/common/utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) { }


  // ================= REGISTER =================
  async register(registerDto: RegisterDto) {
    const userExists = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (userExists) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        password: passwordHash,
        role: registerDto.role ?? UserRoles.CLIENT,
      },
    });

    const freePlan = await this.prisma.subscriptionPlan.findFirst({
      where: { tier: PlanTier.FREE },
    });

    if (!freePlan) {
      throw new NotFoundException('Free subscription plan not found');
    }

    const userSubscription = await this.prisma.userSubscription.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        planType: freePlan.tier,
      },
    });
    return {
      message: 'Registration successful',
      user: this.sanitizeUser(user),
      subscription: userSubscription,
    };
  }

  // ================= LOGIN =================
  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.isDeleted === true) {
      throw new UnauthorizedException('Your account has been deleted. Contact support for assistance.');
    }
    if (user.isBolocked === true) {
      throw new UnauthorizedException('Your account has been blocked. Contact support for assistance.');
    }
    const isPasswordValid = await compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ── 2FA check ──
    if (user.twoFactorEnabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorOtp: otp,
          twoFactorOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      await this.mailService.sendTwoFactorOtpEmail({
        to: user.email,
        name: user.firstName ?? user.email,
        otp,
      });

      return {
        message: 'Two-factor authentication required. OTP sent to your email.',
        twoFactorRequired: true,
        userId: user.id,
        // DEV ONLY: remove this line in production
        ...devOnly({ otp }),


      };
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Login successful',
      twoFactorRequired: false,
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  // ================= GET ME =================
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const mySubscription = await this.prisma.userSubscription.findFirst({
      where: { userId: Number(userId) },
      include: {
        plan: true,
      },
    });

    return {
      user: this.sanitizeUser(user),
      mySubscriptionName: mySubscription?.plan.name,
    };
  }

  // ================= UPDATE PROFILE =================
  async updateProfilePicture(
    userId: string,
    updateProfilePictureDto: UpdateProfilePictureDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: Number(userId) },
      data: {
        profilePicture: updateProfilePictureDto.filename,
      },
    });
    return {
      message: 'Profile picture updated successfully',
      user: this.sanitizeUser(updatedUser),
    };
  }

  // ================= CHANGE PASSWORD =================
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordCorrect = await compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordCorrect) {
      throw new UnauthorizedException('Current password does not match');
    }

    const hashedNewPassword = await hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: Number(userId) },
      data: { password: hashedNewPassword },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  // ================= FORGOT PASSWORD =================
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        forgotPasswordOtp: otp,
        forgotPasswordOtpExpiresAt: new Date(
          Date.now() + 10 * 60 * 1000,
        ),
      },
    });

    await this.mailService.sendForgotPasswordEmail({
      to: forgotPasswordDto.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      otp,
    });



    return {
      ...devOnly({ otp }),


      message: 'OTP sent successfully.',
    };
  }

  // ================= VERIFY FORGOT PASSWORD OTP =================
  async verifyForgotPasswordOtp(
    email: string,
    otp: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      !user.forgotPasswordOtp ||
      !user.forgotPasswordOtpExpiresAt
    ) {
      throw new BadRequestException('OTP not found');
    }

    if (
      user.forgotPasswordOtpExpiresAt < new Date()
    ) {
      throw new BadRequestException('OTP expired');
    }

    const matched = user.forgotPasswordOtp === otp;

    if (!matched) {
      throw new BadRequestException('Invalid OTP');
    }
    const resetToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        type: 'password-reset',
      },
      {
        expiresIn: '15m',
      },
    );

    return {
      message: 'OTP verified successfully.Please provide your new password .',
      resetToken,
    };
  }

  // ================= NEW PASSWORD =================
  async newPassword(
    resetToken: string,
    newPassword: string,
  ) {
    const payload =
      await this.jwtService.verifyAsync(resetToken);

    if (payload.type !== 'password-reset') {
      throw new BadRequestException('Invalid token');
    }

    const password = await hash(
      newPassword,
      10,
    );

    await this.prisma.user.update({
      where: {
        id: payload.sub,
      },
      data: {
        password,
        forgotPasswordOtp: null,
        forgotPasswordOtpExpiresAt: null,
      },
    });

    return {
      message: 'Password reset successful.',
    };
  }


  // ================= UPDATE PROFILE =================
  async profileUpdate(userId: string, updateData: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: Number(userId) },
      data: {
        firstName: updateData.firstName ?? user.firstName,
        lastName: updateData.lastName ?? user.lastName,
        phoneNumber: updateData.phoneNumber ?? user.phoneNumber,
        adress: updateData.address ?? user.adress,
        city: updateData.city ?? user.city,
        state: updateData.state ?? user.state,
        zipCode: updateData.zipCode ?? user.zipCode,
        country: updateData.country ?? user.country,
      },
    });

    return {
      message: 'Profile updated successfully',
      user: this.sanitizeUser(updatedUser),
    };
  }

  // ================= DELETE MY ACCOUNT =================
  async deleteMyAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isDeleted) {
      throw new BadRequestException('Account is already deleted');
    }

    await this.prisma.user.update({
      where: { id: Number(userId) },
      data: { isDeleted: true },
    });

    return {
      message: 'Your account has been deleted successfully',
    };
  }


  // ================= VERIFY 2FA OTP =================
  async verifyTwoFactorOtp(userId: number, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorOtp || !user.twoFactorOtpExpiresAt) {
      throw new BadRequestException('No pending 2FA OTP found. Please login again.');
    }

    if (user.twoFactorOtpExpiresAt < new Date()) {
      throw new BadRequestException('2FA OTP has expired. Please login again.');
    }

    if (user.twoFactorOtp !== otp) {
      throw new BadRequestException('Invalid 2FA OTP.');
    }

    // Clear OTP after successful verification
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorOtp: null,
        twoFactorOtpExpiresAt: null,
      },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Two-factor authentication verified. Login successful.',
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  // ================= TOGGLE 2FA =================
  async toggleTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    const enable = !user.twoFactorEnabled;

    if (user.twoFactorEnabled === enable) {
      throw new BadRequestException(
        `Two-factor authentication is already ${enable ? 'enabled' : 'disabled'}.`,
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: Number(userId) },
      data: {
        twoFactorEnabled: enable,
        // Clear any pending OTP when toggling
        twoFactorOtp: null,
        twoFactorOtpExpiresAt: null,
      },
    });

    return {
      message: `Two-factor authentication has been ${enable ? 'enabled' : 'disabled'} successfully.`,
      twoFactorEnabled: updatedUser.twoFactorEnabled,
    };
  }




  // ================= UTIL =================
  private sanitizeUser<T extends { password: string }>(user: T) {
    const { password, ...safeUser } = user as unknown as {
      password?: string;
    } & Record<string, any>;
    return safeUser;
  }



}
