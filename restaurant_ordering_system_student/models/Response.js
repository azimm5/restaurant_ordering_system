const pool = require('../config/database');

class Response {
    static async create(feedbackId, memberId, comment) {
        const query = 'CALL create_response($1, $2, $3)';
        await pool.query(query, [feedbackId, memberId, comment]);
    }

    // Retrieve all responses for a given feedback
    static async getByFeedback(feedbackId) {
        const query = 'SELECT * FROM get_response($1)';
        const { rows } = await pool.query(query, [feedbackId]);
        return rows;
    }

    // Delete a response (only allowed if owned by the member)
    static async delete(responseId, memberId) {
        const query = 'CALL delete_response($1, $2)';
        await pool.query(query, [responseId, memberId]);
    }
}

module.exports = Response;
