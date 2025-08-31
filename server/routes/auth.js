const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const config = require('../config/config');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { registrationLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const emailService = require('../utils/email');

const router = express.Router();

// Helper function to generate JWT tokens
const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { userId },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
        { userId },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
};

// Register new user
router.post('/register', registrationLimiter, validateRegistration, async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Check if user already exists
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: 'User already exists with this email address',
                code: 'USER_EXISTS'
            });
        }

        // Hash password
        const saltRounds = config.bcrypt.saltRounds;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const userId = uuidv4();
        const createUserQuery = `
            INSERT INTO users (id, email, password_hash, name, subscription_tier, verified)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, email, name, subscription_tier, verified, created_at
        `;

        const result = await db.query(createUserQuery, [
            userId,
            email.toLowerCase(),
            passwordHash,
            name,
            'free',
            false
        ]);

        const user = result.rows[0];

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user.id);

        // Create welcome notification
        const welcomeNotificationQuery = `
            INSERT INTO notifications (user_id, type, title, content)
            VALUES ($1, $2, $3, $4)
        `;

        await db.query(welcomeNotificationQuery, [
            user.id,
            'system',
            'Welcome to Skill Swap!',
            'Welcome to Skill Swap! Start by exploring skills or sharing your own expertise with our community.'
        ]);

        // Send welcome email (async, don't wait for it)
        emailService.sendWelcomeEmail(user.email, user.name)
            .catch(error => console.error('Failed to send welcome email:', error));

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
                expiresIn: config.jwt.expiresIn
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

// Login user
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await db.getUserByEmail(email.toLowerCase());
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
        await db.query(
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
                expiresIn: config.jwt.expiresIn
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

// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                error: 'Refresh token is required',
                code: 'REFRESH_TOKEN_REQUIRED'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

        // Check if user still exists
        const user = await db.getUserById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                error: 'User no longer exists',
                code: 'USER_NOT_FOUND'
            });
        }

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

        res.json({
            tokens: {
                accessToken,
                refreshToken: newRefreshToken,
                expiresIn: config.jwt.expiresIn
            }
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Invalid or expired refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        res.status(500).json({
            error: 'Failed to refresh token',
            code: 'REFRESH_ERROR'
        });
    }
});

// Verify token (for client-side token validation)
router.get('/verify', authMiddleware, (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            subscriptionTier: req.user.subscriptionTier,
            verified: req.user.verified
        }
    });
});

// Logout (client-side token deletion)
router.post('/logout', authMiddleware, (req, res) => {
    res.json({
        message: 'Logged out successfully'
    });
});

// Request password reset
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Email is required',
                code: 'EMAIL_REQUIRED'
            });
        }

        const user = await db.getUserByEmail(email.toLowerCase());
        
        // Always return success for security (don't reveal if email exists)
        res.json({
            message: 'If an account with that email exists, a password reset link has been sent.'
        });

        if (user) {
            // In a real app, you'd send an email with a reset token
            // For this demo, we'll just log the reset token
            const resetToken = jwt.sign(
                { userId: user.id, purpose: 'password_reset' },
                config.jwt.secret,
                { expiresIn: '1h' }
            );

            console.log(`Password reset token for ${email}: ${resetToken}`);
            
            // Store reset token in database (in production)
            // await db.query(
            //     'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
            //     [resetToken, user.id]
            // );
        }

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            error: 'Failed to process password reset request',
            code: 'PASSWORD_RESET_ERROR'
        });
    }
});

// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                error: 'Token and new password are required',
                code: 'MISSING_FIELDS'
            });
        }

        // Verify reset token
        const decoded = jwt.verify(token, config.jwt.secret);
        
        if (decoded.purpose !== 'password_reset') {
            return res.status(400).json({
                error: 'Invalid reset token',
                code: 'INVALID_RESET_TOKEN'
            });
        }

        // Validate new password
        if (newPassword.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long',
                code: 'WEAK_PASSWORD'
            });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

        // Update password
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [passwordHash, decoded.userId]
        );

        res.json({
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(400).json({
                error: 'Invalid or expired reset token',
                code: 'INVALID_RESET_TOKEN'
            });
        }

        res.status(500).json({
            error: 'Failed to reset password',
            code: 'PASSWORD_RESET_ERROR'
        });
    }
});

// Change password (authenticated user)
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Current and new passwords are required',
                code: 'MISSING_PASSWORDS'
            });
        }

        // Get user with password hash
        const user = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (!user.rows[0]) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                error: 'Current password is incorrect',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        }

        // Validate new password
        if (newPassword.length < 8) {
            return res.status(400).json({
                error: 'New password must be at least 8 characters long',
                code: 'WEAK_PASSWORD'
            });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

        // Update password
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [passwordHash, req.user.id]
        );

        res.json({
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: 'Failed to change password',
            code: 'CHANGE_PASSWORD_ERROR'
        });
    }
});

module.exports = router;