const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---------- Generic Helpers ----------
async function findCartValueTier(cartSubtotal, type = 'best') {
    const isBest = type === 'best';

    return prisma.productDiscountRule.findFirst({
        where: {
            discountType: 'CART_VALUE',
            isActive: true,
            minCartValue: isBest ? { lte: cartSubtotal } : { gt: cartSubtotal }
        },
        // ensures the largest/lowest qualifying tier is picked for best/next respectively
        orderBy: { minCartValue: isBest ? 'desc' : 'asc' }
    });
}

async function findDeliveryTier(orderValue, currentFee = null, type = 'best') {
    const isBest = type === 'best';

    return prisma.deliveryFeeRule.findFirst({
        where: {
            isActive: true,
            minOrderValue: isBest ? { lte: orderValue } : { gt: orderValue },
            ...(isBest
                ? {
                    OR: [
                        { maxOrderValue: null },
                        { maxOrderValue: { gte: orderValue } }
                    ]
                }
                : {
                    deliveryFee: { lt: currentFee }
                })
        },
        // ensures the largest/lowest qualifying tier is picked for best/next respectively
        orderBy: { minOrderValue: isBest ? 'desc' : 'asc' }
    });
}

async function findProductQuantityTier(productId, quantity, type = 'best') {
    const isBest = type === 'best';

    return prisma.productDiscountRule.findFirst({
        where: {
            discountType: 'PRODUCT_QUANTITY',
            productId,
            isActive: true,
            minQuantity: isBest ? { lte: quantity } : { gt: quantity }
        },
        // ensures the largest/lowest qualifying tier is picked for best/next respectively
        orderBy: { minQuantity: isBest ? 'desc' : 'asc' }
    });
}

// ---------- Exports ----------
module.exports = {

    // Find the best (highest) product-quantity discount tier a given quantity qualifies for.
    getBestProductQuantityDiscount: (productId, quantity) =>
        findProductQuantityTier(productId, quantity, 'best'),

    // Find the NEXT product-quantity tier not yet reached — used for upsell messaging.
    getNextProductQuantityTier: (productId, quantity) =>
        findProductQuantityTier(productId, quantity, 'next'),

    // Find the best (highest) cart-value discount tier a given subtotal qualifies for.
    getBestCartValueDiscount: (cartSubtotal) =>
        findCartValueTier(cartSubtotal, 'best'),

    // Find the NEXT cart-value tier not yet reached — used for upsell messaging.
    getNextCartValueTier: (cartSubtotal) =>
        findCartValueTier(cartSubtotal, 'next'),

    // Find the best (highest) delivery fee tier a given order value falls into.
    getDeliveryFeeForOrderValue: (orderValue) =>
        findDeliveryTier(orderValue, null, 'best'),

    // Find the NEXT (cheaper) delivery tier not yet reached — used for upsell messaging.
    getNextDeliveryTier: (orderValue, currentFee) =>
        findDeliveryTier(orderValue, currentFee, 'next')
};

// Calculates the checkout summary including item discounts, cart discount, delivery fee, and grand total. 
module.exports.calculateCheckoutSummary = async function calculateCheckoutSummary(cartId) {
    const items = await prisma.cartItem.findMany({
        where: { cartId },
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
            lineSubtotal,
            discountRuleName: discountRule ? discountRule.name : null,
            discountPercent,
            discountAmount,
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

    // Build upsell nudges: for each discount dimension, find the next unreached
    // tier and how far away the customer is from it.
    const upsells = [];

    // Per-product quantity upsells (one per item, if a next tier exists)
    for (const line of itemBreakdown) {
        const cartLineItem = items.find(i => i.cartItemId === line.cartItemId);
        const nextTier = await module.exports.getNextProductQuantityTier(cartLineItem.productId, line.quantity);
        if (nextTier) {
            const quantityNeeded = nextTier.minQuantity - line.quantity;
            upsells.push({
                type: 'PRODUCT_QUANTITY',
                productName: line.productName,
                quantityNeeded: quantityNeeded,
                message: `Add ${quantityNeeded} more ${line.productName} to unlock "${nextTier.name}"!`
            });
        }
    }

    // Cart-value upsell
    const nextCartValueTier = await module.exports.getNextCartValueTier(afterProductDiscount);
    if (nextCartValueTier) {
        const amountNeeded = Number((Number(nextCartValueTier.minCartValue) - afterProductDiscount).toFixed(2));
        upsells.push({
            type: 'CART_VALUE',
            amountNeeded: amountNeeded,
            message: `Spend $${amountNeeded.toFixed(2)} more to unlock "${nextCartValueTier.name}"!`
        });
    }

    // Delivery-fee upsell
    const nextDeliveryTier = await module.exports.getNextDeliveryTier(finalMerchandiseTotal, deliveryFee);
    if (nextDeliveryTier) {
        const amountNeeded = Number((Number(nextDeliveryTier.minOrderValue) - finalMerchandiseTotal).toFixed(2));
        const deliveryDescription = Number(nextDeliveryTier.deliveryFee) === 0
            ? 'free delivery'
            : `delivery for just $${Number(nextDeliveryTier.deliveryFee).toFixed(2)}`;
        upsells.push({
            type: 'DELIVERY',
            amountNeeded: amountNeeded,
            message: `Spend $${amountNeeded.toFixed(2)} more for ${deliveryDescription}!`
        });
    }

    return {
        items: itemBreakdown,
        merchandiseSubtotal: Number(merchandiseSubtotal.toFixed(2)),
        productDiscountTotal,
        afterProductDiscount,
        cartValueDiscount: cartValueRule ? { name: cartValueRule.name, percent: cartValueDiscountPercent } : null,
        cartValueDiscountAmount,
        deliveryFee,
        deliveryFeeRule: deliveryRule
            ? { minOrderValue: Number(deliveryRule.minOrderValue), maxOrderValue: deliveryRule.maxOrderValue !== null ? Number(deliveryRule.maxOrderValue) : null }
            : null,
        grandTotal,
        upsells
    };

};