const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');

function isValidQuantity(quantity) {
    const qty = Number(quantity);
    return Number.isInteger(qty) && qty > 0;
}

class CartItemController {
    // Add an item to the user's cart
    // POST /cart/items
    static async create(req, res) {
        try {
            const memberId = req.session.userId;
            const { productId, quantity } = req.body;

            if (!productId || !isValidQuantity(quantity)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid product and quantity required.'
                });
            }

            // Verify the product exists and is available
            const product = await CartItem.getProductById(productId);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found.'
                });
            }

            if (!product.isAvailable) {
                return res.status(400).json({
                    success: false,
                    message: 'Product unavailable.'
                });
            }

            const cart = await Cart.getOrCreateCart(memberId);

            const cartItem = await CartItem.createCartItem(
                cart.cartId,
                productId,
                quantity,
                Number(product.price)
            );

            return res.status(201).json({
                success: true,
                message: 'Item added!',
                cartItem
            });
        } catch (err) {
            // Handle duplicate items using the model's error code
            if (err.code === CartItem.ERROR_CODES.DUPLICATE_ITEM) {
                return res.status(409).json({
                    success: false,
                    message: `This item is already in your cart. Redirecting you to update its quantity...`,
                    existingCartItemId: err.existingCartItemId
                });
            }

            console.error('Error adding item:', err);
            return res.status(500).json({
                success: false,
                message: 'Unexpected error while adding item to cart.'
            });
        }
    }

    // Update the quantity of a cart item
    // PUT /cart/:cartItemId
    static async update(req, res) {
        try {
            const memberId = req.session.userId;
            const cartItemId = Number(req.params.cartItemId);
            const { quantity } = req.body;

            if (!isValidQuantity(quantity)) {
                return res.status(400).json({
                    success: false,
                    message: 'Quantity must be a whole number greater than 0.'
                });
            }

            // Retrieve the item to verify it exists and belongs to the user
            const existing = await CartItem.getCartItemById(cartItemId);

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message: 'Cart item not found.'
                });
            }

            if (existing.cart.memberId !== memberId) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only manage items in your own cart.'
                });
            }

            await CartItem.updateCartItem(cartItemId, quantity);

            return res.json({
                success: true,
                message: 'Cart item updated successfully'
            });
        } catch (err) {
            if (err.code === CartItem.ERROR_CODES.NO_CHANGES) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            if (err.code === CartItem.ERROR_CODES.NOT_FOUND) {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }

            console.error('Error updating cart item:', err);
            return res.status(500).json({
                success: false,
                message: 'Unexpected error while updating cart item.'
            });
        }
    }

    // Remove an item from the cart
    // DELETE /cart/:cartItemId
    static async delete(req, res) {
        try {
            const memberId = req.session.userId;
            const cartItemId = Number(req.params.cartItemId);

            // Check ownership before allowing deletion
            const existing = await CartItem.getCartItemById(cartItemId);

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message: 'Cart item not found.'
                });
            }

            if (existing.cart.memberId !== memberId) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only manage items in your own cart.'
                });
            }

            await CartItem.deleteCartItem(cartItemId);

            return res.json({
                success: true,
                message: 'Item deleted successfully!'
            });
        } catch (err) {
            if (err.code === CartItem.ERROR_CODES.NOT_FOUND) {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }

            console.error('Error deleting cart item:', err);
            return res.status(500).json({
                success: false,
                message: 'Unexpected error while deleting cart item.'
            });
        }
    }

    // Retrieve a single cart item for the edit page
    // GET /cart/:cartItemId
    static async getById(req, res) {
        try {
            const memberId = req.session.userId;
            const cartItemId = Number(req.params.cartItemId);

            const item = await CartItem.getCartItemById(cartItemId);

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'Cart item not found.'
                });
            }

            // Prevent users from viewing another user's cart item
            if (item.cart.memberId !== memberId) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only view items in your own cart.'
                });
            }

            return res.json({
                success: true,
                cartItem: item
            });
        } catch (err) {
            console.error('Error retrieving cart item:', err);
            return res.status(500).json({
                success: false,
                message: 'Unexpected error while retrieving cart item.'
            });
        }
    }
}

module.exports = CartItemController;