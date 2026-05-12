// models/Feedback.js
const pool = require('../config/database');

class Feedback {
    static async create(memberId, productId, orderId, rating, comment) {
        const query = 'SELECT create_feedback($1, $2, $3, $4, $5)';
        const result = await pool.query(query, [memberId, productId, orderId, rating, comment]);
        return result.rows;
    }

    static async update(feedbackId, rating, comment) {
        const query = 'SELECT update_feedback($1, $2, $3)';
        const result = await pool.query(query, [feedbackId, rating, comment]);
        return result.rows;
    }

    static async delete(feedbackId) {
        const query = 'SELECT delete_feedback($1)';
        const result = await pool.query(query, [feedbackId]);
        return result.rows;
    }

    static async getByProduct(productId) {
        const query = 'SELECT * FROM get_feedback($1)';
        const result = await pool.query(query, [productId]);
        return result.rows;
    }
}

module.exports = Feedback;
