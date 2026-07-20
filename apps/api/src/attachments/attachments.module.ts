import { Body, Controller, Get, Global, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AttachmentsService } from './attachments.service';

export class PresignBody {
  @IsIn(['community', 'support']) system!: 'community' | 'support';
  @IsString() mime!: string;
  @IsInt() @Min(1) @Max(50 * 1024 * 1024) sizeBytes!: number;
  @IsOptional() @IsString() originalName?: string;
}

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private attachments: AttachmentsService) {}

  /** Reserve an attachment row + presigned PUT url for a direct MinIO upload. */
  @Post('presign')
  presign(@CurrentUser() user: AuthUser, @Body() body: PresignBody) {
    return this.attachments.presignUpload(user, body);
  }

  /** Access-checked presigned GET url for viewing/downloading an attachment. */
  @Get(':id/url')
  url(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.attachments.downloadUrl(user, id);
  }
}

@Global()
@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
