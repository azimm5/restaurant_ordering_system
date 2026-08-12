const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });


// ---------- Generic Helpers ----------

async function findCartValueTier(cartSubtotal, type = 'best') {
    const isBest = type === 'best';

    return prisma.cartValueDiscountRule.findFirst({
        where: {
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

    return prisma.productQuantityDiscountRule.findFirst({
        where: {
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

    // Find the best product-quantity discount for a product and quantity.
    getBestProductQuantityDiscount: (productId, quantity) =>
        findProductQuantityTier(productId, quantity, 'best'),

    // Find the next product-quantity tier for upsell messaging.
    getNextProductQuantityTier: (productId, quantity) =>
        findProductQuantityTier(productId, quantity, 'next'),

    // Find the best cart-value discount for a subtotal.
    getBestCartValueDiscount: (cartSubtotal) =>
        findCartValueTier(cartSubtotal, 'best'),

    // Find the next cart-value tier for upsell messaging.
    getNextCartValueTier: (cartSubtotal) =>
        findCartValueTier(cartSubtotal, 'next'),

    // Find the delivery fee for an order value.
    getDeliveryFeeForOrderValue: (orderValue) =>
        findDeliveryTier(orderValue, null, 'best'),

    // Find the next cheaper delivery tier for upsell messaging.
    getNextDeliveryTier: (orderValue, currentFee) =>
        findDeliveryTier(orderValue, currentFee, 'next')
};


// Calculates the complete checkout summary.
module.exports.calculateCheckoutSummary = async function calculateCheckoutSummary(cartId) {

    const allItems = await prisma.cartItem.findMany({
        where: { cartId },
        include: { product: true },
        orderBy: { cartItemId: 'asc' }
    });

    const unavailableItems = allItems
        .filter(item => !item.product.isAvailable)
        .map(item => ({
            cartItemId: item.cartItemId,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            lineSubtotal: Number(item.subtotal),
            reason: 'Product is currently unavailable'
        }));

    const items = allItems.filter(item => item.product.isAvailable);

    if (items.length === 0) {
        return {
            items: [],
            unavailableItems,
            merchandiseSubtotal: 0,
            productDiscountTotal: 0,
            afterProductDiscount: 0,
            cartValueDiscount: null,
            cartValueDiscountAmount: 0,
            deliveryFee: 0,
            deliveryFeeRule: null,
            grandTotal: 0,
            upsells: []
        };
    }

    // Fetch all active product-quantity rules in one query
    // This avoids an N+1 query pattern when processing cart items.
    const productIds = [...new Set(items.map(item => item.productId))];

    const productQuantityRules = await prisma.productQuantityDiscountRule.findMany({
        where: {
            isActive: true,
            productId: { in: productIds }
        },
        orderBy: {
            minQuantity: 'desc'
        }
    });


    // Find the best product-quantity discount from the rules already loaded.
    function getBestProductRule(productId, quantity) {
        return productQuantityRules.find(rule =>
            rule.productId === productId &&
            rule.minQuantity <= quantity
        ) || null;
    }


    // Find the next product-quantity tier from the rules already loaded.
    function getNextProductRule(productId, quantity) {
        return productQuantityRules
            .filter(rule =>
                rule.productId === productId &&
                rule.minQuantity > quantity
            )
            .sort((a, b) => Number(a.minQuantity) - Number(b.minQuantity))[0] || null;
    }


    // 1. Apply the best product-quantity discount to each line item
    let merchandiseSubtotal = 0;
    let productDiscountTotal = 0;
    const itemBreakdown = [];

    for (const item of items) {
        // Calculate each item's subtotal (unitPrice × quantity)
        const lineSubtotal = Number(item.subtotal);
        merchandiseSubtotal += lineSubtotal;

        const discountRule = getBestProductRule(
            item.productId,
            item.quantity
        );

        const discountPercent = discountRule
            ? Number(discountRule.discountPercent)
            : 0;

        const discountAmount = Number(
            (lineSubtotal * discountPercent / 100).toFixed(2)
        );

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
            lineTotal: Number(
                (lineSubtotal - discountAmount).toFixed(2)
            )
        });
    }


    // Calculate subtotal after product-level discounts
    const afterProductDiscount = Number(
        (merchandiseSubtotal - productDiscountTotal).toFixed(2)
    );


    // 2. Apply the best cart-value discount
    const cartValueRule =
        await module.exports.getBestCartValueDiscount(afterProductDiscount);

    const cartValueDiscountPercent = cartValueRule
        ? Number(cartValueRule.discountPercent)
        : 0;

    const cartValueDiscountAmount = Number(
        (afterProductDiscount * cartValueDiscountPercent / 100).toFixed(2)
    );

    const finalMerchandiseTotal = Number(
        (afterProductDiscount - cartValueDiscountAmount).toFixed(2)
    );


    // 3. Calculate delivery fee using the final discounted value
    const deliveryRule =
        await module.exports.getDeliveryFeeForOrderValue(finalMerchandiseTotal);

    const deliveryFee = deliveryRule
        ? Number(deliveryRule.deliveryFee)
        : 0;

    const grandTotal = Number(
        (finalMerchandiseTotal + deliveryFee).toFixed(2)
    );


    // 4. Build upsell recommendations
    const upsells = [];

    // Product-quantity upsells reuse the rules already fetched above.
    for (const line of itemBreakdown) {
        const nextTier = getNextProductRule(
            items.find(item => item.cartItemId === line.cartItemId).productId,
            line.quantity
        );

        if (nextTier) {
            const quantityNeeded =
                nextTier.minQuantity - line.quantity;

            upsells.push({
                type: 'PRODUCT_QUANTITY',
                productName: line.productName,
                quantityNeeded,
                message:
                    `Add ${quantityNeeded} more ${line.productName} to unlock "${nextTier.name}"!`
            });
        }
    }


    // Cart-value upsell
    const nextCartValueTier =
        await module.exports.getNextCartValueTier(afterProductDiscount);

    if (nextCartValueTier) {
        const amountNeeded = Number(
            (
                Number(nextCartValueTier.minCartValue) -
                afterProductDiscount
            ).toFixed(2)
        );

        upsells.push({
            type: 'CART_VALUE',
            amountNeeded,
            message:
                `Spend $${amountNeeded.toFixed(2)} more to unlock "${nextCartValueTier.name}"!`
        });
    }


    // Delivery-fee upsell
    const nextDeliveryTier =
        await module.exports.getNextDeliveryTier(
            finalMerchandiseTotal,
            deliveryFee
        );

    if (nextDeliveryTier) {
        const amountNeeded = Number(
            (
                Number(nextDeliveryTier.minOrderValue) -
                finalMerchandiseTotal
            ).toFixed(2)
        );

        const deliveryDescription =
            Number(nextDeliveryTier.deliveryFee) === 0
                ? 'free delivery'
                : `delivery for just $${Number(
                    nextDeliveryTier.deliveryFee
                ).toFixed(2)}`;

        upsells.push({
            type: 'DELIVERY',
            amountNeeded,
            message:
                `Spend $${amountNeeded.toFixed(2)} more for ${deliveryDescription}!`
        });
    }


    return {
        items: itemBreakdown,
        unavailableItems,
        merchandiseSubtotal: Number(
            merchandiseSubtotal.toFixed(2)
        ),
        productDiscountTotal,
        afterProductDiscount,
        cartValueDiscount: cartValueRule
            ? {
                name: cartValueRule.name,
                percent: cartValueDiscountPercent
            }
            : null,
        cartValueDiscountAmount,
        deliveryFee,
        deliveryFeeRule: deliveryRule
            ? {
                minOrderValue: Number(deliveryRule.minOrderValue),
                maxOrderValue:
                    deliveryRule.maxOrderValue !== null
                        ? Number(deliveryRule.maxOrderValue)
                        : null
            }
            : null,
        grandTotal,
        upsells
    };
};