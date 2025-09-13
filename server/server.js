const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');
const { authMiddleware } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const skillRoutes = require('./routes/skills');
const messageRoutes = require('./routes/messages');
const bookingRoutes = require('./routes/bookings');
const subscriptionRoutes = require('./routes/subscriptions');

const messagingSocket = require('./socket/messaging');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"]
        }
    }
}));

// CORS configuration
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization
app.use(mongoSanitize()); // Remove NoSQL injection attempts
app.use((req, res, next) => {
    // XSS protection for request body, query, and params
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }
    next();
});

// XSS sanitization helper function
function sanitizeObject(obj) {
    if (typeof obj === 'string') {
        return xss(obj);
    } else if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    } else if (obj !== null && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }
    return obj;
}

// Logging middleware
app.use(morgan('combined'));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/bookings', authMiddleware, bookingRoutes);
app.use('/api/subscriptions', authMiddleware, subscriptionRoutes);

// Socket.io connection handling
messagingSocket(io);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired',
            code: 'TOKEN_EXPIRED'
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: err.details
        });
    }

    // Database errors
    if (err.code === '23505') { // Unique constraint violation
        return res.status(409).json({
            error: 'Resource already exists',
            code: 'DUPLICATE_RESOURCE'
        });
    }

    if (err.code === '23503') { // Foreign key constraint violation
        return res.status(400).json({
            error: 'Referenced resource does not exist',
            code: 'INVALID_REFERENCE'
        });
    }

    // Default error response
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';

    res.status(status).json({
        error: message,
        code: err.code || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        path: req.originalUrl
    });
});

// Serve frontend for non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Database connection test
const startServer = async () => {
    try {
        // Test database connection
        await db.query('SELECT NOW()');
        console.log('✅ Database connected successfully');

        // Start server
        server.listen(PORT, () => {
            console.log(`🚀 Skill Swap server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            
            if (process.env.NODE_ENV === 'development') {
                console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
                console.log(`📱 Frontend URL: http://localhost:${PORT}`);
            }
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server gracefully...');
    
    server.close(async () => {
        console.log('📡 HTTP server closed');
        
        try {
            await db.end();
            console.log('💾 Database connection closed');
        } catch (error) {
            console.error('❌ Error closing database connection:', error);
        }
        
        process.exit(0);
    });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    process.exit(1);
});

// Start the server
startServer();

module.exports = app;