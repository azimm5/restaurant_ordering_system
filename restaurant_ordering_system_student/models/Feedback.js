// models/Feedback.js
const pool = require('../config/database');

class Feedback {
    static async create(memberId, productId, orderId, rating, comment) {
        const query = 'CALL create_feedback($1, $2, $3, $4, $5)';
        await pool.query(query, [memberId, productId, orderId, rating, comment]);
    }

    static async update(feedbackId, memberId, rating, comment) {
        const query = 'CALL update_feedback($1, $2, $3, $4)';
        await pool.query(query, [feedbackId, memberId, rating, comment]);
    }

    static async delete(feedbackId, memberId) {
        const query = 'CALL delete_feedback($1, $2)';
        await pool.query(query, [feedbackId, memberId]);
    }

    static async getByMember(memberId) {
        const query = 'SELECT * FROM get_feedback_by_member($1)';
        const result = await pool.query(query, [memberId]);
        return result.rows;
    }

    static async findById(feedbackId, memberId) {
        const query = 'SELECT * FROM get_feedback_by_id($1, $2)';
        const result = await pool.query(query, [feedbackId, memberId]);
        return result.rows[0];
    }

    static async getByProduct(productId) {
        const query = 'SELECT * FROM get_feedback_by_product($1)';
        const result = await pool.query(query, [productId]);
        return result.rows;
    }

    static async getLatestOrder(memberId, productId) {
        const query = 'SELECT * FROM get_latest_order($1, $2)';
        const result = await pool.query(query, [memberId, productId]);
        return result.rows[0] || null; // returns { order_id, status } or null
    }
}

module.exports = Feedback;