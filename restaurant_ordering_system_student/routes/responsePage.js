// routes/responsePage.js
const express = require('express');
const path = require('path');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

// GET /member/response/create - serve response create page
router.get('/response/create', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/response/create.html'));
});

module.exports = router;
