import { SupportCategory, SupportPriority, SupportStatus } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTicketDto {
  @IsEnum(SupportCategory) category!: SupportCategory;
  @IsString() @MinLength(2) @MaxLength(160) subject!: string;
  @IsString() @MinLength(2) @MaxLength(4000) description!: string;
  @IsOptional() @IsEnum(SupportPriority) priority?: SupportPriority;
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() auctionId?: string;
  @IsOptional() @IsString() transportBookingId?: string;
  @IsOptional() @IsString() loaderBookingId?: string;
  @IsOptional() @IsString() safeDealTxId?: string;
}

export class SendSupportMessageDto {
  @IsString() @MinLength(1) @MaxLength(4000) body!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) attachmentIds?: string[];
  @IsOptional() @IsString() tempId?: string;
}

export class AssignDto {
  @IsOptional() @IsString() agentId?: string;
}

export class TransferDto {
  @IsString() agentId!: string;
}

export class NoteDto {
  @IsString() @MinLength(1) @MaxLength(2000) body!: string;
}

export class StatusDto {
  @IsEnum(SupportStatus) status!: SupportStatus;
}

export class PriorityDto {
  @IsEnum(SupportPriority) priority!: SupportPriority;
}

export class TagDto {
  @IsString() @MinLength(1) @MaxLength(40) label!: string;
}

export class RateDto {
  @IsInt() @Min(1) @Max(5) score!: number;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}
