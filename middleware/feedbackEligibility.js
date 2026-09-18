const Feedback = require('../models/Feedback');

async function feedbackEligibility(req, res, next) {
    try {
        const memberId = req.session.userId;
        const { productId } = req.params;

        const latestOrder = await Feedback.getLatestOrder(memberId, productId);

        res.locals.latestOrder = latestOrder; // attach for controller
        next();

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

module.exports = feedbackEligibility;