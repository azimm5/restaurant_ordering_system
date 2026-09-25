const prisma = require('../config/prisma');

// Get the member's cart, creating one if it doesn't exist yet
// Used by: views/cart/create.html, views/cart/retrieve.html 
module.exports.getOrCreateCart = async function getOrCreateCart(memberId) {
    let cart = await prisma.cart.findFirst({ where: { memberId: memberId } });
    if (!cart) {
        cart = await prisma.cart.create({ data: { memberId: memberId } });
    }
    return cart;
};