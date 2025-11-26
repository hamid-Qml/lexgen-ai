// src/services/userService.ts
import { api } from '@/services/api';
import type { User } from '@/services/authService';

export type UpdateMePayload = {
  full_name?: string | null;
  company_name?: string | null;
  primary_jurisdiction?: string | null;
};

export const userService = {
  async updateMe(payload: UpdateMePayload) {
    // returns updated user (or a subset – up to you)
    return api<User | any>('/users/me', {
      method: 'PATCH',
      body: payload,
    });
  },
};
