-- CreateEnum
CREATE TYPE "MemorySourceType" AS ENUM ('PHOTO', 'AUDIO', 'TEXT');

-- CreateTable
CREATE TABLE "memory_collection" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "narratorProfileId" TEXT,
    "collectionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "trashedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_source" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "type" "MemorySourceType" NOT NULL,
    "originalName" TEXT NOT NULL,
    "originalText" TEXT,
    "fileKey" TEXT,
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "contextDescription" TEXT,
    "peopleContext" TEXT,
    "locationContext" TEXT,
    "dateContext" TEXT,
    "emotionContext" TEXT,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_preparation" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "readerProfile" TEXT NOT NULL DEFAULT 'AGE_5_8',
    "pages" INTEGER NOT NULL DEFAULT 6,
    "instructions" TEXT,
    "genericCharacters" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_preparation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_preparation_source" (
    "preparationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "story_preparation_source_pkey" PRIMARY KEY ("preparationId","sourceId")
);

-- CreateIndex
CREATE INDEX "memory_collection_familyId_createdById_idx" ON "memory_collection"("familyId", "createdById");

-- CreateIndex
CREATE INDEX "memory_familyId_createdById_trashedAt_idx" ON "memory"("familyId", "createdById", "trashedAt");

-- CreateIndex
CREATE UNIQUE INDEX "memory_source_fileKey_key" ON "memory_source"("fileKey");

-- CreateIndex
CREATE INDEX "memory_source_memoryId_withdrawnAt_idx" ON "memory_source"("memoryId", "withdrawnAt");

-- CreateIndex
CREATE INDEX "story_preparation_familyId_createdById_idx" ON "story_preparation"("familyId", "createdById");

-- AddForeignKey
ALTER TABLE "memory_collection" ADD CONSTRAINT "memory_collection_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_collection" ADD CONSTRAINT "memory_collection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory" ADD CONSTRAINT "memory_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory" ADD CONSTRAINT "memory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory" ADD CONSTRAINT "memory_narratorProfileId_fkey" FOREIGN KEY ("narratorProfileId") REFERENCES "person_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory" ADD CONSTRAINT "memory_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "memory_collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory_source" ADD CONSTRAINT "memory_source_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "memory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_preparation" ADD CONSTRAINT "story_preparation_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_preparation" ADD CONSTRAINT "story_preparation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_preparation" ADD CONSTRAINT "story_preparation_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "memory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_preparation_source" ADD CONSTRAINT "story_preparation_source_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "story_preparation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_preparation_source" ADD CONSTRAINT "story_preparation_source_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "memory_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
