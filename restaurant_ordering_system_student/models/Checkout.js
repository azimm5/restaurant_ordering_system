const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Find the best (highest) product-quantity discount tier a given quantity qualifies for.
// e.g. rules "Buy 3 get 10%" and "Buy 5 get 15%" — quantity 6 returns the 15% tier.
module.exports.getBestProductQuantityDiscount = function getBestProductQuantityDiscount(productId, quantity) {
    return prisma.productDiscountRule.findFirst({
        where: {
            discountType: 'PRODUCT_QUANTITY',
            productId: productId,
            isActive: true,
            minQuantity: { lte: quantity }
        },
        orderBy: { minQuantity: 'desc' } // ensures the largest qualifying tier is picked
    });
};

// Find the best (highest) cart-value discount tier a given subtotal qualifies for.
// e.g. rules "Spend $100 get 5%", "Spend $150 get 10%", "Spend $200 get 15%" — subtotal 160 returns the 10% tier.
module.exports.getBestCartValueDiscount = function getBestCartValueDiscount(cartSubtotal) {
    return prisma.productDiscountRule.findFirst({
        where: {
            discountType: 'CART_VALUE',
            isActive: true,
            minCartValue: { lte: cartSubtotal }
        },
        orderBy: { minCartValue: 'desc' } // ensures the largest qualifying tier is picked
    });
};

// Find the delivery fee tier a given order value falls into.
// e.g. <$50 -> $8, $50-$99 -> $5, >=$100 -> Free
module.exports.getDeliveryFeeForOrderValue = function getDeliveryFeeForOrderValue(orderValue) {
    return prisma.deliveryFeeRule.findFirst({
        where: {
            isActive: true,
            minOrderValue: { lte: orderValue },
            OR: [
                { maxOrderValue: null },
                { maxOrderValue: { gte: orderValue } }
            ]
        },
        orderBy: { minOrderValue: 'desc' } // ensures the largest qualifying tier is picked
    });
};

// Calculates the checkout summary including item discounts, cart discount, delivery fee, and grand total. 
module.exports.calculateCheckoutSummary = async function calculateCheckoutSummary(cartId) {
    const items = await prisma.cartItem.findMany({
        where: { cartId: cartId },
        include: { product: true },
        orderBy: { cartItemId: 'asc' }
    });

    if (!items || items.length === 0) {
        return {
            items: [],
            merchandiseSubtotal: 0,
            productDiscountTotal: 0,
            afterProductDiscount: 0,
            cartValueDiscount: null,
            cartValueDiscountAmount: 0,
            deliveryFee: 0,
            deliveryFeeRule: null,
            grandTotal: 0
        };
    }

    // 1. Apply the best product-quantity discount to each line item
    let merchandiseSubtotal = 0;
    let productDiscountTotal = 0;
    const itemBreakdown = [];

    for (const item of items) {
        // Calculate each item's subtotal (unitPrice × quantity)
        const lineSubtotal = Number(item.subtotal);
        merchandiseSubtotal += lineSubtotal;

        const discountRule = await module.exports.getBestProductQuantityDiscount(item.productId, item.quantity);
        const discountPercent = discountRule ? Number(discountRule.discountPercent) : 0;
        const discountAmount = Number((lineSubtotal * discountPercent / 100).toFixed(2));

        productDiscountTotal += discountAmount;

        itemBreakdown.push({
            cartItemId: item.cartItemId,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            lineSubtotal: lineSubtotal,
            discountRuleName: discountRule ? discountRule.name : null,
            discountPercent: discountPercent,
            discountAmount: discountAmount,
            lineTotal: Number((lineSubtotal - discountAmount).toFixed(2)) // Final price for this item after its discount
        });
    }
    // Cart subtotal after all product-level discounts
    const afterProductDiscount = Number((merchandiseSubtotal - productDiscountTotal).toFixed(2));

    // 2. Stack a cart-value discount on top, based on the post-item-discount total
    const cartValueRule = await module.exports.getBestCartValueDiscount(afterProductDiscount);
    const cartValueDiscountPercent = cartValueRule ? Number(cartValueRule.discountPercent) : 0;
    const cartValueDiscountAmount = Number((afterProductDiscount * cartValueDiscountPercent / 100).toFixed(2));

    // Subtotal after both product discounts and cart‑value discount.
    const finalMerchandiseTotal = Number((afterProductDiscount - cartValueDiscountAmount).toFixed(2));

    // 3. Delivery fee is based on the final, fully-discounted order value
    const deliveryRule = await module.exports.getDeliveryFeeForOrderValue(finalMerchandiseTotal);
    const deliveryFee = deliveryRule ? Number(deliveryRule.deliveryFee) : 0;

    // Adds delivery fee to the discounted merchandise total.
    const grandTotal = Number((finalMerchandiseTotal + deliveryFee).toFixed(2));

    return {
        items: itemBreakdown,
        merchandiseSubtotal: Number(merchandiseSubtotal.toFixed(2)),
        productDiscountTotal: productDiscountTotal,
        afterProductDiscount: afterProductDiscount,
        cartValueDiscount: cartValueRule ? { name: cartValueRule.name, percent: cartValueDiscountPercent } : null,
        cartValueDiscountAmount: cartValueDiscountAmount,
        deliveryFee: deliveryFee,
        deliveryFeeRule: deliveryRule
            ? { minOrderValue: Number(deliveryRule.minOrderValue), maxOrderValue: deliveryRule.maxOrderValue !== null ? Number(deliveryRule.maxOrderValue) : null }
            : null,
        grandTotal: grandTotal
    };
};