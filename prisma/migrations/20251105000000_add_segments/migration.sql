-- CreateTable
CREATE TABLE "segments" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "contact_count" INTEGER NOT NULL DEFAULT 0,
    "last_calculated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "segments_team_id_idx" ON "segments"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "segments_team_id_name_key" ON "segments"("team_id", "name");

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
