-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('EXTERNAL_API', 'FALLBACK', 'MANUAL');

-- CreateTable
CREATE TABLE "TokenPrice" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "price" DECIMAL(24,18) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "PriceSource" NOT NULL DEFAULT 'EXTERNAL_API',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenPrice_currency_key" ON "TokenPrice"("currency");

-- CreateIndex
CREATE INDEX "TokenPrice_currency_idx" ON "TokenPrice"("currency");

-- CreateIndex
CREATE INDEX "TokenPrice_updatedAt_idx" ON "TokenPrice"("updatedAt");
