import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Encryption utility (matching your backend encryption)
function encrypt(text) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '4cb257a88a6de8726a403964a67f16e14911ad719a55ec735f114fd209ca9124', 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

async function seedPaymentData() {
  console.log('🌱 Starting payment data seeding...');

  try {
    // 1. Get or create a test user and team
    console.log('📝 Creating test user and team...');
    
    let user = await prisma.users.findUnique({
      where: { email: 'test@example.com' },
    });

    if (!user) {
      user = await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email: 'test@example.com',
          password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456', // dummy hash
          first_name: 'Test',
          last_name: 'User',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    let team = await prisma.teams.findFirst({
      where: { name: 'Test Team' },
    });

    if (!team) {
      team = await prisma.teams.create({
        data: {
          id: crypto.randomUUID(),
          name: 'Test Team',
          slug: 'test-team',
          owner_id: user.id,
          created_at: new Date(),
        },
      });

      await prisma.team_members.create({
        data: {
          id: crypto.randomUUID(),
          team_id: team.id,
          user_id: user.id,
          role: 'Owner',
          joined_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    console.log(`✅ User: ${user.email}, Team: ${team.name}`);

    // 2. Create Payment Gateways
    console.log('💳 Creating payment gateways...');
    
    const stripeCredentials = encrypt(JSON.stringify({
      secret_key: process.env.STRIPE_SECRET_KEY || 'sk_test_dummy',
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy',
    }));

    const stripeGateway = await prisma.payment_gateways.create({
      data: {
        id: crypto.randomUUID(),
        team_id: team.id,
        provider: 'Stripe',
        credentials_encrypted: JSON.stringify(stripeCredentials),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const paypalCredentials = encrypt(JSON.stringify({
      client_id: process.env.PAYPAL_CLIENT_ID || 'paypal_client_dummy',
      client_secret: process.env.PAYPAL_CLIENT_SECRET || 'paypal_secret_dummy',
      mode: 'sandbox',
    }));

    const paypalGateway = await prisma.payment_gateways.create({
      data: {
        id: crypto.randomUUID(),
        team_id: team.id,
        provider: 'PayPal',
        credentials_encrypted: JSON.stringify(paypalCredentials),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log(`✅ Created gateways: Stripe, PayPal`);

    // 3. Create Subscription Plans
    console.log('📋 Creating subscription plans...');
    
    const basicPlan = await prisma.subscription_plans.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Basic Plan',
        description: 'Perfect for small businesses',
        price: 19.99,
        currency: 'USD',
        interval: 'month',
        features: ['1000 messages/month', 'Basic analytics', 'Email support'],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const proPlan = await prisma.subscription_plans.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Pro Plan',
        description: 'For growing businesses',
        price: 49.99,
        currency: 'USD',
        interval: 'month',
        features: ['10000 messages/month', 'Advanced analytics', 'Priority support', 'API access'],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const enterprisePlan = await prisma.subscription_plans.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Enterprise Plan',
        description: 'For large organizations',
        price: 199.99,
        currency: 'USD',
        interval: 'month',
        features: ['Unlimited messages', 'Custom analytics', 'Dedicated support', 'White-label', 'SLA'],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log(`✅ Created plans: Basic, Pro, Enterprise`);

    // 4. Create Subscriptions
    console.log('🔄 Creating subscriptions...');
    
    const activeSubscription = await prisma.subscriptions.create({
      data: {
        id: crypto.randomUUID(),
        team_id: team.id,
        plan_id: proPlan.id,
        gateway_id: stripeGateway.id,
        external_subscription_id: 'sub_' + crypto.randomBytes(12).toString('hex'),
        status: 'Active',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        cancel_at_period_end: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const trialSubscription = await prisma.subscriptions.create({
      data: {
        id: crypto.randomUUID(),
        team_id: team.id,
        plan_id: basicPlan.id,
        gateway_id: paypalGateway.id,
        external_subscription_id: 'sub_' + crypto.randomBytes(12).toString('hex'),
        status: 'Trialing',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        cancel_at_period_end: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log(`✅ Created subscriptions: Active, Trialing`);

    // 5. Create Payments
    console.log('💰 Creating payments...');
    
    const completedPayment = await prisma.payments.create({
      data: {
        id: crypto.randomUUID(),
        team_id: team.id,
        subscription_id: activeSubscription.id,
        gateway_id: stripeGateway.id,
        external_payment_id: 'pi_' + crypto.randomBytes(12).toString('hex'),
        amount: 49.99,
        currency: 'USD',
        status: 'Completed',
        payment_method: 'card',
        metadata: { card_last4: '4242', card_brand: 'visa' },
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });

    const pendingPayment = await prisma.payments.create({
      data: {
        id: crypto.randomUUID(),
        team_id: team.id,
        subscription_id: activeSubscription.id,
        gateway_id: stripeGateway.id,
        external_payment_id: 'pi_' + crypto.randomBytes(12).toString('hex'),
        amount: 49.99,
        currency: 'USD',
        status: 'Pending',
        payment_method: 'card',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const failedPayment = await prisma.payments.create({
      data: {
        id: crypto.randomUUID(),
        team_id: team.id,
        gateway_id: paypalGateway.id,
        external_payment_id: 'pay_' + crypto.randomBytes(12).toString('hex'),
        amount: 19.99,
        currency: 'USD',
        status: 'Failed',
        payment_method: 'paypal',
        metadata: { error: 'Insufficient funds' },
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    console.log(`✅ Created payments: Completed, Pending, Failed`);

    // 6. Create Invoices
    console.log('📄 Creating invoices...');
    
    const paidInvoice = await prisma.invoices.create({
      data: {
        id: crypto.randomUUID(),
        team_id: team.id,
        subscription_id: activeSubscription.id,
        payment_id: completedPayment.id,
        gateway_id: stripeGateway.id,
        invoice_number: 'INV-2025-001',
        amount: 49.99,
        currency: 'USD',
        status: 'Paid',
        due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        paid_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        pdf_url: 'https://example.com/invoices/inv-001.pdf',
        metadata: {
          items: [
            { description: 'Pro Plan - Monthly', quantity: 1, unitPrice: 49.99 }
          ]
        },
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });

    const draftInvoice = await prisma.invoices.create({
      data: {
        id: crypto.randomUUID(),
        team_id: team.id,
        subscription_id: activeSubscription.id,
        gateway_id: stripeGateway.id,
        invoice_number: 'INV-2025-002',
        amount: 49.99,
        currency: 'USD',
        status: 'Draft',
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        metadata: {
          items: [
            { description: 'Pro Plan - Monthly', quantity: 1, unitPrice: 49.99 }
          ]
        },
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const overdueInvoice = await prisma.invoices.create({
      data: {
        id: crypto.randomUUID(),
        team_id: team.id,
        gateway_id: paypalGateway.id,
        invoice_number: 'INV-2025-003',
        amount: 19.99,
        currency: 'USD',
        status: 'Overdue',
        due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        metadata: {
          items: [
            { description: 'Basic Plan - Monthly', quantity: 1, unitPrice: 19.99 }
          ]
        },
        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      },
    });

    console.log(`✅ Created invoices: Paid, Draft, Overdue`);

    // Summary
    console.log('\n🎉 Payment data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - User: ${user.email}`);
    console.log(`   - Team: ${team.name}`);
    console.log(`   - Payment Gateways: 2 (Stripe, PayPal)`);
    console.log(`   - Subscription Plans: 3 (Basic, Pro, Enterprise)`);
    console.log(`   - Subscriptions: 2 (Active, Trialing)`);
    console.log(`   - Payments: 3 (Completed, Pending, Failed)`);
    console.log(`   - Invoices: 3 (Paid, Draft, Overdue)`);
    console.log('\n✅ You can now test all payment routes with real data!');

  } catch (error) {
    console.error('❌ Error seeding payment data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedPaymentData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
