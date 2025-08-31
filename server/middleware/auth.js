const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../config/database');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            return res.status(401).json({
                error: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }

        // Extract token (format: "Bearer <token>")
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (!token) {
            return res.status(401).json({
                error: 'Access denied. Invalid token format.',
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);
        
        // Check if user still exists
        const user = await db.getUserById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                error: 'Access denied. User no longer exists.',
                code: 'USER_NOT_FOUND'
            });
        }

        // Update user's last activity
        await db.updateUserActivity(decoded.userId);

        // Attach user info to request
        req.user = {
            id: decoded.userId,
            email: user.email,
            name: user.name,
            subscriptionTier: user.subscription_tier,
            verified: user.verified
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Access denied. Invalid token.',
                code: 'INVALID_TOKEN'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Access denied. Token expired.',
                code: 'TOKEN_EXPIRED'
            });
        }

        res.status(500).json({
            error: 'Internal server error during authentication.',
            code: 'AUTH_ERROR'
        });
    }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            req.user = null;
            return next();
        }

        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await db.getUserById(decoded.userId);
        
        if (user) {
            req.user = {
                id: decoded.userId,
                email: user.email,
                name: user.name,
                subscriptionTier: user.subscription_tier,
                verified: user.verified
            };
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

// Admin middleware (requires admin role)
const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied. Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        // Check if user is admin (in production, you'd have a proper role system)
        const isAdmin = req.user.email === 'admin@skillswap.com';
        
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Access denied. Admin privileges required.',
                code: 'ADMIN_REQUIRED'
            });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({
            error: 'Internal server error during admin check.',
            code: 'ADMIN_CHECK_ERROR'
        });
    }
};

// Subscription tier middleware
const subscriptionMiddleware = (requiredTiers) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied. Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        const userTier = req.user.subscriptionTier || 'free';
        
        if (!requiredTiers.includes(userTier)) {
            return res.status(403).json({
                error: 'Access denied. Subscription upgrade required.',
                code: 'SUBSCRIPTION_REQUIRED',
                required: requiredTiers,
                current: userTier
            });
        }

        next();
    };
};

// Usage limit middleware
const usageLimitMiddleware = (actionType) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Access denied. Authentication required.',
                    code: 'AUTH_REQUIRED'
                });
            }

            const canPerformAction = await db.checkUsageLimit(req.user.id, actionType);
            
            if (!canPerformAction) {
                const currentCount = await db.getUsageCount(req.user.id, actionType);
                const tier = req.user.subscriptionTier;
                
                return res.status(429).json({
                    error: `Monthly ${actionType} limit exceeded for ${tier} tier.`,
                    code: 'USAGE_LIMIT_EXCEEDED',
                    action: actionType,
                    currentUsage: currentCount,
                    tier: tier,
                    upgradeRequired: true
                });
            }

            next();
        } catch (error) {
            console.error('Usage limit middleware error:', error);
            res.status(500).json({
                error: 'Error checking usage limits.',
                code: 'USAGE_LIMIT_ERROR'
            });
        }
    };
};

// Verification middleware (requires verified account)
const verificationMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Access denied. Authentication required.',
            code: 'AUTH_REQUIRED'
        });
    }

    if (!req.user.verified) {
        return res.status(403).json({
            error: 'Access denied. Email verification required.',
            code: 'VERIFICATION_REQUIRED'
        });
    }

    next();
};

module.exports = {
    authMiddleware,
    optionalAuthMiddleware,
    adminMiddleware,
    subscriptionMiddleware,
    usageLimitMiddleware,
    verificationMiddleware
};