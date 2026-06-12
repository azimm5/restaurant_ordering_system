// routes/feedback.js
const express = require('express');
const FeedbackController = require('../controllers/FeedbackController');
const { ensureAuthenticated } = require('../middleware/auth');
const router = express.Router();

// Use stored procedures and functions from controller instead of raw SQL
router.get('/', ensureAuthenticated,FeedbackController.listByMember); // index.html
router.get('/product/:productId', FeedbackController.listByProduct); // product-detail.html
router.post('/', ensureAuthenticated,FeedbackController.create); // create.html
router.put('/:feedbackId', ensureAuthenticated,FeedbackController.update); // edit.html
router.delete('/:feedbackId', ensureAuthenticated,FeedbackController.delete); // index.html

module.exports = router;
