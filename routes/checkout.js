// routes/checkout.js
const express = require('express');
const CheckoutController = require('../controllers/checkoutController');
const { ensureAuthenticated, ensureCustomer } = require('../middleware/auth');
const router = express.Router();

// GET /checkout - retrieve computed checkout summary (items, discounts, delivery fee, grand total)
router.get('/', ensureAuthenticated, ensureCustomer, CheckoutController.getSummary);

module.exports = router;