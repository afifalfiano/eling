-- CreateTable
CREATE TABLE "item_history" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_history_itemId_idx" ON "item_history"("itemId");

-- AddForeignKey
ALTER TABLE "item_history" ADD CONSTRAINT "item_history_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
