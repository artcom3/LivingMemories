ALTER TABLE "person_profile"
  ADD COLUMN "voiceId" TEXT,
  ADD COLUMN "voiceStatus" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN "voiceOperation" TEXT,
  ADD COLUMN "voiceStartedAt" TIMESTAMP(3),
  ADD COLUMN "voiceLanguage" TEXT,
  ADD COLUMN "voiceSampleKey" TEXT,
  ADD COLUMN "voicePreviewKey" TEXT,
  ADD COLUMN "voiceConsentAt" TIMESTAMP(3),
  ADD COLUMN "voiceConsentById" TEXT;
