const { PrismaClient, Prisma } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Add item to cart
module.exports.createCartItem = function createCartItem(cartId, productId, quantity, unitPrice) {
    return prisma.cartItem.create({
        data: {
            cartId: cartId,
            productId: Number(productId),
            quantity: Number(quantity),
            unitPrice: unitPrice,
            subtotal: Number(quantity) * unitPrice
        }
    }).then(item => item)
      .catch(async error => {
       if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            // Find the row that already exists, so the caller can point the user at it
            const existing = await prisma.cartItem.findFirst({
                where: { cartId: cartId, productId: Number(productId) }
            });
            const duplicateError = new Error(`Product ${productId} already exists in cart ${cartId}`);
            duplicateError.existingCartItemId = existing ? existing.cartItemId : null;
            throw duplicateError;
        }
        throw error;
    });
};

// Update quantity of a cart item
module.exports.updateCartItem = function updateCartItem(cartItemId, quantity) {
    const newQuantity = Number(quantity);

    return prisma.cartItem.findUnique({ where: { cartItemId: cartItemId } })
        .then(existing => {
            if (!existing) {
                throw new Error(`CartItem ${cartItemId} not found`);
            }
            if (existing.quantity === newQuantity) {
                const noChangesError = new Error('No changes made to cart item quantity.');
                noChangesError.code = 'NO_CHANGES';
                throw noChangesError;
            }
            return prisma.cartItem.update({
                where: { cartItemId: cartItemId },
                data: {
                    quantity: newQuantity,
                    subtotal: newQuantity * Number(existing.unitPrice)
                },
                include: { product: true }
            });
        })
      .catch(error => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            throw new Error(`CartItem ${cartItemId} not found`);
        }
        throw error;
    });
};

// Delete a cart item
module.exports.deleteCartItem = function deleteCartItem(cartItemId) {
    return prisma.cartItem.delete({
        where: { cartItemId: cartItemId }
    }).catch(error => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            throw new Error(`CartItem ${cartItemId} not found`);
        }
        throw error;
    });
};

// Retrieve all items in a cart
// Used by: views/cart/retrieve.html 
module.exports.getCartItems = function getCartItems(cartId) {
    return prisma.cartItem.findMany({
        where: { cartId: cartId },
        include: { product: true }
    });
};

// Retrieve a single cart item, including its parent cart (used to verify ownership)
// Used by: views/cart/retrieve.html, views/cart/edit.html, 
module.exports.getCartItemById = function getCartItemById(cartItemId) {
    return prisma.cartItem.findUnique({
        where: { cartItemId: cartItemId },
        include: { product: true, cart: true }
    });
};

// Get cart summary (total quantity & price)
module.exports.getCartSummary = async function getCartSummary(cartId) {
    const result = await prisma.cartItem.aggregate({
        where: { cartId: cartId },
        _sum: {
            quantity: true,
            subtotal: true
        }
    });

    return {
        totalQuantity: result._sum.quantity ?? 0,
        totalCheckoutPrice: Number(result._sum.subtotal ?? 0)
    };
};

// Look up a product (checks it exists/is available, and gets its real price)
// Used by: views/cart/create.html
module.exports.getProductById = function getProductById(productId) {
    return prisma.product.findUnique({
        where: { productId: Number(productId) }
    });
};
