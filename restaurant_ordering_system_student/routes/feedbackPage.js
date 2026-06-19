// routes/feedbackPage.js
const express = require('express');
const path = require('path');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

// GET /member/feedback - serve feedback index page
router.get('/feedback', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/feedback/index.html'));
});

// GET /member/feedback/create - serve feedback create page
router.get('/feedback/create', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/feedback/create.html'));
});

// GET /member/feedback/edit - serve feedback edit page
router.get('/feedback/edit', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/feedback/edit.html'));
});

module.exports = router;
