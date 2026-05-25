const express = require('express');
const router = express.Router();
const ResponseController = require('../controllers/ResponseController');

// POST /response/
router.post('/', ResponseController.create);

// DELETE /response/:responseId
router.delete('/:responseId', ResponseController.delete);

// GET /response/:feedbackId
router.get('/:feedbackId', ResponseController.listByFeedback);

module.exports = router;