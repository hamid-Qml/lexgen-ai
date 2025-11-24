// src/config/auth.config.ts
import { registerAs } from '@nestjs/config';

// match jose/ms style: 30s, 15m, 1h, 7d etc
type ExpiresIn = number | `${number}${'s' | 'm' | 'h' | 'd'}`;

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as ExpiresIn,
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 12),
}));
