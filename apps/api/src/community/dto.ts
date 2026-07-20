import {
  CommunityGroupKind,
  CommunityGroupVisibility,
  CommunityPostType,
  CommunityReportTargetType,
} from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGroupDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsOptional() @IsEnum(CommunityGroupKind) kind?: CommunityGroupKind;
  @IsOptional() @IsEnum(CommunityGroupVisibility) visibility?: CommunityGroupVisibility;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() cropTag?: string;
}

export class CreatePostDto {
  @IsString() @MinLength(1) @MaxLength(4000) body!: string;
  @IsOptional() @IsString() groupId?: string;
  @IsOptional() @IsEnum(CommunityPostType) type?: CommunityPostType;
  @IsOptional() @IsString() @MaxLength(160) title?: string;
}

export class CreateRequirementDto {
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @IsString() productCategory!: string;
  @IsString() productName!: string;
  @IsString() quantity!: string;
  @IsString() unit!: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsString() budget?: string;
  @IsOptional() @IsString() buyerLocation?: string;
  @IsOptional() @IsString() destinationCountry?: string;
  @IsOptional() @IsString() delivery?: string;
  @IsOptional() @IsString() neededDate?: string;
  @IsOptional() @IsBoolean() transportRequired?: boolean;
  @IsOptional() @IsBoolean() loaderRequired?: boolean;
  @IsOptional() @IsBoolean() importExport?: boolean;
  @IsOptional() @IsEnum(CommunityGroupVisibility) visibility?: CommunityGroupVisibility;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsString() groupId?: string;
}

export class RespondRequirementDto {
  @IsOptional() @IsString() kind?: string;
  @IsString() @MinLength(1) @MaxLength(2000) body!: string;
  @IsOptional() @IsString() priceText?: string;
  @IsOptional() @IsString() quantityText?: string;
  @IsOptional() @IsString() deliveryText?: string;
  @IsOptional() @IsString() productId?: string;
}

export class SendMessageDto {
  @IsOptional() @IsString() groupId?: string;
  @IsOptional() @IsString() toUserId?: string;
  @IsString() @MinLength(1) @MaxLength(4000) body!: string;
  @IsOptional() @IsString() replyToId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) attachmentIds?: string[];
  @IsOptional() @IsString() tempId?: string;
}

export class ReactionDto {
  @IsString() messageId!: string;
  @IsString() @MaxLength(16) emoji!: string;
}

export class ReportDto {
  @IsEnum(CommunityReportTargetType) targetType!: CommunityReportTargetType;
  @IsString() targetId!: string;
  @IsString() @MinLength(2) @MaxLength(500) reason!: string;
}

export class InviteDto {
  @IsString() userId!: string;
}

export class PageQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) take?: number;
}
