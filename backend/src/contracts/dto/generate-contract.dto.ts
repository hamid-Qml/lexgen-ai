// src/contracts/dto/generate-contract.dto.ts
import { IsOptional, IsObject } from 'class-validator';

export class GenerateContractDto {
  @IsOptional()
  @IsObject()
  answers?: Record<string, any>;
}
