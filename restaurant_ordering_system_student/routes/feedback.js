const express = require('express');
const router = express.Router();
const FeedbackController = require('../controllers/feedbackController');

// POST /feedback/
router.post('/', FeedbackController.create);

// PUT /feedback/:feedbackId
router.put('/:feedbackId', FeedbackController.update);

// DELETE /feedback/:feedbackId
router.delete('/:feedbackId', FeedbackController.delete);

// GET /feedback/:memberId
router.get('/:memberId', FeedbackController.listByMember);

module.exports = router;
