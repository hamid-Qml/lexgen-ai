// src/main.ts
import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // If running behind proxy (Railway, Render, etc.)
  app.set('trust proxy', 1);

  // Needed for Stripe webhooks
  app.use(
    bodyParser.json({
      limit: '512kb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // Security middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: false, // allow swagger assets
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false, // disable CSP in dev for Swagger
    }),
  );

  // CORS configuration
  const raw =
    configService.get<string>('CORS_ORIGINS') ??
    configService.get<string>('APP_BASE_URL');
  const origins = raw ? raw.split(',').map((s) => s.trim()) : [];

  app.enableCors({
    origin: (origin, callback) => {
      // allow non-browser tools with no Origin header (curl/Postman)
      if (!origin) return callback(null, true);
      return callback(null, origins.includes(origin));
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global interceptors
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      validationError: { target: false, value: false },
      forbidUnknownValues: true,
    }),
  );

  // Global route prefix
  app.setGlobalPrefix('api');

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Lexy Backend API')
    .setDescription(
      'NestJS backend for AI-assisted contract generation and precedent-backed drafting',
    )
    .setVersion('0.1')
    .addBearerAuth()
    .addTag('auth', 'User authentication and signup')
    .addTag('users', 'User profiles and company info')
    .addTag('billing', 'Subscriptions and billing')
    .addTag('catalog', 'Contract types, questions, and precedents')
    .addTag('contracts', 'Contract drafts and generation')
    .addTag('chat', 'Hybrid conversational flow for contracts')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('PORT') || 8000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
