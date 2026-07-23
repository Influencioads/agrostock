import { IsArray, IsEmail, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Roles a user may assign themselves at public sign-up. `admin` is intentionally
 * excluded: admins are provisioned via seed/back office — allowing it here would
 * be a privilege-escalation vector (anyone could POST role:"admin"). Workers may
 * self-register: they get an unaffiliated Worker record and can be hired directly.
 */
export const PUBLIC_ROLES = ['buyer', 'seller', 'transporter', 'loaderco', 'worker'] as const;

export class RegisterDto {
  @ApiProperty({ example: 'buyer@agrotraders.org' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Karim Trading' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: PUBLIC_ROLES, required: false, example: 'buyer' })
  @IsOptional()
  @IsIn(PUBLIC_ROLES as unknown as string[])
  role?: (typeof PUBLIC_ROLES)[number];

  @ApiProperty({ required: false, example: '🇦🇪 UAE' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false, example: '+971 50 123 4567', description: 'Private — visible to admins only' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, example: 'Dubai, UAE' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false, description: 'Market id (sellers pick their trade market)' })
  @IsOptional()
  @IsString()
  marketId?: string;

  // ── Operational registration data (transporters / loader companies / workers) ──
  // City/country tags are free-text; the directory filters match them case-insensitively.
  @ApiProperty({ required: false, example: 'Amritsar', description: 'Home base city' })
  @IsOptional()
  @IsString()
  originCity?: string;

  @ApiProperty({ required: false, example: 'India', description: 'Home base country' })
  @IsOptional()
  @IsString()
  originCountry?: string;

  @ApiProperty({ required: false, type: [String], description: 'Cities the provider operates in' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operatingCities?: string[];

  @ApiProperty({ required: false, type: [String], description: 'Countries the provider operates in' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operatingCountries?: string[];

  @ApiProperty({ required: false, type: [String], description: 'Cities the provider supplies to (transporters / loader companies)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supplyingCities?: string[];

  @ApiProperty({ required: false, type: [String], description: 'Countries the provider supplies to (transporters / loader companies)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supplyingCountries?: string[];

  @ApiProperty({ required: false, example: 4, description: 'Minimum job length in hours (workers / loader companies)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minWorkHours?: number;

  @ApiProperty({ required: false, example: 50, description: 'Minimum trip distance in km (transporters)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minDistanceKm?: number;

  @ApiProperty({ required: false, example: 5, description: 'Minimum crew size the loader company dispatches' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minLoaders?: number;
}

export class LoginDto {
  // Accepts an email OR a phone number — loader-created workers log in by phone.
  @ApiProperty({ example: 'buyer@agrotraders.org' })
  @IsString()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password!: string;
}

export class RefreshDto {
  // Optional: browser clients (F38) send the refresh token in an HttpOnly cookie
  // and omit it from the body; native clients pass it here.
  @ApiProperty({ required: false, description: 'A refresh token previously issued by login/register' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'The one-shot token from the confirmation link' })
  @IsString()
  token!: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'buyer@agrotraders.org' })
  @IsEmail()
  email!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'buyer@agrotraders.org' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'The one-shot token from the reset link' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'newPassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class RequestOtpDto {
  @ApiProperty({ example: 'buyer@agrotraders.org' })
  @IsEmail()
  email!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'buyer@agrotraders.org' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '482913', description: 'The 6-digit code emailed to the user' })
  @IsString()
  code!: string;
}
