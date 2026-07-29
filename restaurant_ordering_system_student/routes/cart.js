// routes/cart.js
const express = require('express');
const CartController = require('../controllers/cartController');
const CartItemController = require('../controllers/CartItemController');
const { ensureAuthenticated, ensureCustomer } = require('../middleware/auth');
const router = express.Router();

// cart/retrieve/all page
router.get('/', ensureAuthenticated, ensureCustomer, CartController.getAll);

// cart/edit page       
router.get('/items/:cartItemId', ensureAuthenticated, ensureCustomer, CartController.getById);

// cart/create page
router.post('/items', ensureAuthenticated, ensureCustomer, CartController.create);

// cart/edit page       
router.put('/items/:cartItemId', ensureAuthenticated, ensureCustomer, CartController.update);

// cart/retrieve/all page
router.delete('/items/:cartItemId', ensureAuthenticated, ensureCustomer, CartController.delete);

module.exports = router;