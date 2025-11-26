// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { configValidationSchema } from './config/config.validation';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BillingModule } from './billing/billing.module';
import { ContractCatalogModule } from './contract-catalog/contract-catalog.module';
import { ContractsModule } from './contracts/contracts.module';
import { OnboardingModule } from './onboarding/onboarding.module';

import stripeConfig from './config/stripe.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      validationSchema: configValidationSchema,
      load: [stripeConfig]
    }),

    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 20 }],
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    }),

    AuthModule,
    UsersModule,
    BillingModule,
    ContractCatalogModule,
    ContractsModule,
    OnboardingModule,
    
  ],
})
export class AppModule {}
