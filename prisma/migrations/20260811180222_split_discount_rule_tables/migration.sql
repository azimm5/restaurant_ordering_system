/*
Warnings:

- You are about to drop the `product_discount_rule` table. If the table is not empty, all the data it contains will be lost.
*/

-- CreateTable
CREATE TABLE "product_quantity_discount_rule" (
    "rule_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "product_id" INTEGER NOT NULL,
    "min_quantity" INTEGER NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_quantity_discount_rule_pkey" PRIMARY KEY ("rule_id")
);

-- CreateTable
CREATE TABLE "cart_value_discount_rule" (
    "rule_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "min_cart_value" DECIMAL(10,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_value_discount_rule_pkey" PRIMARY KEY ("rule_id")
);

-- Migrate product-quantity discount rules
INSERT INTO "product_quantity_discount_rule"
    ("rule_id", "name", "product_id", "min_quantity", "discount_percent", "is_active", "created_at")
SELECT
    "discount_rule_id",
    "name",
    "product_id",
    "min_quantity",
    "discount_percent",
    "is_active",
    "created_at"
FROM "product_discount_rule"
WHERE "discount_type" = 'PRODUCT_QUANTITY';

-- Migrate cart-value discount rules
INSERT INTO "cart_value_discount_rule"
    ("rule_id", "name", "min_cart_value", "discount_percent", "is_active", "created_at")
SELECT
    "discount_rule_id",
    "name",
    "min_cart_value",
    "discount_percent",
    "is_active",
    "created_at"
FROM "product_discount_rule"
WHERE "discount_type" = 'CART_VALUE';

-- AddForeignKey
ALTER TABLE "product_quantity_discount_rule"
ADD CONSTRAINT "product_qty_rule_product_id_fk"
FOREIGN KEY ("product_id") REFERENCES "product"("product_id")
ON DELETE CASCADE ON UPDATE NO ACTION;

-- Re-apply the check constraints from the old table
ALTER TABLE "product_quantity_discount_rule"
ADD CONSTRAINT "product_qty_discount_percent_check"
CHECK ("discount_percent" >= 0 AND "discount_percent" <= 100);

ALTER TABLE "product_quantity_discount_rule"
ADD CONSTRAINT "product_qty_min_quantity_check"
CHECK ("min_quantity" > 0);

ALTER TABLE "cart_value_discount_rule"
ADD CONSTRAINT "cart_value_discount_percent_check"
CHECK ("discount_percent" >= 0 AND "discount_percent" <= 100);

ALTER TABLE "cart_value_discount_rule"
ADD CONSTRAINT "cart_value_min_cart_value_check"
CHECK ("min_cart_value" >= 0);

-- DropForeignKey
ALTER TABLE "product_discount_rule"
DROP CONSTRAINT "discount_rule_product_id_fk";

-- DropTable
DROP TABLE "product_discount_rule";