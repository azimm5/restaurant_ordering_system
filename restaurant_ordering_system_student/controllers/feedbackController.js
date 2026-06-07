const Feedback = require('../models/Feedback');

class FeedbackController {
    static async create(req, res) {
        try {
            const { memberId, productId, orderId, rating, comment } = req.body;
            await Feedback.create(memberId, productId, orderId, rating, comment);
            res.status(201).json({ message: 'Feedback created successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const { feedbackId } = req.params;
            const { rating, comment } = req.body;
            await Feedback.update(feedbackId, rating, comment);
            res.json({ message: 'Feedback updated successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async delete(req, res) {
        try {
            const { feedbackId } = req.params;
            await Feedback.delete(feedbackId);
            res.json({ message: 'Feedback deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async listByMember(req, res) {
        try {
            const { memberId } = req.params;
            const feedback = await Feedback.getByMember(memberId);
            res.json(feedback);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // list feedback by product
    static async listByProduct(req, res) {
        try {
            const { productId } = req.params;
            const feedback = await Feedback.getByProduct(productId);
            res.json(feedback);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = FeedbackController;
