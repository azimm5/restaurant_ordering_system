// routes/order.js
const express = require('express');
const OrderController = require('../controllers/orderController');
const { ensureAuthenticated, ensureCustomer } = require('../middleware/auth');
const router = express.Router();

// POST /orders/place - invoke the place_orders stored procedure for the logged-in member's cart
router.post('/place', ensureAuthenticated, ensureCustomer, OrderController.placeOrders);

module.exports = router;