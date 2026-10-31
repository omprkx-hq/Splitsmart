const jwt = require('jsonwebtoken');
const { query } = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'splitsmart_super_secure_jwt_secret_fintech_2026';

/**
 * Authentication Middleware:
 * Verifies JWT token and checks if user is email-verified
 */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Authentication token missing. Please sign in to SplitSmart AI.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Fetch fresh user data from database
        const userRes = await query(`
            SELECT id, name, email, is_verified, default_currency, created_at 
            FROM users WHERE id = $1
        `, [decoded.userId]);

        if (userRes.rows.length === 0) {
            return res.status(401).json({
                error: 'USER_NOT_FOUND',
                message: 'The account associated with this session no longer exists.'
            });
        }

        const user = userRes.rows[0];

        // Check verification status
        if (!user.is_verified && !req.path.includes('/verify-otp') && !req.path.includes('/resend-otp')) {
            return res.status(403).json({
                error: 'ACCOUNT_NOT_VERIFIED',
                message: 'Email address not verified. Please complete OTP verification to access SplitSmart features.',
                email: user.email,
                userId: user.id
            });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'TOKEN_EXPIRED',
                message: 'Your session has expired. Please log in again.'
            });
        }
        return res.status(403).json({
            error: 'INVALID_TOKEN',
            message: 'Session token is invalid.'
        });
    }
}

module.exports = {
    authenticateToken,
    JWT_SECRET
};
