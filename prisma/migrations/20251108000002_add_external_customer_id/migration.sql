-- Add external_customer_id to subscriptions table
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "external_customer_id" TEXT;

-- Add index for external_customer_id
CREATE INDEX IF NOT EXISTS "subscriptions_external_customer_id_idx" ON "subscriptions"("external_customer_id");

-- Add sent_at column to invoices if it doesn't exist
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMP(3);
