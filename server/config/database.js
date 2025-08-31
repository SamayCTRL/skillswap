const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'skill_swap',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    
    // Connection pool settings
    max: 20, // maximum number of connections
    idleTimeoutMillis: 30000, // close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // return an error if connection takes longer than 2 seconds
    
    // SSL configuration for production
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

// Connection event handlers
pool.on('connect', () => {
    console.log('🔗 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('💥 Unexpected error on idle client:', err);
});

// Test connection function
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connection test successful:', result.rows[0].now);
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
    }
};

// Query helper function with error handling
const query = async (text, params) => {
    const start = Date.now();
    
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development') {
            console.log('📊 Query executed:', {
                text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
                duration: `${duration}ms`,
                rows: result.rowCount
            });
        }
        
        return result;
    } catch (error) {
        console.error('💥 Database query error:', {
            text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
            params,
            error: error.message
        });
        throw error;
    }
};

// Transaction helper function
const transaction = async (callback) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Database utility functions
const dbUtils = {
    // Get user by ID with error handling
    getUserById: async (userId) => {
        const result = await query(
            'SELECT id, email, name, bio, avatar_url, subscription_tier, verified, credits, created_at FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    },

    // Get user by email
    getUserByEmail: async (email) => {
        const result = await query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    },

    // Update user's last activity
    updateUserActivity: async (userId) => {
        await query(
            'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [userId]
        );
    },

    // Check if user exists
    userExists: async (userId) => {
        const result = await query(
            'SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)',
            [userId]
        );
        return result.rows[0].exists;
    },

    // Get user's subscription tier
    getUserSubscriptionTier: async (userId) => {
        const result = await query(
            'SELECT subscription_tier FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0]?.subscription_tier || 'free';
    },

    // Update usage tracking
    updateUsageTracking: async (userId, actionType) => {
        const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM format
        
        await query(`
            INSERT INTO usage_tracking (user_id, action_type, count, month_year)
            VALUES ($1, $2, 1, $3)
            ON CONFLICT (user_id, action_type, month_year)
            DO UPDATE SET count = usage_tracking.count + 1
        `, [userId, actionType, monthYear]);
    },

    // Get usage count for current month
    getUsageCount: async (userId, actionType) => {
        const monthYear = new Date().toISOString().slice(0, 7);
        
        const result = await query(
            'SELECT count FROM usage_tracking WHERE user_id = $1 AND action_type = $2 AND month_year = $3',
            [userId, actionType, monthYear]
        );
        
        return result.rows[0]?.count || 0;
    },

    // Check usage limits based on subscription tier
    checkUsageLimit: async (userId, actionType) => {
        const tier = await dbUtils.getUserSubscriptionTier(userId);
        const currentCount = await dbUtils.getUsageCount(userId, actionType);
        
        const limits = {
            free: {
                message: 3,
                booking: 1,
                skill_view: 50
            },
            basic: {
                message: -1, // unlimited
                booking: 10,
                skill_view: -1
            },
            pro: {
                message: -1,
                booking: -1,
                skill_view: -1
            },
            premium: {
                message: -1,
                booking: -1,
                skill_view: -1
            }
        };
        
        const limit = limits[tier]?.[actionType];
        if (limit === -1) return true; // unlimited
        if (!limit) return true; // no limit defined
        
        return currentCount < limit;
    }
};

module.exports = {
    pool,
    query,
    transaction,
    testConnection,
    ...dbUtils
};