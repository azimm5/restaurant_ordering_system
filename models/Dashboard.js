// models/Dashboard.js
const pool = require('../config/database');

class Dashboard {
    static async getSummary(startDate, endDate, category, customerName, sortBy, sortOrder, status, min_amount, max_amount) {
        const query = `SELECT * FROM get_sale_order_summary($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        const result = await pool.query(query, [
            startDate || null,
            endDate || null,
            category || null,
            customerName || null,
            sortBy || 'order_date',
            sortOrder || 'ASC',
            status || null,
            min_amount || null,
            max_amount || null
        ]);
        return result.rows;
    }

    static async getCategories() {
        const query = 'SELECT * FROM get_product_categories()';
        const result = await pool.query(query);
        return result.rows.map(row => row.category);
    }

    static async getStatuses() {
        const query = `SELECT * FROM get_order_statuses()`;
        const result = await pool.query(query);
        return result.rows.map(row => row.status);
    }
}

module.exports = Dashboard;
