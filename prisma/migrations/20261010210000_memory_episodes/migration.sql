-- AlterTable
ALTER TABLE "story_preparation" ADD COLUMN     "episodeId" TEXT;

-- AlterTable
ALTER TABLE "music_preparation" ADD COLUMN     "episodeId" TEXT;

-- AlterTable
ALTER TABLE "creation" ADD COLUMN     "episodeId" TEXT;

-- CreateTable
CREATE TABLE "source_story_analysis" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "sourceVersion" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transcript" TEXT,
    "timestamps" JSONB,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_story_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_episode" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceVersion" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "audioStart" DOUBLE PRECISION,
    "audioEnd" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_episode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_story_analysis_sourceId_key" ON "source_story_analysis"("sourceId");

-- CreateIndex
CREATE INDEX "source_story_analysis_status_idx" ON "source_story_analysis"("status");

-- CreateIndex
CREATE UNIQUE INDEX "memory_episode_sourceId_sourceVersion_startOffset_endOffset_key" ON "memory_episode"("sourceId", "sourceVersion", "startOffset", "endOffset");

-- AddForeignKey
ALTER TABLE "story_preparation" ADD CONSTRAINT "story_preparation_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "memory_episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "music_preparation" ADD CONSTRAINT "music_preparation_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "memory_episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creation" ADD CONSTRAINT "creation_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "memory_episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_story_analysis" ADD CONSTRAINT "source_story_analysis_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "memory_source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_episode" ADD CONSTRAINT "memory_episode_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "memory_source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

