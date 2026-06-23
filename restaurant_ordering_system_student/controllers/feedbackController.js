const Feedback = require('../models/Feedback');

class FeedbackController {
    static async create(req, res) {
        try {
            const memberId = req.session.userId;
            const { productId } = req.params;
            const { rating, comment } = req.body;

            // eligibility middleware attached latestOrder
            const latestOrder = res.locals.latestOrder;

            // order is completed
            await Feedback.create(memberId, productId, latestOrder.order_id, rating, comment);

            return res.status(201).json({
                success: true,
                message: 'Feedback created successfully'
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    static async update(req, res) {
        try {
            const memberId = req.session.userId;
            const { feedbackId } = req.params;
            const { rating, comment } = req.body;

            await Feedback.update(feedbackId, memberId, rating, comment);

            res.json({
                success: true,
                message: 'Feedback updated successfully'
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    static async delete(req, res) {
        try {
            const memberId = req.session.userId;
            const { feedbackId } = req.params;

            await Feedback.delete(feedbackId, memberId);

            res.json({
                success: true,
                message: 'Feedback deleted successfully'
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    static async listByMember(req, res) {
        try {
            const memberId = req.session.userId;
            const feedback = await Feedback.getByMember(memberId);
            res.json({
                success: true,
                feedback
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    // list feedback by product
    static async listByProduct(req, res) {
        try {
            const { productId } = req.params;
            const feedback = await Feedback.getByProduct(productId);
            res.json({
                success: true,
                feedback
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }

    static async getById(req, res) {
        try {
            const memberId = req.session.userId;
            const { feedbackId } = req.params;

            const feedback = await Feedback.findById(feedbackId, memberId);

            res.json({
                success: true,
                feedback
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
}

module.exports = FeedbackController;
