// models/Feedback.js
const pool = require('../config/database');

class Feedback {
    static async create(memberId, productId, orderId, rating, comment) {
        const query = 'CALL create_feedback($1, $2, $3, $4, $5)';
        await pool.query(query, [memberId, productId, orderId, rating, comment]);
    }

    static async update(feedbackId, rating, comment) {
        const query = 'CALL update_feedback($1, $2, $3)';
        await pool.query(query, [feedbackId, rating, comment]);
    }

    static async delete(feedbackId) {
        const query = 'CALL delete_feedback($1)';
        await pool.query(query, [feedbackId]);
    }

    static async getByMember(memberId) {
        const query = 'SELECT * FROM get_feedback($1)';
        const result = await pool.query(query, [memberId]);
        return result.rows;
    }
}

module.exports = Feedback;