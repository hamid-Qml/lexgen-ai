// src/contract-catalog/contract-catalog.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ContractCatalogService } from './contract-catalog.service';

@Controller('contract-types')
export class ContractCatalogController {
  constructor(private catalog: ContractCatalogService) {}

  // GET /contract-types?q=employment&category=employment
  @Get()
  getTypes(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalog.searchContractTypes({
      q: q || undefined,
      category: category || undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
