-- CreateTable
CREATE TABLE "product_discount_rule" (
    "discount_rule_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "discount_type" VARCHAR(20) NOT NULL,
    "product_id" INTEGER,
    "min_quantity" INTEGER,
    "min_cart_value" DECIMAL(10,2),
    "discount_percent" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_discount_rule_pkey" PRIMARY KEY ("discount_rule_id")
);

-- CreateTable
CREATE TABLE "delivery_fee_rule" (
    "delivery_fee_rule_id" SERIAL NOT NULL,
    "min_order_value" DECIMAL(10,2) NOT NULL,
    "max_order_value" DECIMAL(10,2),
    "delivery_fee" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_fee_rule_pkey" PRIMARY KEY ("delivery_fee_rule_id")
);

-- AddForeignKey
ALTER TABLE "product_discount_rule" ADD CONSTRAINT "discount_rule_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "product"("product_id") ON DELETE CASCADE ON UPDATE NO ACTION;
