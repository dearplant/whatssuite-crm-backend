import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const owner = await prisma.user.upsert({
    where: { email: 'owner@whatsappcrm.com' },
    update: {},
    create: {
      email: 'owner@whatsappcrm.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Owner',
      role: 'Owner',
      isActive: true,
      isEmailVerified: true,
      language: 'en',
      timezone: 'UTC',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@whatsappcrm.com' },
    update: {},
    create: {
      email: 'admin@whatsappcrm.com',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Admin',
      role: 'Admin',
      isActive: true,
      isEmailVerified: true,
      language: 'en',
      timezone: 'UTC',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@whatsappcrm.com' },
    update: {},
    create: {
      email: 'manager@whatsappcrm.com',
      password: hashedPassword,
      firstName: 'Mike',
      lastName: 'Manager',
      role: 'Manager',
      isActive: true,
      isEmailVerified: true,
      language: 'en',
      timezone: 'UTC',
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@whatsappcrm.com' },
    update: {},
    create: {
      email: 'agent@whatsappcrm.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Agent',
      role: 'Agent',
      isActive: true,
      isEmailVerified: true,
      language: 'en',
      timezone: 'UTC',
    },
  });

  console.log('✅ Created demo users:');
  console.log('   Owner: owner@whatsappcrm.com / password123');
  console.log('   Admin: admin@whatsappcrm.com / password123');
  console.log('   Manager: manager@whatsappcrm.com / password123');
  console.log('   Agent: agent@whatsappcrm.com / password123');

  // Create subscription plans
  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'starter-plan-id' },
    update: {},
    create: {
      id: 'starter-plan-id',
      name: 'Starter',
      description: 'Perfect for small businesses getting started with WhatsApp CRM',
      amount: 29.99,
      currency: 'USD',
      interval: 'Month',
      intervalCount: 1,
      trialPeriodDays: 14,
      features: {
        whatsappAccounts: 1,
        contacts: 1000,
        messagesPerMonth: 5000,
        campaigns: 10,
        flows: 5,
        aiChatbots: 1,
        teamMembers: 3,
      },
      limits: {
        maxWhatsappAccounts: 1,
        maxContacts: 1000,
        maxMessagesPerMonth: 5000,
        maxCampaigns: 10,
        maxFlows: 5,
        maxAIChatbots: 1,
        maxTeamMembers: 3,
      },
      isActive: true,
    },
  });

  const professionalPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'professional-plan-id' },
    update: {},
    create: {
      id: 'professional-plan-id',
      name: 'Professional',
      description: 'For growing businesses with advanced automation needs',
      amount: 99.99,
      currency: 'USD',
      interval: 'Month',
      intervalCount: 1,
      trialPeriodDays: 14,
      features: {
        whatsappAccounts: 5,
        contacts: 10000,
        messagesPerMonth: 50000,
        campaigns: 'unlimited',
        flows: 'unlimited',
        aiChatbots: 5,
        teamMembers: 10,
        ecommerceIntegration: true,
        advancedAnalytics: true,
      },
      limits: {
        maxWhatsappAccounts: 5,
        maxContacts: 10000,
        maxMessagesPerMonth: 50000,
        maxCampaigns: -1,
        maxFlows: -1,
        maxAIChatbots: 5,
        maxTeamMembers: 10,
      },
      isActive: true,
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'enterprise-plan-id' },
    update: {},
    create: {
      id: 'enterprise-plan-id',
      name: 'Enterprise',
      description: 'For large organizations with custom requirements',
      amount: 299.99,
      currency: 'USD',
      interval: 'Month',
      intervalCount: 1,
      trialPeriodDays: 30,
      features: {
        whatsappAccounts: 'unlimited',
        contacts: 'unlimited',
        messagesPerMonth: 'unlimited',
        campaigns: 'unlimited',
        flows: 'unlimited',
        aiChatbots: 'unlimited',
        teamMembers: 'unlimited',
        ecommerceIntegration: true,
        advancedAnalytics: true,
        customIntegrations: true,
        dedicatedSupport: true,
        sla: '99.9%',
      },
      limits: {
        maxWhatsappAccounts: -1,
        maxContacts: -1,
        maxMessagesPerMonth: -1,
        maxCampaigns: -1,
        maxFlows: -1,
        maxAIChatbots: -1,
        maxTeamMembers: -1,
      },
      isActive: true,
    },
  });

  console.log('✅ Created subscription plans:');
  console.log('   Starter: $29.99/month');
  console.log('   Professional: $99.99/month');
  console.log('   Enterprise: $299.99/month');

  // Create sample WhatsApp account for owner
  const whatsappAccount = await prisma.whatsAppAccount.create({
    data: {
      userId: owner.id,
      phoneNumber: '+1234567890',
      displayName: 'Demo Business',
      connectionStatus: 'Disconnected',
      healthStatus: 'Healthy',
      dailyLimit: 1000,
      isActive: true,
    },
  });

  console.log('✅ Created sample WhatsApp account:', whatsappAccount.phoneNumber);

  // Create sample contacts
  const contacts = await prisma.contact.createMany({
    data: [
      {
        userId: owner.id,
        whatsappAccountId: whatsappAccount.id,
        phone: '+1234567891',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        company: 'Tech Corp',
        tags: ['customer', 'vip'],
        source: 'Manual',
        customFields: { industry: 'Technology', size: 'Medium' },
      },
      {
        userId: owner.id,
        whatsappAccountId: whatsappAccount.id,
        phone: '+1234567892',
        name: 'Bob Smith',
        email: 'bob@example.com',
        company: 'Retail Inc',
        tags: ['lead', 'interested'],
        source: 'Import',
        customFields: { industry: 'Retail', size: 'Small' },
      },
      {
        userId: owner.id,
        whatsappAccountId: whatsappAccount.id,
        phone: '+1234567893',
        name: 'Carol Williams',
        email: 'carol@example.com',
        tags: ['customer'],
        source: 'WhatsApp',
        customFields: { industry: 'Healthcare' },
      },
    ],
  });

  console.log('✅ Created sample contacts:', contacts.count);

  // Create sample campaign
  const campaign = await prisma.campaign.create({
    data: {
      userId: owner.id,
      whatsappAccountId: whatsappAccount.id,
      name: 'Welcome Campaign',
      description: 'Welcome new customers to our service',
      type: 'Broadcast',
      status: 'Draft',
      message: 'Hello {{name}}! Welcome to our service. We\'re excited to have you on board!',
      totalRecipients: 0,
      rateLimitPerMinute: 20,
    },
  });

  console.log('✅ Created sample campaign:', campaign.name);

  // Create sample flow
  const flow = await prisma.flow.create({
    data: {
      userId: owner.id,
      name: 'Lead Nurturing Flow',
      description: 'Automated flow to nurture new leads',
      trigger: {
        type: 'tag_added',
        value: 'lead',
      },
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          data: { event: 'tag_added', tag: 'lead' },
        },
        {
          id: 'wait-1',
          type: 'wait',
          data: { duration: 60, unit: 'minutes' },
        },
        {
          id: 'message-1',
          type: 'send_message',
          data: { message: 'Hi {{name}}, thanks for your interest!' },
        },
      ],
      edges: [
        { source: 'trigger-1', target: 'wait-1' },
        { source: 'wait-1', target: 'message-1' },
      ],
      isActive: false,
    },
  });

  console.log('✅ Created sample flow:', flow.name);

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📝 Summary:');
  console.log('   - 4 demo users (Owner, Admin, Manager, Agent)');
  console.log('   - 3 subscription plans (Starter, Professional, Enterprise)');
  console.log('   - 1 WhatsApp account');
  console.log('   - 3 sample contacts');
  console.log('   - 1 sample campaign');
  console.log('   - 1 sample flow');
  console.log('\n🔐 Login credentials:');
  console.log('   Email: owner@whatsappcrm.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
