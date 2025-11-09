-- CreateEnum
CREATE TYPE "SnapshotType" AS ENUM ('Daily', 'Weekly', 'Monthly');

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "whatsapp_account_id" TEXT,
    "date" DATE NOT NULL,
    "snapshot_type" "SnapshotType" NOT NULL,
    "metrics" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_snapshots_team_id_date_idx" ON "analytics_snapshots"("team_id", "date");

-- CreateIndex
CREATE INDEX "analytics_snapshots_date_idx" ON "analytics_snapshots"("date");

-- CreateIndex
CREATE INDEX "analytics_snapshots_snapshot_type_idx" ON "analytics_snapshots"("snapshot_type");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_team_id_whatsapp_account_id_date_snapsho_key" ON "analytics_snapshots"("team_id", "whatsapp_account_id", "date", "snapshot_type");

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
