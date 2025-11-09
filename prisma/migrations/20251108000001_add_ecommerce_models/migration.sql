-- CreateEnum
CREATE TYPE "EcommerceProvider" AS ENUM ('Shopify', 'WooCommerce');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Pending', 'Processing', 'Completed', 'Cancelled', 'Refunded');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('Abandoned', 'Recovered', 'Completed', 'Expired');

-- CreateTable
CREATE TABLE "ecommerce_integrations" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "EcommerceProvider" NOT NULL,
    "store_url" TEXT NOT NULL,
    "store_name" TEXT,
    "access_token_encrypted" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT,
    "webhook_secret" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "last_sync_at" TIMESTAMP(3),
    "sync_error" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecommerce_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_orders" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "external_order_id" TEXT NOT NULL,
    "order_number" TEXT,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "customer_name" TEXT,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "OrderStatus" NOT NULL DEFAULT 'Pending',
    "items" JSONB DEFAULT '[]',
    "shipping_address" JSONB,
    "billing_address" JSONB,
    "tracking_number" TEXT,
    "tracking_url" TEXT,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecommerce_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abandoned_carts" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "external_cart_id" TEXT NOT NULL,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "customer_name" TEXT,
    "cart_url" TEXT,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "CartStatus" NOT NULL DEFAULT 'Abandoned',
    "items" JSONB DEFAULT '[]',
    "abandoned_at" TIMESTAMP(3) NOT NULL,
    "recovered_at" TIMESTAMP(3),
    "recovery_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_recovery_at" TIMESTAMP(3),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abandoned_carts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ecommerce_integrations_team_id_idx" ON "ecommerce_integrations"("team_id");

-- CreateIndex
CREATE INDEX "ecommerce_integrations_user_id_idx" ON "ecommerce_integrations"("user_id");

-- CreateIndex
CREATE INDEX "ecommerce_integrations_provider_idx" ON "ecommerce_integrations"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_integrations_team_id_provider_store_url_key" ON "ecommerce_integrations"("team_id", "provider", "store_url");

-- CreateIndex
CREATE INDEX "ecommerce_orders_team_id_idx" ON "ecommerce_orders"("team_id");

-- CreateIndex
CREATE INDEX "ecommerce_orders_integration_id_idx" ON "ecommerce_orders"("integration_id");

-- CreateIndex
CREATE INDEX "ecommerce_orders_contact_id_idx" ON "ecommerce_orders"("contact_id");

-- CreateIndex
CREATE INDEX "ecommerce_orders_status_idx" ON "ecommerce_orders"("status");

-- CreateIndex
CREATE INDEX "ecommerce_orders_created_at_idx" ON "ecommerce_orders"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_orders_integration_id_external_order_id_key" ON "ecommerce_orders"("integration_id", "external_order_id");

-- CreateIndex
CREATE INDEX "abandoned_carts_team_id_idx" ON "abandoned_carts"("team_id");

-- CreateIndex
CREATE INDEX "abandoned_carts_integration_id_idx" ON "abandoned_carts"("integration_id");

-- CreateIndex
CREATE INDEX "abandoned_carts_contact_id_idx" ON "abandoned_carts"("contact_id");

-- CreateIndex
CREATE INDEX "abandoned_carts_status_idx" ON "abandoned_carts"("status");

-- CreateIndex
CREATE INDEX "abandoned_carts_abandoned_at_idx" ON "abandoned_carts"("abandoned_at");

-- CreateIndex
CREATE UNIQUE INDEX "abandoned_carts_integration_id_external_cart_id_key" ON "abandoned_carts"("integration_id", "external_cart_id");

-- AddForeignKey
ALTER TABLE "ecommerce_integrations" ADD CONSTRAINT "ecommerce_integrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_integrations" ADD CONSTRAINT "ecommerce_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_orders" ADD CONSTRAINT "ecommerce_orders_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_orders" ADD CONSTRAINT "ecommerce_orders_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "ecommerce_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_orders" ADD CONSTRAINT "ecommerce_orders_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "ecommerce_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
