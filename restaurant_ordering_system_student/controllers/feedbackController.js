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