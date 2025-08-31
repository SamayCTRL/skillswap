const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    
    next();
};

// User validation rules
const validateRegistration = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    handleValidationErrors
];

const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

const validateProfileUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('bio')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Bio cannot exceed 1000 characters'),
    body('location')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Location cannot exceed 100 characters'),
    body('website')
        .optional()
        .isURL({ protocols: ['http', 'https'] })
        .withMessage('Please provide a valid URL'),
    body('phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    handleValidationErrors
];

// Skill validation rules
const validateSkillCreation = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be between 10 and 2000 characters'),
    body('category_id')
        .isInt({ min: 1 })
        .withMessage('Please select a valid category'),
    body('difficulty')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
        .withMessage('Difficulty must be beginner, intermediate, advanced, or expert'),
    body('price')
        .optional()
        .isFloat({ min: 0, max: 10000 })
        .withMessage('Price must be between 0 and 10000'),
    body('duration')
        .optional()
        .isInt({ min: 15, max: 480 })
        .withMessage('Duration must be between 15 and 480 minutes'),
    body('max_participants')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Maximum participants must be between 1 and 20'),
    body('location_type')
        .optional()
        .isIn(['online', 'in-person', 'both'])
        .withMessage('Location type must be online, in-person, or both'),
    body('tags')
        .optional()
        .isArray({ max: 10 })
        .withMessage('Maximum 10 tags allowed'),
    body('tags.*')
        .optional()
        .isLength({ min: 1, max: 30 })
        .withMessage('Each tag must be between 1 and 30 characters'),
    handleValidationErrors
];

const validateSkillUpdate = [
    param('id')
        .isUUID()
        .withMessage('Invalid skill ID'),
    body('title')
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be between 10 and 2000 characters'),
    body('price')
        .optional()
        .isFloat({ min: 0, max: 10000 })
        .withMessage('Price must be between 0 and 10000'),
    body('active')
        .optional()
        .isBoolean()
        .withMessage('Active must be a boolean'),
    handleValidationErrors
];

// Message validation rules
const validateMessage = [
    body('content')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message content must be between 1 and 1000 characters'),
    body('conversation_id')
        .isUUID()
        .withMessage('Invalid conversation ID'),
    handleValidationErrors
];

// Booking validation rules
const validateBooking = [
    body('skill_id')
        .isUUID()
        .withMessage('Invalid skill ID'),
    body('scheduled_time')
        .isISO8601()
        .withMessage('Please provide a valid date and time')
        .custom(value => {
            const scheduledTime = new Date(value);
            const now = new Date();
            const minTime = new Date(now.getTime() + (60 * 60 * 1000)); // 1 hour from now
            
            if (scheduledTime < minTime) {
                throw new Error('Booking must be scheduled at least 1 hour in advance');
            }
            
            return true;
        }),
    body('participants')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Participants must be between 1 and 20'),
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters'),
    handleValidationErrors
];

const validateBookingStatusUpdate = [
    param('id')
        .isUUID()
        .withMessage('Invalid booking ID'),
    body('status')
        .isIn(['confirmed', 'cancelled', 'completed'])
        .withMessage('Status must be confirmed, cancelled, or completed'),
    body('cancellation_reason')
        .if(body('status').equals('cancelled'))
        .notEmpty()
        .withMessage('Cancellation reason is required when cancelling'),
    handleValidationErrors
];

// Review validation rules
const validateReview = [
    body('booking_id')
        .isUUID()
        .withMessage('Invalid booking ID'),
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    body('comment')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Comment cannot exceed 1000 characters'),
    handleValidationErrors
];

// Search validation rules
const validateSkillSearch = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('category')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Category must be a valid category ID'),
    query('difficulty')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
        .withMessage('Difficulty must be beginner, intermediate, advanced, or expert'),
    query('min_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum price must be 0 or greater'),
    query('max_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum price must be 0 or greater'),
    query('location_type')
        .optional()
        .isIn(['online', 'in-person', 'both'])
        .withMessage('Location type must be online, in-person, or both'),
    query('sort_by')
        .optional()
        .isIn(['created_at', 'price', 'rating', 'views'])
        .withMessage('Sort by must be created_at, price, rating, or views'),
    query('sort_order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
    handleValidationErrors
];

// Subscription validation rules
const validateSubscriptionUpgrade = [
    body('tier')
        .isIn(['basic', 'pro', 'premium'])
        .withMessage('Tier must be basic, pro, or premium'),
    body('billing_cycle')
        .optional()
        .isIn(['monthly', 'yearly'])
        .withMessage('Billing cycle must be monthly or yearly'),
    handleValidationErrors
];

// UUID parameter validation
const validateUUIDParam = (paramName = 'id') => [
    param(paramName)
        .isUUID()
        .withMessage(`Invalid ${paramName}`),
    handleValidationErrors
];

// Pagination validation
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    validateRegistration,
    validateLogin,
    validateProfileUpdate,
    validateSkillCreation,
    validateSkillUpdate,
    validateMessage,
    validateBooking,
    validateBookingStatusUpdate,
    validateReview,
    validateSkillSearch,
    validateSubscriptionUpgrade,
    validateUUIDParam,
    validatePagination
};