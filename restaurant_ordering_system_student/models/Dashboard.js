// models/Dashboard.js
const pool = require('../config/database');

class Dashboard {
    static async getSummary(startDate, endDate, category, customerName, sortBy, sortOrder) {
        const query = `SELECT * FROM get_sale_order_summary($1, $2, $3, $4, $5, $6)`;
        const result = await pool.query(query, [
            startDate || null,
            endDate || null,
            category || null,
            customerName || null,
            sortBy || null,
            sortOrder || null
        ]);
        return result.rows;
    }

    static async getCategories() {
        const query = 'SELECT * FROM get_product_categories()';
        const result = await pool.query(query);
        return result.rows.map(row => row.category);
    }
}

module.exports = Dashboard;
