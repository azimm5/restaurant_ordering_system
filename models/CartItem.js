const { PrismaClient, Prisma } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Custom application error codes
const ERROR_CODES = {
    DUPLICATE_ITEM: 'DUPLICATE_ITEM',
    NOT_FOUND: 'NOT_FOUND',
    NO_CHANGES: 'NO_CHANGES'
};

// Add item to cart
// Used by: views/cart/create.html
module.exports.createCartItem = function createCartItem(cartId, productId, quantity, unitPrice) {
    return prisma.cartItem.create({
        data: {
            cartId: cartId,
            productId: Number(productId),
            quantity: Number(quantity),
            unitPrice: unitPrice,
        }
    }).then(item => item)
        .catch(async error => {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                // Find existing item so the caller can identify the duplicate
                const existing = await prisma.cartItem.findFirst({
                    where: { cartId: cartId, productId: Number(productId) }
                });

                const duplicateError = new Error(`This item is already in your cart.`);
                duplicateError.code = ERROR_CODES.DUPLICATE_ITEM;
                duplicateError.existingCartItemId = existing ? existing.cartItemId : null;
                throw duplicateError;
            }
            throw error;
        });
};

// Update quantity of a cart item
// Used by: views/cart/edit.html
module.exports.updateCartItem = function updateCartItem(cartItemId, quantity) {
    const newQuantity = Number(quantity);

    return prisma.cartItem.findUnique({ where: { cartItemId: cartItemId } })
        .then(existing => {
            if (!existing) {
                const notFoundError = new Error(`CartItem not found`);
                notFoundError.code = ERROR_CODES.NOT_FOUND;
                throw notFoundError;
            }

            if (existing.quantity === newQuantity) {
                const noChangesError = new Error('No changes made to cart item quantity.');
                noChangesError.code = ERROR_CODES.NO_CHANGES;
                throw noChangesError;
            }

            return prisma.cartItem.update({
                where: { cartItemId: cartItemId },
                data: {
                    quantity: newQuantity,
                },
                include: { product: true }
            });
        })
        .catch(error => {
            // Handle item deleted between lookup and update
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
                const notFoundError = new Error(`CartItem not found`);
                notFoundError.code = ERROR_CODES.NOT_FOUND;
                throw notFoundError;
            }
            throw error;
        });
};

// Delete a cart item
// Used by: views/cart/retrieve.html
module.exports.deleteCartItem = function deleteCartItem(cartItemId) {
    return prisma.cartItem.delete({
        where: { cartItemId: cartItemId }
    }).catch(error => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            const notFoundError = new Error(`CartItem not found`);
            notFoundError.code = ERROR_CODES.NOT_FOUND;
            throw notFoundError;
        }
        throw error;
    });
};

// Retrieve all items in a cart
// Used by: views/cart/retrieve.html
module.exports.getCartItems = function getCartItems(cartId) {
    return prisma.cartItem.findMany({
        where: { cartId: cartId },
        include: { product: true },
        orderBy: { cartItemId: 'asc' }
    });
};

// Retrieve a single cart item with its parent cart
// Used for ownership verification
module.exports.getCartItemById = function getCartItemById(cartItemId) {
    return prisma.cartItem.findUnique({
        where: { cartItemId: cartItemId },
        include: { product: true, cart: true }
    });
};

// Get cart summary (total quantity & price)
// Uses Prisma aggregate() at the database level
module.exports.getCartSummary = async function getCartSummary(cartId) {
    const items = await prisma.cartItem.findMany({
        where: {
            cartId: cartId,
            product: {
                isAvailable: true
            }
        }, 
        select: { quantity: true, unitPrice: true }
    });

    const totals = items.reduce((acc, item) => {
        acc.totalQuantity += item.quantity;
        acc.totalCheckoutPrice += item.quantity * Number(item.unitPrice);
        return acc;
    }, { totalQuantity: 0, totalCheckoutPrice: 0 });

    return totals;
};

// Look up a product and its real price
// Used by: views/cart/create.html
module.exports.getProductById = function getProductById(productId) {
    return prisma.product.findUnique({
        where: { productId: Number(productId) }
    });
};

// Export error codes for controller use
module.exports.ERROR_CODES = ERROR_CODES;