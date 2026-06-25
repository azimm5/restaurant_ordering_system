// controllers/dashboardController.js
const Dashboard = require('../models/Dashboard');

class DashboardController {
    static async getSummary(req, res) {
        try {
            const { start_date, end_date, category, customer_name, sort_by, sort_order } = req.query;
            const orders = await Dashboard.getSummary(start_date, end_date, category, customer_name, sort_by, sort_order);
            const categories = await Dashboard.getCategories();

            res.json({
                success: true,
                orders,
                categories,
                filters: req.query,
                user: req.user
            });
        } catch (err) {
            console.error('DashboardController error:', err);
            if (err.code === 'P4000') {
                return res.status(400).json({ success: false, message: err.message });
            } else if (err.code === 'P4040') {
                return res.status(404).json({ success: false, message: err.message });
            } else if (err.code === 'P4041') {
                return res.status(404).json({ success: false, message: err.message });
            } else {
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
        }
    }
}

module.exports = DashboardController;