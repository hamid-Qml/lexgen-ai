// src/users/dto/update-profile.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  full_name?: string | null;

  @IsOptional()
  @IsString()
  company_name?: string | null;

  @IsOptional()
  @IsString()
  primary_jurisdiction?: string | null;
}
