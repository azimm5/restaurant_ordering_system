// routes/checkoutPage.js
const express = require('express');
const path = require('path');
const { ensureAuthenticated, ensureCustomer } = require('../middleware/auth');

const router = express.Router();

// GET /member/checkout - serve the checkout page
router.get('/checkout', ensureAuthenticated, ensureCustomer, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/checkout.html'));
});

module.exports = router;
