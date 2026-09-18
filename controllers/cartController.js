const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');

class CartController {
    // GET /cart - retrieve all items + summary for the logged-in member's cart
    static async getAll(req, res) {
        try {
            const memberId = req.session.userId;
            const cart = await Cart.getOrCreateCart(memberId);
            const items = await CartItem.getCartItems(cart.cartId);
            const summary = await CartItem.getCartSummary(cart.cartId);

            return res.json({ success: true, items, summary });
        } catch (err) {
            console.error('Error retrieving cart:', err);
            return res.status(500).json({ success: false, message: 'Unexpected error while retrieving cart.' });
        }
    }
}

module.exports = CartController;