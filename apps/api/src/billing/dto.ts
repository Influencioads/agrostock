import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ADDON_KINDS, BILLING_CYCLES, PAYMENT_PROVIDERS } from '@agrotraders/types';

/** Prisma's `Role` values. Kept as a literal list so the DTO layer stays typed. */
export const BILLABLE_ROLES = [
  'buyer',
  'seller',
  'transporter',
  'loaderco',
  'workerco',
  'worker',
  'accountant',
  'packer',
  'processor',
  'fulfillment_partner',
  'finance_partner',
] as const;

export class SubscribeDto {
  @ApiProperty() @IsString() @MaxLength(64) planId!: string;

  @ApiProperty({ enum: BILLING_CYCLES })
  @IsIn(BILLING_CYCLES as unknown as string[])
  cycle!: (typeof BILLING_CYCLES)[number];

  @ApiProperty({ enum: PAYMENT_PROVIDERS })
  @IsIn(PAYMENT_PROVIDERS as unknown as string[])
  provider!: (typeof PAYMENT_PROVIDERS)[number];

  /** Client-supplied so a double-tapped Pay button reuses one intent. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) idempotencyKey?: string;
}

export class CancelSubscriptionDto {
  @ApiProperty({ enum: BILLABLE_ROLES })
  @IsIn(BILLABLE_ROLES as unknown as string[])
  role!: (typeof BILLABLE_ROLES)[number];

  /** Default is to run to the end of the paid period. */
  @ApiPropertyOptional() @IsOptional() @IsBoolean() immediately?: boolean;
}

export class BuyAddonDto {
  @ApiProperty({ enum: ADDON_KINDS })
  @IsIn(ADDON_KINDS as unknown as string[])
  kind!: (typeof ADDON_KINDS)[number];

  /** Listing id for promotions, category id for a banner. */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) targetId?: string;

  @ApiProperty({ enum: PAYMENT_PROVIDERS })
  @IsIn(PAYMENT_PROVIDERS as unknown as string[])
  provider!: (typeof PAYMENT_PROVIDERS)[number];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) idempotencyKey?: string;
}

export class TopupIntentDto {
  /** Minor units of `currency` — kopecks for RUB. */
  @ApiProperty({ example: 500000 })
  @IsInt()
  @Min(100)
  amountMinor!: number;

  @ApiPropertyOptional({ example: 'RUB' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiProperty({ enum: PAYMENT_PROVIDERS })
  @IsIn(PAYMENT_PROVIDERS as unknown as string[])
  provider!: (typeof PAYMENT_PROVIDERS)[number];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) idempotencyKey?: string;
}

/* ── admin ──────────────────────────────────────────────────────── */

export class CreatePlanDto {
  @ApiProperty() @IsString() @Matches(/^[a-z0-9_]{3,60}$/, { message: 'code must be lowercase letters, digits and underscores' }) code!: string;

  @ApiProperty({ enum: BILLABLE_ROLES })
  @IsIn(BILLABLE_ROLES as unknown as string[])
  role!: (typeof BILLABLE_ROLES)[number];

  @ApiProperty() @IsInt() @Min(0) @Max(9) tier!: number;
  @ApiProperty() @IsString() @MaxLength(80) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;

  /** Validated key-by-key in PlansService — class-validator cannot express it. */
  @ApiPropertyOptional() @IsOptional() @IsObject() limits?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() features?: Record<string, unknown>;
}

export class UpdatePlanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(9) tier?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() limits?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() features?: Record<string, unknown>;
}

export class SetPlanPriceDto {
  @ApiProperty({ enum: BILLING_CYCLES })
  @IsIn(BILLING_CYCLES as unknown as string[])
  cycle!: (typeof BILLING_CYCLES)[number];

  /** Minor units. Null removes the cycle from the plan. */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  amountMinor?: number | null;

  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string;
}

export class UpdateGatewayDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() testMode?: boolean;

  /**
   * Field key → value. A value still equal to its masked placeholder means
   * "unchanged"; an empty string clears the field.
   */
  @ApiPropertyOptional() @IsOptional() @IsObject() credentials?: Record<string, string>;
}

export class UpdateBillingSettingsDto {
  @ApiPropertyOptional({ description: 'Basis points; 200 = 2%' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000)
  orderCommissionBps?: number;

  @ApiPropertyOptional({ description: 'Basis points; 500 = 5%' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000)
  escrowCommissionBps?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() commissionEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() quotasEnforced?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10) dunningRetries?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(720) dunningIntervalHours?: number;

  @ApiPropertyOptional({ description: 'User account subscription invoices are issued from' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  platformUserId?: string | null;
}

export class GrantSubscriptionDto {
  @ApiProperty() @IsString() @MaxLength(64) userId!: string;
  @ApiProperty() @IsString() @MaxLength(64) planId!: string;

  @ApiProperty({ enum: BILLING_CYCLES })
  @IsIn(BILLING_CYCLES as unknown as string[])
  cycle!: (typeof BILLING_CYCLES)[number];

  @ApiPropertyOptional({ description: 'Override the period length in months' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  months?: number;
}

export class SetDiscountDto {
  @ApiProperty({ description: '0–100; the early-adopter offer is 50' })
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent!: number;

  @ApiPropertyOptional({ nullable: true, description: 'When the discount lapses' })
  @IsOptional()
  @IsISO8601()
  discountUntil?: string | null;
}
