const Cart = require('../models/Cart');
const Checkout = require('../models/Checkout');

class CheckoutController {
    // GET /checkout - compute and return the checkout summary for the logged-in member's cart
    static async getSummary(req, res) {
        try {
            const memberId = req.session.userId;
            const cart = await Cart.getOrCreateCart(memberId);
            const summary = await Checkout.calculateCheckoutSummary(cart.cartId);

            return res.json({ success: true, cartId: cart.cartId, ...summary });
        } catch (err) {
            console.error('Error calculating checkout summary:', err);
            return res.status(500).json({ success: false, message: 'Unexpected error while calculating checkout summary.' });
        }
    }
}

module.exports = CheckoutController;