const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// Standard API rate limiter
const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user ? `user_${req.user.id}` : req.ip;
    }
});

// Strict authentication rate limiter
const authLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMax,
    message: {
        error: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

// Message sending rate limiter
const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.rateLimit.messageMax,
    message: {
        error: 'Too many messages sent, please slow down.',
        code: 'MESSAGE_RATE_LIMIT_EXCEEDED',
        retryAfter: 60
    },
    keyGenerator: (req) => {
        return req.user ? `user_messages_${req.user.id}` : req.ip;
    },
    skip: (req) => !req.user // Skip if not authenticated
});

// File upload rate limiter
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 uploads per 15 minutes
    message: {
        error: 'Too many file uploads, please try again later.',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        retryAfter: 900
    },
    keyGenerator: (req) => {
        return req.user ? `user_uploads_${req.user.id}` : req.ip;
    }
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: {
        error: 'Too many password reset attempts, please try again later.',
        code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        retryAfter: 3600
    },
    keyGenerator: (req) => {
        return req.body.email || req.ip;
    }
});

// Registration rate limiter
const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 registrations per hour per IP
    message: {
        error: 'Too many registration attempts, please try again later.',
        code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
        retryAfter: 3600
    }
});

// Search rate limiter (more lenient)
const searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 searches per minute
    message: {
        error: 'Too many search requests, please slow down.',
        code: 'SEARCH_RATE_LIMIT_EXCEEDED',
        retryAfter: 60
    },
    keyGenerator: (req) => {
        return req.user ? `user_search_${req.user.id}` : req.ip;
    }
});

// Booking rate limiter
const bookingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 booking attempts per minute
    message: {
        error: 'Too many booking attempts, please slow down.',
        code: 'BOOKING_RATE_LIMIT_EXCEEDED',
        retryAfter: 60
    },
    keyGenerator: (req) => {
        return req.user ? `user_booking_${req.user.id}` : req.ip;
    },
    skip: (req) => !req.user
});

// Admin actions rate limiter
const adminLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // 100 admin actions per 5 minutes
    message: {
        error: 'Too many admin actions, please slow down.',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
        retryAfter: 300
    },
    keyGenerator: (req) => {
        return req.user ? `admin_${req.user.id}` : req.ip;
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    messageLimiter,
    uploadLimiter,
    passwordResetLimiter,
    registrationLimiter,
    searchLimiter,
    bookingLimiter,
    adminLimiter
};