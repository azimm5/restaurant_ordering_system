/*
  Warnings:

  - You are about to drop the column `max_order_value` on the `delivery_fee_rule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "delivery_fee_rule" DROP COLUMN "max_order_value";
