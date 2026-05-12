const express = require('express');
const router = express.Router();
const FeedbackController = require('../controllers/feedbackController');

router.post('/create', FeedbackController.create);
router.get('/:productId', FeedbackController.listByProduct);

module.exports = router;
