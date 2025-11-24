// src/contracts/dto/create-contract-draft.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class CreateContractDraftDto {
  @IsOptional()
  @IsString()
  contractTypeId?: string;

  @IsOptional()
  @IsString()
  contractTypeSlug?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  jurisdiction?: string;
}
