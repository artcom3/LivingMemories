-- CreateEnum
CREATE TYPE "CreationKind" AS ENUM ('STORY', 'MUSIC');

-- CreateEnum
CREATE TYPE "CreationStatus" AS ENUM ('QUEUED', 'ANALYZING', 'REVIEW', 'RENDER_QUEUED', 'RENDERING', 'READY', 'FAILED');

-- AlterEnum
ALTER TYPE "MemorySourceType" ADD VALUE 'VIDEO';

-- AlterTable
ALTER TABLE "story_preparation" ADD COLUMN     "illustrate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "narrate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "narrativeStyle" TEXT NOT NULL DEFAULT 'CHILDREN',
ADD COLUMN     "visualStyle" TEXT NOT NULL DEFAULT 'WATERCOLOR';

-- CreateTable
CREATE TABLE "music_preparation" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "style" TEXT NOT NULL DEFAULT 'ACOUSTIC',
    "instrumental" BOOLEAN NOT NULL DEFAULT true,
    "durationSeconds" INTEGER NOT NULL DEFAULT 30,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_preparation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "music_preparation_source" (
    "preparationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "music_preparation_source_pkey" PRIMARY KEY ("preparationId","sourceId")
);

-- CreateTable
CREATE TABLE "creation" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "kind" "CreationKind" NOT NULL,
    "status" "CreationStatus" NOT NULL DEFAULT 'QUEUED',
    "storyPreparationId" TEXT,
    "musicPreparationId" TEXT,
    "settings" JSONB NOT NULL,
    "evidence" JSONB,
    "draft" JSONB,
    "artifacts" JSONB NOT NULL DEFAULT '[]',
    "reservedCents" INTEGER NOT NULL DEFAULT 500,
    "errorMessage" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creation_source" (
    "creationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "creation_source_pkey" PRIMARY KEY ("creationId","sourceId")
);

-- CreateIndex
CREATE INDEX "music_preparation_familyId_createdById_idx" ON "music_preparation"("familyId", "createdById");

-- CreateIndex
CREATE INDEX "creation_familyId_createdById_createdAt_idx" ON "creation"("familyId", "createdById", "createdAt");

-- CreateIndex
CREATE INDEX "creation_status_idx" ON "creation"("status");

-- AddForeignKey
ALTER TABLE "music_preparation" ADD CONSTRAINT "music_preparation_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "music_preparation" ADD CONSTRAINT "music_preparation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "music_preparation_source" ADD CONSTRAINT "music_preparation_source_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "music_preparation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "music_preparation_source" ADD CONSTRAINT "music_preparation_source_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "memory_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creation" ADD CONSTRAINT "creation_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creation" ADD CONSTRAINT "creation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creation" ADD CONSTRAINT "creation_storyPreparationId_fkey" FOREIGN KEY ("storyPreparationId") REFERENCES "story_preparation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creation" ADD CONSTRAINT "creation_musicPreparationId_fkey" FOREIGN KEY ("musicPreparationId") REFERENCES "music_preparation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creation_source" ADD CONSTRAINT "creation_source_creationId_fkey" FOREIGN KEY ("creationId") REFERENCES "creation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creation_source" ADD CONSTRAINT "creation_source_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "memory_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

