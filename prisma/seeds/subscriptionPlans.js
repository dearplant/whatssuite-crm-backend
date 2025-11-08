import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    id: 'plan_starter',
    name: 'Starter',
    description: 'Perfect for small businesses getting started with WhatsApp CRM',
    price: 29.99,
    currency: 'USD',
    interval: 'monthly',
    features: {
      contacts: 1000,
      whatsapp_accounts: 1,
      messages_per_month: 5000,
      campaigns: true,
      flows: true,
      ai_chatbot: false,
      team_members: 2,
      support: 'email',
    },
    is_active: true,
  },
  {
    id: 'plan_professional',
    name: 'Professional',
    description: 'For growing businesses that need more power and flexibility',
    price: 79.99,
    currency: 'USD',
    interval: 'monthly',
    features: {
      contacts: 10000,
      whatsapp_accounts: 3,
      messages_per_month: 25000,
      campaigns: true,
      flows: true,
      ai_chatbot: true,
      team_members: 10,
      support: 'priority',
    },
    is_active: true,
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    description: 'For large organizations with advanced needs',
    price: 199.99,
    currency: 'USD',
    interval: 'monthly',
    features: {
      contacts: 'unlimited',
      whatsapp_accounts: 'unlimited',
      messages_per_month: 'unlimited',
      campaigns: true,
      flows: true,
      ai_chatbot: true,
      team_members: 'unlimited',
      support: 'dedicated',
      custom_integrations: true,
      white_label: true,
    },
    is_active: true,
  },
];

async function seedSubscriptionPlans() {
  console.log('Seeding subscription plans...');

  for (const plan of plans) {
    await prisma.subscription_plans.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
    console.log(`✓ Created/Updated plan: ${plan.name}`);
  }

  console.log('Subscription plans seeded successfully!');
}

export default seedSubscriptionPlans;
