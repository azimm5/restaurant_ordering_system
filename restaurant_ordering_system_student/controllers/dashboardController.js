// controllers/dashboardController.js
const SaleOrder = require('../models/SaleOrder');
const Product = require('../models/Product');

class DashboardController {
    static async index(req, res) {
        try {
            const filters = {
                startDate: req.query.start_date,
                endDate: req.query.end_date,
                productCategory: req.query.category,
                sortBy: req.query.sort_by || 'order_date',
                sortOrder: req.query.sort_order || 'DESC'
            };

            const orders = await SaleOrder.getSummary(filters);
            const categories = await Product.getCategories();

            res.render('dashboard', { 
                orders, 
                categories, 
                filters, 
                user: req.session.user 
            });
        } catch (error) {
            console.error('Error loading dashboard:', error);
            res.status(500).send('Server error');
        }
    }
}

module.exports = DashboardController;