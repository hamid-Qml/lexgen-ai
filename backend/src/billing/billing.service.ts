// src/billing/billing.service.ts
import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Subscription } from './entities/subscription.entity';
import { User, SubscriptionTier } from 'src/users/entities/user.entity';
import {
  STRIPE_PLAN_KEY_TO_PRICE_ID,
  STRIPE_PRICE_TO_TIER,
  PlanKey,
  BillingTier,
} from './plan';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;
  private readonly appBaseUrl: string;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepo: Repository<Subscription>,

    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,

    private readonly configService: ConfigService,
  ) {
    const stripeConfig = this.configService.get('stripe') as any;
    const secretKey = stripeConfig?.secretKey ?? process.env.STRIPE_SECRET_KEY;
    const mode = stripeConfig?.mode ?? process.env.STRIPE_MODE ?? 'test';

    if (!secretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }

    if (!['test', 'live'].includes(mode)) {
      throw new Error(
        `Invalid STRIPE_MODE: "${mode}". Must be "test" or "live".`,
      );
    }

    this.stripe = new Stripe(secretKey, {
      // pick the actual version you pin to in Stripe dashboard
      apiVersion: '2025-11-17.clover',
    });

    this.appBaseUrl =
      this.configService.get<string>('APP_BASE_URL') ??
      process.env.APP_BASE_URL ??
      'http://localhost:8080';

    this.logger.log(`Stripe initialized in ${mode.toUpperCase()} mode`);
  }

  // ========== Public methods ==========

  async createCheckoutSession(userId: string, planKey: PlanKey) {
    this.logger.log(
      `createCheckoutSession called – userId=${userId}, planKey=${planKey}`,
    );

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      this.logger.warn(
        `createCheckoutSession: user not found for userId=${userId}`,
      );
      throw new BadRequestException('User not found');
    }

    const priceId = STRIPE_PLAN_KEY_TO_PRICE_ID[planKey];
    if (!priceId) {
      this.logger.warn(
        `createCheckoutSession: unknown planKey="${planKey}" from user ${userId}`,
      );
      throw new BadRequestException('Unknown plan');
    }

    // 1. Ensure Stripe customer exists
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      this.logger.log(
        `No Stripe customer for user ${user.id}, creating one in Stripe...`,
      );
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      user.stripe_customer_id = customerId;
      await this.usersRepo.save(user);
      this.logger.log(
        `Created Stripe customer ${customerId} for user ${user.id}`,
      );
    }

    // 2. Create checkout session
    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 7,
        },
        success_url: `${this.appBaseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.appBaseUrl}/billing/cancel`,
        metadata: {
          userId: user.id,
          planKey,
        },
      });

      this.logger.log(
        `Stripe checkout session created – sessionId=${session.id}, userId=${user.id}, planKey=${planKey}, priceId=${priceId}`,
      );

      return { url: session.url };
    } catch (err: any) {
      this.logger.error(
        `Error creating Stripe checkout session for user ${user.id}, planKey=${planKey}`,
        err.stack || err.message,
      );
      throw new InternalServerErrorException(
        'Failed to create checkout session',
      );
    }
  }

  async createPortalSession(userId: string) {
    this.logger.log(`createPortalSession called – userId=${userId}`);

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user || !user.stripe_customer_id) {
      this.logger.warn(
        `createPortalSession: No Stripe customer for user ${userId}`,
      );
      throw new BadRequestException('No Stripe customer for this user');
    }

    try {
      const portalSession = await this.stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: `${this.appBaseUrl}/account`,
      });

      this.logger.log(
        `Stripe billing portal session created – portalSessionId=${portalSession.id}, userId=${user.id}`,
      );

      return { url: portalSession.url };
    } catch (err: any) {
      this.logger.error(
        `Error creating Stripe portal session for user ${user.id}`,
        err.stack || err.message,
      );
      throw new InternalServerErrorException(
        'Failed to create billing portal session',
      );
    }
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret =
      this.configService.get<string>('stripe.webhookSecret') ??
      process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
      this.logger.log(`Stripe webhook received – type=${event.type}`);
    } catch (err: any) {
      this.logger.error(
        'Webhook signature verification failed',
        err.stack || err.message,
      );
      throw new BadRequestException('Invalid signature');
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionChanged(
            event.data.object as Stripe.Subscription,
          );
          break;

        default:
          this.logger.debug(`Unhandled Stripe event type ${event.type}`);
      }
    } catch (err: any) {
      this.logger.error(
        `Error handling Stripe webhook event type=${event.type}`,
        err.stack || err.message,
      );
      throw err;
    }
  }

  async getMySubscriptionSummary(userId: string) {
    const sub = await this.getActiveSubscriptionForUser(userId);

    if (!sub) {
      this.logger.debug(
        `No active subscription found for userId=${userId}, returning "free" tier`,
      );
      return {
        tier: 'free' as BillingTier,
        status: 'inactive' as const,
        current_period_end: null,
        stripe_customer_id: null as string | null,
        stripe_subscription_id: null as string | null,
      };
    }

    this.logger.debug(
      `Subscription summary for userId=${userId}: tier=${sub.tier}, status=${sub.status}`,
    );

    return {
      tier: sub.tier,
      status: sub.status,
      current_period_end: sub.current_period_end,
      stripe_customer_id: sub.stripe_customer_id,
      stripe_subscription_id: sub.stripe_subscription_id,
    };
  }

  // ========== Internal helpers ==========

  private async getActiveSubscriptionForUser(userId: string) {
    this.logger.debug(
      `Fetching active subscription from DB for userId=${userId}`,
    );
    return this.subscriptionsRepo.findOne({
      where: { user: { id: userId } },
      order: { start_date: 'DESC' },
    });
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    this.logger.log(
      `Handling checkout.session.completed – sessionId=${session.id}, mode=${session.mode}`,
    );

    const userId = (session.metadata as any)?.userId;
    const customerId = session.customer as string | null;

    if (!userId || !customerId) {
      this.logger.warn(
        'checkout.session.completed without userId or customerId in metadata',
      );
      return;
    }

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      this.logger.warn(
        `checkout.session.completed for non-existent userId=${userId}`,
      );
      return;
    }

    user.stripe_customer_id = customerId;
    await this.usersRepo.save(user);

    if (session.mode === 'subscription') {
      const subscriptionId = session.subscription as string;
      if (!subscriptionId) {
        this.logger.warn(
          `checkout.session.completed (subscription mode) without subscriptionId – sessionId=${session.id}`,
        );
        return;
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionId,
      );
      await this.upsertFromStripeSubscription(subscription, user);
    } else {
      this.logger.warn(
        `checkout.session.completed received for non-subscription mode="${session.mode}" – currently not handled`,
      );
    }
  }

  private async handleSubscriptionChanged(stripeSub: Stripe.Subscription) {
    this.logger.log(
      `Handling subscription event – stripeSubId=${stripeSub.id}, status=${stripeSub.status}`,
    );
    const customerId = stripeSub.customer as string;
    const user = await this.usersRepo.findOne({
      where: { stripe_customer_id: customerId },
    });
    if (!user) {
      this.logger.warn(
        `Subscription event for unknown customer stripeCustomerId=${customerId}`,
      );
      return;
    }

    await this.upsertFromStripeSubscription(stripeSub, user);
  }

  private async upsertFromStripeSubscription(
    stripeSub: Stripe.Subscription,
    user: User,
  ) {
    const item = stripeSub.items.data[0];
    const priceId = item?.price?.id;
    if (!priceId) {
      this.logger.warn(
        `Stripe subscription ${stripeSub.id} has no priceId on first item`,
      );
      return;
    }

    const tier: BillingTier = STRIPE_PRICE_TO_TIER[priceId] ?? 'free';
    const status = this.mapStripeStatus(stripeSub.status);
    const currentPeriodEnd = this.getCurrentPeriodEndFromSubscription(
      stripeSub,
    );

    this.logger.log(
      `Upserting subscription from Stripe – stripeSubId=${stripeSub.id}, priceId=${priceId}, tier=${tier}, status=${status}, currentPeriodEnd=${currentPeriodEnd}`,
    );

    let existing = await this.subscriptionsRepo.findOne({
      where: {
        user: { id: user.id },
        stripe_subscription_id: stripeSub.id,
      },
    });

    if (!existing) {
      existing = this.subscriptionsRepo.create({
        user,
        stripe_subscription_id: stripeSub.id,
        stripe_customer_id: stripeSub.customer as string,
        start_date: new Date(stripeSub.start_date * 1000),
      });
    }

    existing.stripe_price_id = priceId;
    existing.tier = tier;
    existing.status = status;
    existing.current_period_end = currentPeriodEnd;
    existing.stripe_customer_id = stripeSub.customer as string;

    await this.subscriptionsRepo.save(existing);
    this.logger.debug(
      `Subscription record saved id=${existing.id} for userId=${user.id}`,
    );

    // Also keep coarse subscription_tier on user in sync
    user.subscription_tier = this.mapBillingTierToUserTier(tier);
    await this.usersRepo.save(user);
  }

  private mapStripeStatus(
    status: Stripe.Subscription.Status,
  ): Subscription['status'] {
    switch (status) {
      case 'trialing':
        return 'trialing';
      case 'active':
        return 'active';
      case 'past_due':
      case 'unpaid':
        return 'past_due';
      case 'canceled':
      case 'incomplete_expired':
        return 'canceled';
      case 'incomplete':
        return 'inactive';
      default:
        this.logger.warn(`Unknown Stripe subscription status="${status}"`);
        return 'inactive';
    }
  }

  private getCurrentPeriodEndFromSubscription(
    stripeSub: Stripe.Subscription,
  ): Date | null {
    const firstItem: any = stripeSub.items?.data?.[0];
    const ts: number | undefined = firstItem?.current_period_end;

    if (!ts || typeof ts !== 'number') {
      this.logger.debug(
        `No current_period_end on subscription ${stripeSub.id}, returning null`,
      );
      return null;
    }

    return new Date(ts * 1000);
  }

  private mapBillingTierToUserTier(tier: BillingTier): SubscriptionTier {
    switch (tier) {
      case 'pro_monthly':
      case 'pro_yearly':
        return SubscriptionTier.PRO;
      case 'business_monthly':
      case 'business_yearly':
        return SubscriptionTier.BUSINESS;
      default:
        return SubscriptionTier.FREE;
    }
  }
}
