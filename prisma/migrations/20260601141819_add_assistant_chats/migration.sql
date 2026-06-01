-- CreateTable
CREATE TABLE "assistant_chats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_messages" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ollamaUsed" BOOLEAN NOT NULL DEFAULT false,
    "proposals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_chats_userId_idx" ON "assistant_chats"("userId");

-- CreateIndex
CREATE INDEX "assistant_chats_updatedAt_idx" ON "assistant_chats"("updatedAt");

-- CreateIndex
CREATE INDEX "assistant_messages_chatId_idx" ON "assistant_messages"("chatId");

-- AddForeignKey
ALTER TABLE "assistant_chats" ADD CONSTRAINT "assistant_chats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "assistant_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
