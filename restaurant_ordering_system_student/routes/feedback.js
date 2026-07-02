// routes/feedback.js
const express = require('express');
const FeedbackController = require('../controllers/feedbackController');
const { ensureAuthenticated, ensureCustomer } = require('../middleware/auth');
const feedbackEligibility = require('../middleware/feedbackEligibility');
const router = express.Router();

// Use stored procedures and functions from controller instead of raw SQL
router.get('/', ensureAuthenticated, ensureCustomer, FeedbackController.listByMember); // index.html
router.get('/eligibility/:productId', ensureAuthenticated, ensureCustomer, feedbackEligibility, (req, res) => // create.html
    res.json({ 
        success: true, 
        message: 'Eligible to submit feedback' 
    }));
router.get('/product/:productId', ensureAuthenticated, FeedbackController.listByProduct); // product-detail.html
router.get('/:feedbackId', ensureAuthenticated, ensureCustomer, FeedbackController.getById); // edit.html
router.post('/product/:productId', ensureAuthenticated, ensureCustomer, feedbackEligibility,FeedbackController.create); // create.html
router.put('/:feedbackId', ensureAuthenticated, ensureCustomer, FeedbackController.update); // edit.html
router.delete('/:feedbackId', ensureAuthenticated, ensureCustomer, FeedbackController.delete); // index.html

module.exports = router;
