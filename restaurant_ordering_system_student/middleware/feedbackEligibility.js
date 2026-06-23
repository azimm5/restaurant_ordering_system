const Feedback = require('../models/Feedback');

async function feedbackEligibility(req, res, next) {
    try {
        const memberId = req.session.userId;
        const { productId } = req.params;

        const latestOrder = await Feedback.getLatestOrder(memberId, productId);

        res.locals.latestOrder = latestOrder; // attach for controller
        next();
        
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
}

module.exports = feedbackEligibility;