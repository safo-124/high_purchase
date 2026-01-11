-- Migration: Add shop product inventory
-- This migration moves products from shop-level to business-level
-- and creates ShopProduct for shop-specific stock tracking

-- Step 1: Add businessId column (nullable first)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "businessId" TEXT;

-- Step 2: Populate businessId from shop's businessId
UPDATE "Product" p
SET "businessId" = s."businessId"
FROM "Shop" s
WHERE p."shopId" = s.id;

-- Step 3: Make businessId required
ALTER TABLE "Product" ALTER COLUMN "businessId" SET NOT NULL;

-- Step 4: Create ShopProduct table
CREATE TABLE IF NOT EXISTS "ShopProduct" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(12,2),
    "cashPrice" DECIMAL(12,2),
    "layawayPrice" DECIMAL(12,2),
    "creditPrice" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

-- Step 5: Migrate existing products to ShopProduct
INSERT INTO "ShopProduct" ("id", "shopId", "productId", "stockQuantity", "isActive", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    "shopId",
    "id",
    "stockQuantity",
    "isActive",
    "createdAt",
    CURRENT_TIMESTAMP
FROM "Product"
WHERE "shopId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 6: Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "ShopProduct_shopId_productId_key" ON "ShopProduct"("shopId", "productId");
CREATE INDEX IF NOT EXISTS "ShopProduct_shopId_idx" ON "ShopProduct"("shopId");
CREATE INDEX IF NOT EXISTS "ShopProduct_productId_idx" ON "ShopProduct"("productId");
CREATE INDEX IF NOT EXISTS "ShopProduct_isActive_idx" ON "ShopProduct"("isActive");

-- Step 7: Add foreign keys
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Update Product indexes
CREATE INDEX IF NOT EXISTS "Product_businessId_idx" ON "Product"("businessId");

-- Step 9: Add foreign key for businessId
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Update unique constraint for SKU (change from shopId to businessId)
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_shopId_sku_key";
-- Note: We'll need to handle duplicate SKUs across shops manually if any exist

-- Step 11: Remove stockQuantity from Product (now in ShopProduct) - but keep for backwards compat
-- ALTER TABLE "Product" DROP COLUMN IF EXISTS "stockQuantity";

-- Step 12: Drop shopId from Product (optional - do this after code is updated)
-- ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_shopId_fkey";
-- ALTER TABLE "Product" DROP COLUMN IF EXISTS "shopId";
