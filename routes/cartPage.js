// routes/cartPage.js
const express = require('express');
const path = require('path');
const { ensureAuthenticated, ensureCustomer } = require('../middleware/auth');

const router = express.Router();

// GET /member/cart/create - serve add-to-cart page
router.get('/cart/create', ensureAuthenticated, ensureCustomer, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/cart/create.html'));
});

// GET /member/cart/edit - serve update-quantity page
router.get('/cart/edit', ensureAuthenticated, ensureCustomer, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/cart/edit.html'));
});

// GET /member/cart/retrieve/all - serve cart summary page
router.get('/cart/retrieve/all', ensureAuthenticated, ensureCustomer, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/cart/retrieve.html'));
});

module.exports = router;