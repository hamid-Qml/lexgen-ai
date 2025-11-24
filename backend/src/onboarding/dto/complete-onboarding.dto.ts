// src/onboarding/dto/complete-onboarding.dto.ts
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import type { IntendedUsage } from 'src/users/entities/user.entity';

export class CompleteOnboardingDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsString()
  abn_acn?: string;

  @IsOptional()
  @IsString()
  company_address?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsString()
  primary_jurisdiction: string; // e.g. "AU-NSW"

  @IsArray()
  @IsString({ each: true })
  @IsIn(['commercial', 'employment', 'technology', 'family_law'], {
    each: true,
  })
  contract_categories_of_interest: string[];

  @IsString()
  @IsIn(['personal', 'business', 'legal_practitioner'])
  intended_usage: IntendedUsage;

  @IsBoolean()
  accepted_terms: boolean;

  @IsBoolean()
  accepted_disclaimer: boolean;
}
