-- CreateEnum
CREATE TYPE "ChatbotConversationStatus" AS ENUM ('Active', 'Completed', 'Timeout', 'HandedOff');

-- CreateTable
CREATE TABLE "chatbots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "ai_provider_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system_prompt" TEXT NOT NULL,
    "welcome_message" TEXT,
    "fallback_message" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "triggers" JSONB NOT NULL DEFAULT '{}',
    "conversation_timeout" INTEGER NOT NULL DEFAULT 60,
    "max_conversation_turns" INTEGER NOT NULL DEFAULT 10,
    "context_window" INTEGER NOT NULL DEFAULT 5,
    "total_conversations" INTEGER NOT NULL DEFAULT 0,
    "total_messages" INTEGER NOT NULL DEFAULT 0,
    "avg_response_time" INTEGER,
    "avg_satisfaction_score" DECIMAL(3,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_conversations" (
    "id" TEXT NOT NULL,
    "chatbot_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "status" "ChatbotConversationStatus" NOT NULL DEFAULT 'Active',
    "turn_count" INTEGER NOT NULL DEFAULT 0,
    "satisfaction_score" INTEGER,
    "handoff_reason" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "chatbot_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_messages" (
    "id" TEXT NOT NULL,
    "chatbot_conversation_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "response_time" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatbot_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chatbots_user_id_account_id_is_active_idx" ON "chatbots"("user_id", "account_id", "is_active");

-- CreateIndex
CREATE INDEX "chatbots_user_id_idx" ON "chatbots"("user_id");

-- CreateIndex
CREATE INDEX "chatbots_account_id_idx" ON "chatbots"("account_id");

-- CreateIndex
CREATE INDEX "chatbots_ai_provider_id_idx" ON "chatbots"("ai_provider_id");

-- CreateIndex
CREATE INDEX "chatbot_conversations_chatbot_id_status_idx" ON "chatbot_conversations"("chatbot_id", "status");

-- CreateIndex
CREATE INDEX "chatbot_conversations_contact_id_idx" ON "chatbot_conversations"("contact_id");

-- CreateIndex
CREATE INDEX "chatbot_conversations_conversation_id_idx" ON "chatbot_conversations"("conversation_id");

-- CreateIndex
CREATE INDEX "chatbot_messages_chatbot_conversation_id_idx" ON "chatbot_messages"("chatbot_conversation_id");

-- CreateIndex
CREATE INDEX "chatbot_messages_message_id_idx" ON "chatbot_messages"("message_id");

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "whatsapp_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_ai_provider_id_fkey" FOREIGN KEY ("ai_provider_id") REFERENCES "ai_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_conversations" ADD CONSTRAINT "chatbot_conversations_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_conversations" ADD CONSTRAINT "chatbot_conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_conversations" ADD CONSTRAINT "chatbot_conversations_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_chatbot_conversation_id_fkey" FOREIGN KEY ("chatbot_conversation_id") REFERENCES "chatbot_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
