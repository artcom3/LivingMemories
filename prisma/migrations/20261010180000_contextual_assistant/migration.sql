-- CreateTable
CREATE TABLE "assistant_document" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourceVersion" TIMESTAMP(3) NOT NULL,
    "memoryVersion" TIMESTAMP(3) NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "category" TEXT NOT NULL DEFAULT 'TESTIMONY',
    "derived" JSONB,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_passage" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "locator" JSONB NOT NULL,
    "embedding" vector(1536),

    CONSTRAINT "assistant_passage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_fragment" (
    "id" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "assistant_fragment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_conversation" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "contextRevision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_turn" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "context" JSONB NOT NULL,
    "contextRevision" INTEGER NOT NULL,
    "destinations" JSONB NOT NULL DEFAULT '[]',
    "model" TEXT NOT NULL DEFAULT 'gpt-6-luna',
    "instructionsVersion" TEXT NOT NULL DEFAULT 'assistant-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_turn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_citation" (
    "id" TEXT NOT NULL,
    "turnId" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,

    CONSTRAINT "assistant_citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_voice_session" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "providerConversationId" TEXT,
    "reservationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONNECTING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_voice_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_reservation" (
    "id" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "reservedCents" INTEGER NOT NULL,
    "actualCents" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assistant_document_sourceId_key" ON "assistant_document"("sourceId");

-- CreateIndex
CREATE INDEX "assistant_document_familyId_status_idx" ON "assistant_document"("familyId", "status");

-- CreateIndex
CREATE INDEX "assistant_passage_documentId_idx" ON "assistant_passage"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_fragment_passageId_key" ON "assistant_fragment"("passageId");

-- CreateIndex
CREATE INDEX "assistant_conversation_familyId_userId_updatedAt_idx" ON "assistant_conversation"("familyId", "userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_turn_conversationId_requestKey_key" ON "assistant_turn"("conversationId", "requestKey");

-- CreateIndex
CREATE INDEX "assistant_citation_passageId_idx" ON "assistant_citation"("passageId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_voice_session_tokenHash_key" ON "assistant_voice_session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_voice_session_providerConversationId_key" ON "assistant_voice_session"("providerConversationId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_voice_session_reservationId_key" ON "assistant_voice_session"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "usage_reservation_operationKey_key" ON "usage_reservation"("operationKey");

-- CreateIndex
CREATE INDEX "usage_reservation_createdAt_familyId_userId_idx" ON "usage_reservation"("createdAt", "familyId", "userId");

-- AddForeignKey
ALTER TABLE "assistant_passage" ADD CONSTRAINT "assistant_passage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "assistant_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_fragment" ADD CONSTRAINT "assistant_fragment_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "assistant_passage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_turn" ADD CONSTRAINT "assistant_turn_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "assistant_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_citation" ADD CONSTRAINT "assistant_citation_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "assistant_turn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_voice_session" ADD CONSTRAINT "assistant_voice_session_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "assistant_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Evidence is removed with its original; publication never expands the original URL.
ALTER TABLE assistant_document ADD CONSTRAINT assistant_document_source_fk FOREIGN KEY ("sourceId") REFERENCES memory_source(id) ON DELETE CASCADE;
ALTER TABLE assistant_conversation ADD CONSTRAINT assistant_conversation_user_fk FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
ALTER TABLE assistant_conversation ADD CONSTRAINT assistant_conversation_family_fk FOREIGN KEY ("familyId") REFERENCES family(id) ON DELETE CASCADE;
ALTER TABLE usage_reservation ADD CONSTRAINT usage_reservation_nonnegative CHECK ("reservedCents" >= 0 AND ("actualCents" IS NULL OR "actualCents" >= 0));
CREATE INDEX assistant_passage_text_idx ON assistant_passage USING gin (to_tsvector('simple', text));
CREATE INDEX assistant_passage_vector_idx ON assistant_passage USING hnsw (embedding vector_cosine_ops);
