// routes/cart.js
const express = require('express');
const CartController = require('../controllers/cartController');
const CartItemController = require('../controllers/cartItemController');
const { ensureAuthenticated, ensureCustomer } = require('../middleware/auth');
const router = express.Router();

// cart/retrieve/all page
router.get('/', ensureAuthenticated, ensureCustomer, CartController.getAll);

// cart/edit page       
router.get('/items/:cartItemId', ensureAuthenticated, ensureCustomer, CartItemController.getById);

// cart/create page
router.post('/items', ensureAuthenticated, ensureCustomer, CartItemController.create);

// cart/edit page       
router.put('/items/:cartItemId', ensureAuthenticated, ensureCustomer, CartItemController.update);

// cart/retrieve/all page
router.delete('/items/:cartItemId', ensureAuthenticated, ensureCustomer, CartItemController.delete);

module.exports = router;