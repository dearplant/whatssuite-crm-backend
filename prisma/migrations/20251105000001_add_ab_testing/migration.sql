-- Add A/B testing fields to campaigns table
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "is_ab_test" BOOLEAN DEFAULT false;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "ab_test_config" JSONB;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "winning_variant_id" TEXT;

-- Add variant tracking to campaign_messages table
ALTER TABLE "campaign_messages" ADD COLUMN IF NOT EXISTS "variant_id" TEXT;

-- Add indexes for A/B testing queries
CREATE INDEX IF NOT EXISTS "campaigns_is_ab_test_idx" ON "campaigns"("is_ab_test");
CREATE INDEX IF NOT EXISTS "campaign_messages_variant_id_idx" ON "campaign_messages"("variant_id");
