// routes/feedbackPage.js
const express = require('express');
const path = require('path');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

// GET /member/feedback - serve feedback index page
router.get('/feedback', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/feedback/index.html'));
});

module.exports = router;
