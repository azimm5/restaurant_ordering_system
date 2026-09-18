/*
  Warnings:

  - A unique constraint covering the columns `[member_id]` on the table `cart` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cart_id,product_id]` on the table `cart_item` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "cart_member_id_key" ON "cart"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_cart_product_unique" ON "cart_item"("cart_id", "product_id");
