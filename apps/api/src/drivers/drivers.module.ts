import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { DriverStatus } from '@prisma/client';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { UploadsService } from '../uploads/uploads.service';

export class CreateDriverDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() vehicle?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) ratingPct?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) onTimePct?: number;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsDateString() licenseExpiry?: string;
  @IsOptional() @IsInt() @Min(0) @Max(80) experienceYears?: number;
  @IsOptional() @IsInt() @Min(0) ratePerHourCents?: number;
}

export class UpdateDriverDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() vehicle?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) ratingPct?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) onTimePct?: number;
  @IsOptional() @IsIn(['active', 'off']) status?: DriverStatus;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsDateString() licenseExpiry?: string;
  @IsOptional() @IsInt() @Min(0) @Max(80) experienceYears?: number;
  @IsOptional() @IsInt() @Min(0) ratePerHourCents?: number;
}

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  mine(ownerId: string) {
    return this.prisma.driver.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
  }
  create(ownerId: string, dto: CreateDriverDto) {
    return this.prisma.driver.create({
      data: {
        ownerId,
        name: dto.name,
        vehicle: dto.vehicle,
        ratingPct: dto.ratingPct,
        onTimePct: dto.onTimePct,
        phone: dto.phone,
        licenseNumber: dto.licenseNumber,
        licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : null,
        experienceYears: dto.experienceYears,
        ratePerHourCents: dto.ratePerHourCents,
      },
    });
  }
  private async owned(id: string, ownerId: string) {
    const d = await this.prisma.driver.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Driver not found');
    if (d.ownerId !== ownerId) throw new ForbiddenException('Not your driver');
    return d;
  }
  async update(id: string, ownerId: string, dto: UpdateDriverDto) {
    await this.owned(id, ownerId);
    const { licenseExpiry, ...rest } = dto;
    return this.prisma.driver.update({
      where: { id },
      data: { ...rest, ...(licenseExpiry ? { licenseExpiry: new Date(licenseExpiry) } : {}) },
    });
  }
  async setPhoto(id: string, ownerId: string, photoUrl: string) {
    await this.owned(id, ownerId);
    return this.prisma.driver.update({ where: { id }, data: { photoUrl } });
  }
  async remove(id: string, ownerId: string) {
    await this.owned(id, ownerId);
    await this.prisma.driver.delete({ where: { id } });
    return { ok: true };
  }
}

@ApiTags('drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('transporter')
@Controller('drivers')
export class DriversController {
  constructor(
    private drivers: DriversService,
    private uploads: UploadsService,
  ) {}

  @Get() mine(@CurrentUser() u: AuthUser) {
    return this.drivers.mine(u.id);
  }
  @Post() create(@CurrentUser() u: AuthUser, @Body() dto: CreateDriverDto) {
    return this.drivers.create(u.id, dto);
  }
  @Patch(':id') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.drivers.update(id, u.id, dto);
  }
  @ApiConsumes('multipart/form-data')
  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(@CurrentUser() u: AuthUser, @Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    const photoUrl = await this.uploads.saveImage(file, 'drivers');
    return this.drivers.setPhoto(id, u.id, photoUrl);
  }
  @Delete(':id') remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.drivers.remove(id, u.id);
  }
}

@Module({
  controllers: [DriversController],
  providers: [DriversService],
})
export class DriversModule {}
