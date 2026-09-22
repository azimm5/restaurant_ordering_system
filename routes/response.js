const express = require('express');
const router = express.Router();
const ResponseController = require('../controllers/responseController');
const { ensureAuthenticated, ensureCustomer } = require('../middleware/auth');

// Create a new response (customer only)
router.post('/feedback/:feedbackId', ensureAuthenticated, ensureCustomer, ResponseController.create);

// List responses for a feedback (authenticated users can view)
router.get('/feedback/:feedbackId', ensureAuthenticated, ResponseController.listByFeedback);

// Delete a response (customer only)
router.delete('/:responseId', ensureAuthenticated, ensureCustomer, ResponseController.delete);

module.exports = router;