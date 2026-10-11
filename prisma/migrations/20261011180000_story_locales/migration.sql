-- CreateTable
CREATE TABLE "story_locale" (
    "id" TEXT NOT NULL,
    "creationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "status" "CreationStatus" NOT NULL DEFAULT 'QUEUED',
    "baseDraft" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "draft" JSONB,
    "artifacts" JSONB NOT NULL DEFAULT '[]',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_locale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_locale_status_idx" ON "story_locale"("status");

-- CreateIndex
CREATE UNIQUE INDEX "story_locale_creationId_language_key" ON "story_locale"("creationId", "language");

-- AddForeignKey
ALTER TABLE "story_locale" ADD CONSTRAINT "story_locale_creationId_fkey" FOREIGN KEY ("creationId") REFERENCES "creation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

