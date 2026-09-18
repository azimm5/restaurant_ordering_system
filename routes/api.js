const express = require('express');
const db = require('../config/database');
const DashboardController = require('../controllers/dashboardController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/auth/status', (req, res) => {
    if (req.session && req.session.userId) {
        return res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                role: req.session.userRole,
                name: req.session.userName
            }
        });
    }

    res.json({ authenticated: false});
});


// API endpoint for dashboard data
router.get('/dashboard', ensureAuthenticated, ensureAdmin, DashboardController.getSummary);

module.exports = router;