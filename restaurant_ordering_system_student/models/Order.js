// models/Order.js
const pool = require('../config/database');

// Returns new order_id or null if no order created.
// Triggered by checkout "Place Order" (POST /orders/place → orderController.placeOrders)
module.exports.placeOrders = async function placeOrders(memberId, cartId, grandTotal) {
    const result = await pool.query('CALL place_orders($1, $2, $3, NULL)', [memberId, cartId, grandTotal]);
    return result.rows[0] ? result.rows[0].p_order_id : null;
};