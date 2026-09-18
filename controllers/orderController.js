const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Order = require('../models/Order');
const Checkout = require('../models/Checkout');

class OrderController {
    // POST /orders/place - place orders for all currently-available items in the member's cart
    static async placeOrders(req, res) {
        try {
            const memberId = req.session.userId;
            const cart = await Cart.getOrCreateCart(memberId);

            // Recompute the grand total on the server instead of trusting req.body.
            const summary = await Checkout.calculateCheckoutSummary(cart.cartId);
            const grandTotal = summary.grandTotal;

            if (!summary.items.length) {
                return res.status(200).json({
                    success: false,
                    message: 'None of the items in your cart are currently available. No order was placed.'
                });
            }

            const orderId = await Order.placeOrders(memberId, cart.cartId, grandTotal);

            if (!orderId) {
                return res.status(200).json({
                    success: false,
                    message: 'None of the items in your cart are currently available. No order was placed.'
                });
            }

            const remainingItems = await CartItem.getCartItems(cart.cartId);
            const unavailableCount = remainingItems.filter(item => !item.product.isAvailable).length;

            let message = `Order #${orderId} placed successfully!`;
            if (unavailableCount > 0) {
                message += ` Note: ${unavailableCount} item(s) in your cart are currently unavailable and were not included in this order.`;
            }

            return res.status(201).json({
                success: true,
                message,
                orderId,
                unavailableCount
            });
        } catch (err) {
            console.error('Error placing order:', err);
            return res.status(500).json({ success: false, message: 'Unexpected error while placing order.' });
        }
    }
}

module.exports = OrderController;