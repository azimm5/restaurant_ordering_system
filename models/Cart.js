const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
const prisma = new PrismaClient({ adapter });

// Get the member's cart, creating one if it doesn't exist yet
// Used by: views/cart/create.html, views/cart/retrieve.html 
module.exports.getOrCreateCart = async function getOrCreateCart(memberId) {
    let cart = await prisma.cart.findFirst({ where: { memberId: memberId } });
    if (!cart) {
        cart = await prisma.cart.create({ data: { memberId: memberId } });
    }
    return cart;
};