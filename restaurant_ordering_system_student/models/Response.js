const pool = require('../config/database');

class Response {
    static async create(feedbackId, memberId, comment) {
        const query = 'CALL create_response($1, $2, $3)';
        await pool.query(query, [feedbackId, memberId, comment]);
    }

    static async delete(responseId) {
        const query = 'CALL delete_response($1)';
        await pool.query(query, [responseId]);
    }

    static async getByFeedback(feedbackId) {
        const query = 'SELECT * FROM get_response($1)';
        const result = await pool.query(query, [feedbackId]);
        return result.rows;
    }
}

module.exports = Response;
