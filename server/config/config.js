require('dotenv').config();

const config = {
    // Server configuration
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    
    // Database configuration
    database: {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'skill_swap',
        password: process.env.DB_PASSWORD || 'password',
        port: process.env.DB_PORT || 5432,
        ssl: process.env.NODE_ENV === 'production'
    },
    
    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    
    // Bcrypt configuration
    bcrypt: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
    },
    
    // File upload configuration
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
        allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        allowedFileTypes: ['application/pdf', 'text/plain', 'application/msword'],
        uploadPath: process.env.UPLOAD_PATH || './uploads'
    },
    
    // Email configuration (for notifications)
    email: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        user: process.env.EMAIL_USER || 'noreply@skillswap.com',
        password: process.env.EMAIL_PASSWORD || 'your-email-password',
        from: process.env.EMAIL_FROM || 'Skill Swap <noreply@skillswap.com>'
    },
    
    // Rate limiting configuration
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // requests per window
        authMax: 10, // auth requests per window
        messageMax: 50 // messages per window
    },
    
    // Subscription tier limits
    subscriptionLimits: {
        free: {
            messages: 3,
            bookings: 1,
            skillViews: 50,
            skillsPosted: 1,
            features: ['basic_profile', 'browse_skills']
        },
        basic: {
            messages: -1, // unlimited
            bookings: 10,
            skillViews: -1,
            skillsPosted: 5,
            features: ['basic_profile', 'browse_skills', 'unlimited_messaging', 'booking_requests', 'calendar_integration']
        },
        pro: {
            messages: -1,
            bookings: -1,
            skillViews: -1,
            skillsPosted: 20,
            features: ['basic_profile', 'browse_skills', 'unlimited_messaging', 'booking_requests', 'calendar_integration', 'verified_badge', 'skill_monetization', 'earnings_dashboard']
        },
        premium: {
            messages: -1,
            bookings: -1,
            skillViews: -1,
            skillsPosted: -1,
            features: ['basic_profile', 'browse_skills', 'unlimited_messaging', 'booking_requests', 'calendar_integration', 'verified_badge', 'skill_monetization', 'earnings_dashboard', 'featured_listings', 'advanced_analytics', 'priority_support']
        }
    },
    
    // Subscription pricing (in cents)
    subscriptionPricing: {
        basic: {
            monthly: 900, // $9.00
            yearly: 9000 // $90.00 (2 months free)
        },
        pro: {
            monthly: 1900, // $19.00
            yearly: 19000 // $190.00
        },
        premium: {
            monthly: 3900, // $39.00
            yearly: 39000 // $390.00
        }
    },
    
    // Socket.io configuration
    socket: {
        cors: {
            origin: process.env.CLIENT_URL || "*",
            methods: ["GET", "POST"],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    },
    
    // Stripe configuration (for payments)
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_...',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_...',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...'
    },
    
    // Video meeting configuration
    videoMeeting: {
        jitsiDomain: process.env.JITSI_DOMAIN || 'meet.jit.si',
        roomPrefix: 'skillswap-',
        defaultOptions: {
            roomName: '',
            width: '100%',
            height: 600,
            parentNode: undefined,
            configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: false
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts'
                ]
            }
        }
    },
    
    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        file: process.env.LOG_FILE || null
    },
    
    // Security configuration
    security: {
        corsOrigin: process.env.CORS_ORIGIN || '*',
        trustProxy: process.env.TRUST_PROXY === 'true',
        sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
        csrfTokenSecret: process.env.CSRF_SECRET || 'csrf-secret-key'
    },
    
    // Feature flags
    features: {
        enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',
        enableSubscriptions: process.env.ENABLE_SUBSCRIPTIONS !== 'false',
        enableVideoMeeting: process.env.ENABLE_VIDEO_MEETING !== 'false',
        enableNotifications: process.env.ENABLE_NOTIFICATIONS !== 'false',
        enableAnalytics: process.env.ENABLE_ANALYTICS === 'true'
    }
};

module.exports = config;