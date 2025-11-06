-- CreateTable
CREATE TABLE "ai_providers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "credentials" JSONB NOT NULL,
    "model_config" JSONB NOT NULL DEFAULT '{}',
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_providers_user_id_provider_idx" ON "ai_providers"("user_id", "provider");

-- CreateIndex
CREATE INDEX "ai_providers_user_id_idx" ON "ai_providers"("user_id");

-- AddForeignKey
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
