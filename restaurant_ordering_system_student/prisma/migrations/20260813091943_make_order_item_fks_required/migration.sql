/*
  Warnings:

  - Made the column `order_id` on table `sale_order_item` required. This step will fail if there are existing NULL values in that column.
  - Made the column `product_id` on table `sale_order_item` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "sale_order_item" ALTER COLUMN "order_id" SET NOT NULL,
ALTER COLUMN "product_id" SET NOT NULL;
