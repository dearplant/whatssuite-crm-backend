-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('Overview', 'Messages', 'Campaigns', 'Contacts', 'Revenue', 'Chatbots', 'Flows', 'Custom');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('CSV', 'PDF', 'Excel');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('Pending', 'Processing', 'Completed', 'Failed', 'Expired');

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'Pending',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "schedule" JSONB,
    "file_url" TEXT,
    "file_size" INTEGER,
    "error_message" TEXT,
    "generated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_team_id_idx" ON "reports"("team_id");

-- CreateIndex
CREATE INDEX "reports_user_id_idx" ON "reports"("user_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

-- CreateIndex
CREATE INDEX "reports_expires_at_idx" ON "reports"("expires_at");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
