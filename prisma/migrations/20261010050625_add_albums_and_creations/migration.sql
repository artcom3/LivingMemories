-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ContextStatus" AS ENUM ('NO_CONTEXT', 'CONTEXT_ADDED');

-- CreateEnum
CREATE TYPE "CreationType" AS ENUM ('SONG', 'VIDEO', 'COMIC', 'MANGA', 'BOOK');

-- CreateEnum
CREATE TYPE "CreationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "album" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_asset" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "size" INTEGER,
    "contextStatus" "ContextStatus" NOT NULL DEFAULT 'NO_CONTEXT',
    "contextDescription" TEXT,
    "peopleTags" TEXT,
    "locationTag" TEXT,
    "dateTag" TEXT,
    "emotionTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CreationType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CreationStatus" NOT NULL DEFAULT 'COMPLETED',
    "prompt" TEXT,
    "genreOrStyle" TEXT,
    "resultUrl" TEXT,
    "coverUrl" TEXT,
    "waveformJson" TEXT,
    "pagesJson" TEXT,
    "sourceAssetIds" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "album_userId_idx" ON "album"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_fileKey_key" ON "media_asset"("fileKey");

-- CreateIndex
CREATE INDEX "media_asset_albumId_idx" ON "media_asset"("albumId");

-- CreateIndex
CREATE INDEX "creation_userId_idx" ON "creation"("userId");

-- AddForeignKey
ALTER TABLE "album" ADD CONSTRAINT "album_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creation" ADD CONSTRAINT "creation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
