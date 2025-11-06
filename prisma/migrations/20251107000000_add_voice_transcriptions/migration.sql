-- CreateEnum
CREATE TYPE "TranscriptionProvider" AS ENUM ('WhisperAPI', 'WhisperCpp', 'GoogleSTT', 'AssemblyAI');

-- CreateTable
CREATE TABLE "voice_transcriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "audio_url" TEXT NOT NULL,
    "transcription" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "provider" "TranscriptionProvider" NOT NULL,
    "confidence" DECIMAL(3,2),
    "processing_time" INTEGER NOT NULL,
    "cost" DECIMAL(10,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voice_transcriptions_message_id_key" ON "voice_transcriptions"("message_id");

-- CreateIndex
CREATE INDEX "voice_transcriptions_user_id_idx" ON "voice_transcriptions"("user_id");

-- CreateIndex
CREATE INDEX "voice_transcriptions_message_id_idx" ON "voice_transcriptions"("message_id");

-- AddForeignKey
ALTER TABLE "voice_transcriptions" ADD CONSTRAINT "voice_transcriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
