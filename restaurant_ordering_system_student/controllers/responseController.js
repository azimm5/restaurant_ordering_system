const Response = require('../models/Response');

class ResponseController {
    static async create(req, res) {
        try {
            const { feedbackId, memberId, comment } = req.body;
            await Response.create(feedbackId, memberId, comment);
            res.status(201).json({ message: 'Response created successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async delete(req, res) {
        try {
            const { responseId } = req.params;
            await Response.delete(responseId);
            res.json({ message: 'Response deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async listByFeedback(req, res) {
        try {
            const { feedbackId } = req.params;
            const responses = await Response.getByFeedback(feedbackId);
            res.json(responses);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = ResponseController;
