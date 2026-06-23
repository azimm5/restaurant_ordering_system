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
            if (err.code === 'P4000') {
                return res.status(400).json({ success: false, message: err.message });
            } else if (err.code === 'P4040') {
                return res.status(404).json({ success: false, message: err.message });
            } else if (err.code === 'P4041') {
                return res.status(404).json({ success: false, message: err.message });
            } else if (err.code === 'P4042') {
                return res.status(404).json({ success: false, message: err.message });
            } else if (err.code === 'P4030') {
                return res.status(403).json({ success: false, message: err.message });
            } else if (err.code === 'P4031') {
                return res.status(403).json({ success: false, message: err.message });
            } else if (err.code === 'P4032') {
                return res.status(403).json({ success: false, message: err.message });
            } else {
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
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
            if (err.code === 'P4041') {
                return res.status(404).json({ success: false, message: err.message });
            } else if (err.code === 'P4030') {
                return res.status(403).json({ success: false, message: err.message });
            } else if (err.code === 'P4000') {
                return res.status(400).json({ success: false, message: err.message });
            } else if (err.code === 'P4001') {
                return res.status(400).json({ success: false, message: err.message });
            } else {
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
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
            if (err.code === 'P4041') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            } else if (err.code === 'P4030') {
                return res.status(403).json({
                    success: false,
                    message: err.message
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
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
            // Map structured error codes to correct HTTP responses
            if (err.code === 'P4040') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }
            if (err.code === 'P4041') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }

            // Fallback for unexpected errors
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
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
            // Map structured error codes to correct HTTP responses
            if (err.code === 'P4040') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }
            if (err.code === 'P4041') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }

            // Fallback for unexpected errors
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
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
            // Map structured error codes to correct HTTP responses
            if (err.code === 'P4040') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }
            if (err.code === 'P4041') {
                return res.status(404).json({
                    success: false,
                    message: err.message
                });
            }
            if (err.code === 'P4030') {
                return res.status(403).json({
                    success: false,
                    message: err.message
                });
            }

            // Fallback for unexpected errors
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = FeedbackController;
