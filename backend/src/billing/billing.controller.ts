// src/billing/billing.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Headers,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

type RawBodyRequest = Request & { rawBody: Buffer };

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMySubscription(@Req() req: any) {
    const userId = req.user.userId; // from JwtStrategy.validate
    this.logger.debug(`GET /billing/me for user ${userId}`);
    return this.billingService.getMySubscriptionSummary(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('checkout-session')
  async createCheckoutSession(
    @Req() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const userId = req.user.userId;
    this.logger.log(
      `POST /billing/checkout-session – user=${userId}, planKey=${dto.planKey}`,
    );

    return this.billingService.createCheckoutSession(userId, dto.planKey);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('portal')
  async createPortalSession(@Req() req: any) {
    const userId = req.user.userId;
    this.logger.log(`GET /billing/portal – user=${userId}`);
    return this.billingService.createPortalSession(userId);
  }

  // Stripe webhook – no auth guard
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log('POST /billing/webhook received');
    await this.billingService.handleStripeWebhook(req.rawBody, signature);
    return { received: true };
  }
}
