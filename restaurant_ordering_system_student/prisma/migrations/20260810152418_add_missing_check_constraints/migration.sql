-- =========================
-- CART ITEM CONSTRAINTS
-- =========================

ALTER TABLE "cart_item"
ADD CONSTRAINT "cart_item_quantity_check"
CHECK ("quantity" > 0);

ALTER TABLE "cart_item"
ADD CONSTRAINT "cart_item_unit_price_check"
CHECK ("unit_price" >= 0);

ALTER TABLE "cart_item"
ADD CONSTRAINT "cart_item_subtotal_check"
CHECK ("subtotal" >= 0);


-- =========================
-- PRODUCT DISCOUNT RULE CONSTRAINTS
-- =========================

ALTER TABLE "product_discount_rule"
ADD CONSTRAINT "product_discount_percent_check"
CHECK ("discount_percent" >= 0 AND "discount_percent" <= 100);

ALTER TABLE "product_discount_rule"
ADD CONSTRAINT "product_discount_min_quantity_check"
CHECK ("min_quantity" IS NULL OR "min_quantity" > 0);

ALTER TABLE "product_discount_rule"
ADD CONSTRAINT "product_discount_min_cart_value_check"
CHECK ("min_cart_value" IS NULL OR "min_cart_value" >= 0);


-- =========================
-- DELIVERY FEE RULE CONSTRAINTS
-- =========================

ALTER TABLE "delivery_fee_rule"
ADD CONSTRAINT "delivery_fee_min_order_value_check"
CHECK ("min_order_value" >= 0);

ALTER TABLE "delivery_fee_rule"
ADD CONSTRAINT "delivery_fee_amount_check"
CHECK ("delivery_fee" >= 0);

ALTER TABLE "delivery_fee_rule"
ADD CONSTRAINT "delivery_fee_max_order_value_check"
CHECK (
    "max_order_value" IS NULL
    OR "max_order_value" >= "min_order_value"
);