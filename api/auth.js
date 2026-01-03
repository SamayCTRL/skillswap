import nextConnect from 'next-connect';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';

// Database connection
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'skill_swap',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper function to generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Database utility functions
const dbUtils = {
  getUserByEmail: async (email) => {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },
  
  getUserById: async (userId) => {
    const result = await pool.query(
      'SELECT id, email, name, bio, avatar_url, subscription_tier, role, verified, credits, created_at FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  },
  
  createUser: async (userData) => {
    const result = await pool.query(`
      INSERT INTO users (id, email, password_hash, name, subscription_tier, verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, name, subscription_tier, verified, created_at
    `, userData);
    return result.rows[0];
  }
};

// Next.js API route handler
const handler = nextConnect();

// POST /api/auth/register
handler.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await dbUtils.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists with this email address',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const saltRounds = 12; // Standard bcrypt salt rounds
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = uuidv4();
    const user = await dbUtils.createUser([
      userId,
      email.toLowerCase(),
      passwordHash,
      name,
      'free',
      false
    ]);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Create welcome notification
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, content)
      VALUES ($1, $2, $3, $4)
    `, [user.id, 'system', 'Welcome to Skill Swap!', 'Welcome to Skill Swap! Start by exploring skills or sharing your own expertise with our community.']);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscription_tier,
        verified: user.verified,
        createdAt: user.created_at
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Failed to register user',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// POST /api/auth/login
handler.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await dbUtils.getUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscription_tier,
        verified: user.verified,
        avatar_url: user.avatar_url,
        bio: user.bio
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Failed to login',
      code: 'LOGIN_ERROR'
    });
  }
});

export default handler;