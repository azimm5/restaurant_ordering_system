// routes/feedback.js
const express = require('express');
const FeedbackController = require('../controllers/FeedbackController');
const { ensureAuthenticated } = require('../middleware/auth');
const feedbackEligibility = require('../middleware/feedbackEligibility');
const router = express.Router();

// Use stored procedures and functions from controller instead of raw SQL
router.get('/', ensureAuthenticated,FeedbackController.listByMember); // index.html
router.get('/eligibility/:productId', ensureAuthenticated, feedbackEligibility, (req, res) => // create.html
    res.json({ 
        success: true, 
        message: 'Eligible to submit feedback' 
    }));
router.get('/product/:productId', FeedbackController.listByProduct); // product-detail.html
router.get('/:feedbackId', ensureAuthenticated, FeedbackController.getById); // edit.html
router.post('/product/:productId', ensureAuthenticated,feedbackEligibility,FeedbackController.create); // create.html
router.put('/:feedbackId', ensureAuthenticated,FeedbackController.update); // edit.html
router.delete('/:feedbackId', ensureAuthenticated,FeedbackController.delete); // index.html

module.exports = router;
