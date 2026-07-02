const Response = require('../models/Response');

class ResponseController {
    static async create(req, res) {
        try {
            const memberId = req.session.userId;
            const { feedbackId } = req.params;
            const { comment } = req.body;

            await Response.create(feedbackId, memberId, comment);

            return res.status(201).json({
                success: true,
                message: 'Response created successfully'
            });
        } catch (err) {
            if (err.code === 'P4041') {
                return res.status(404).json({ success: false, message: err.message });
            } else if (err.code === 'P4040') {
                return res.status(404).json({ success: false, message: err.message });
            } else if (err.code === 'P4030') {
                return res.status(403).json({ success: false, message: err.message });
            } else {
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
        }
    }

    // List responses for a feedback
    static async listByFeedback(req, res) {
        try {
            const { feedbackId } = req.params;
            const responses = await Response.getByFeedback(feedbackId);

            return res.json({
                success: true,
                responses
            });
        } catch (err) {
            console.error(err)
            if (err.code === 'P4041') {
                return res.status(404).json({ success: false, message: err.message }); // Feedback not found
            } else if (err.code === 'P4042') {
                return res.status(404).json({ success: false, message: err.message }); // No responses found
            } else {
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
        }
    }

    // Delete a response
    static async delete(req, res) {
        try {
            const memberId = req.session.userId;
            const { responseId } = req.params;

            await Response.delete(responseId, memberId);

            return res.json({
                success: true,
                message: 'Response deleted successfully'
            });
        } catch (err) {
            if (err.code === 'P4031') {
                return res.status(403).json({ success: false, message: err.message }); // Forbidden delete
            } else if (err.code === 'P4041') {
                return res.status(404).json({ success: false, message: err.message }); // Response not found
            } else if (err.code === 'P4040') {
                return res.status(404).json({ success: false, message: err.message }); // Member not found
            } else {
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
        }
    }
}

module.exports = ResponseController;
