// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
  ) {}

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.full_name !== undefined) user.full_name = dto.full_name;
    if (dto.company_name !== undefined) user.company_name = dto.company_name;
    if (dto.primary_jurisdiction !== undefined) {
      user.primary_jurisdiction = dto.primary_jurisdiction;
    }

    return this.repo.save(user);
  }
}
