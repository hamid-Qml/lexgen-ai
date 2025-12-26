import { AppDataSource } from '../src/data-source';
import { User, SubscriptionTier } from '../src/users/entities/user.entity';
import { Subscription } from '../src/billing/entities/subscription.entity';
import { type BillingTier } from '../src/billing/plan';

function parseArgs() {
  const args = process.argv.slice(2);
  const email = args[0];
  const tierArg = (args[1] || 'business_monthly').toLowerCase();

  if (!email) {
    throw new Error('Usage: ts-node scripts/set-user-plan.ts <email> [tier]');
  }

  const tierMap: Record<string, { userTier: SubscriptionTier; billingTier: BillingTier }> = {
    business: { userTier: SubscriptionTier.BUSINESS, billingTier: 'business_monthly' },
    business_monthly: { userTier: SubscriptionTier.BUSINESS, billingTier: 'business_monthly' },
    business_yearly: { userTier: SubscriptionTier.BUSINESS, billingTier: 'business_yearly' },
    pro: { userTier: SubscriptionTier.PRO, billingTier: 'pro_monthly' },
    pro_monthly: { userTier: SubscriptionTier.PRO, billingTier: 'pro_monthly' },
    pro_yearly: { userTier: SubscriptionTier.PRO, billingTier: 'pro_yearly' },
    free: { userTier: SubscriptionTier.FREE, billingTier: 'free' as BillingTier },
  };

  const selection = tierMap[tierArg];
  if (!selection) {
    throw new Error(
      `Unknown tier "${tierArg}". Use one of: ${Object.keys(tierMap).join(', ')}`,
    );
  }

  return { email: email.toLowerCase(), ...selection };
}

async function run() {
  const { email, userTier, billingTier } = parseArgs();
  await AppDataSource.initialize();

  try {
    const userRepo = AppDataSource.getRepository(User);
    const subRepo = AppDataSource.getRepository(Subscription);

    const user = await userRepo.findOne({ where: { email } });
    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    user.subscription_tier = userTier;
    await userRepo.save(user);

    if (billingTier !== 'free') {
      const existing = await subRepo.findOne({
        where: { user: { id: user.id } },
        order: { created_at: 'DESC' },
      });

      if (existing) {
        existing.tier = billingTier;
        existing.status = 'active';
        existing.start_date = existing.start_date ?? new Date();
        await subRepo.save(existing);
      } else {
        const subscription = subRepo.create({
          user,
          tier: billingTier,
          status: 'active',
          start_date: new Date(),
          stripe_customer_id: null,
          stripe_subscription_id: null,
          stripe_price_id: null,
        });
        await subRepo.save(subscription);
      }
    }

    console.log(`Updated ${email} to ${userTier} (${billingTier}).`);
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
