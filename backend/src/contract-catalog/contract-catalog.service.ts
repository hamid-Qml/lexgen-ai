// src/contract-catalog/contract-catalog.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ContractType } from './entities/contract-type.entity';
import { Repository, ILike } from 'typeorm';

@Injectable()
export class ContractCatalogService {
  constructor(
    @InjectRepository(ContractType)
    private contractTypes: Repository<ContractType>,
  ) {}

  async searchContractTypes(params: {
    q?: string;
    category?: string;
    limit?: number;
  }) {
    const { q, category, limit = 20 } = params;

    const where: any = { isActive: true };

    if (q) {
      where.name = ILike(`%${q}%`);
    }
    if (category) {
      where.category = category;
    }

    return this.contractTypes.find({
      where,
      order: { name: 'ASC' },
      take: limit,
    });
  }

  async findBySlug(slug: string) {
    return this.contractTypes.findOne({ where: { slug, isActive: true } });
  }
}
