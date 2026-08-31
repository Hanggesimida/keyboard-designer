-- CreateTable
CREATE TABLE "FontBlob" (
    "id" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "cosKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "familyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FontBlob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFont" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blobId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFont_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FontBlob_contentHash_key" ON "FontBlob"("contentHash");

-- CreateIndex
CREATE INDEX "UserFont_userId_deletedAt_idx" ON "UserFont"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserFont_userId_blobId_key" ON "UserFont"("userId", "blobId");

-- AddForeignKey
ALTER TABLE "UserFont" ADD CONSTRAINT "UserFont_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFont" ADD CONSTRAINT "UserFont_blobId_fkey" FOREIGN KEY ("blobId") REFERENCES "FontBlob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
