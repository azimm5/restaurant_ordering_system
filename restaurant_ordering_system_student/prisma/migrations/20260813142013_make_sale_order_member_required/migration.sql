/*
  Warnings:

  - Made the column `member_id` on table `sale_order` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "sale_order" ALTER COLUMN "member_id" SET NOT NULL;
