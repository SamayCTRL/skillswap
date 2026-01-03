const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const db = require('../config/database');
const config = require('../config/config');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { validateUUIDParam } = require('../middleware/validation');

const router = express.Router();

// Configure multer for profile image uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../public/uploads/avatars');
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: config.upload.maxFileSize
    },
    fileFilter: (req, file, cb) => {
        if (config.upload.allowedImageTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images are allowed.'));
        }
    }
});

// Get user profile by ID
router.get('/:id', optionalAuthMiddleware, validateUUIDParam(), async (req, res) => {
    try {
        const { id } = req.params;

        // Get user profile
        const userResult = await db.query(`
            SELECT 
                id, name, email, bio, avatar_url, subscription_tier, verified, 
                created_at, updated_at, credits
            FROM users 
            WHERE id = $1 AND (verified = true OR id = $2)
        `, [id, req.user?.id || null]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        // Get user's skills
        const skillsResult = await db.query(`
            SELECT 
                s.id, s.title, s.description, s.price, s.difficulty,
                s.active, s.views, s.image_url, s.created_at,
                sc.name as category_name, sc.icon as category_icon,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.id) as reviews_count,
                COUNT(DISTINCT b.id) as bookings_count
            FROM skills s
            LEFT JOIN skill_categories sc ON s.category_id = sc.id
            LEFT JOIN reviews r ON s.id = r.skill_id
            LEFT JOIN bookings b ON s.id = b.skill_id
            WHERE s.user_id = $1 AND s.active = true
            GROUP BY s.id, sc.id
            ORDER BY s.created_at DESC
        `, [id]);

        // Get user's stats
        const statsResult = await db.query(`
            SELECT 
                COUNT(DISTINCT s.id) as skills_count,
                COALESCE(SUM(b.total_price), 0) as earnings,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.id) as reviews_count
            FROM users u
            LEFT JOIN skills s ON u.id = s.user_id
            LEFT JOIN bookings b ON s.id = b.skill_id AND b.status = 'completed'
            LEFT JOIN reviews r ON u.id = r.skill_owner_id
            WHERE u.id = $1
        `, [id]);

        const stats = statsResult.rows[0];

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email, // Only visible to the user themselves
                bio: user.bio,
                avatar_url: user.avatar_url,
                subscription_tier: user.subscription_tier,
                verified: user.verified,
                created_at: user.created_at,
                updated_at: user.updated_at,
                credits: user.credits,
                isOwnProfile: req.user && req.user.id === user.id
            },
            skills: skillsResult.rows,
            stats: {
                skills_count: parseInt(stats.skills_count),
                earnings: parseFloat(stats.earnings),
                average_rating: parseFloat(stats.average_rating),
                reviews_count: parseInt(stats.reviews_count)
            }
        });

    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            error: 'Failed to fetch user profile',
            code: 'USER_PROFILE_FETCH_ERROR'
        });
    }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { bio } = req.body;

        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        if (bio !== undefined) {
            updateFields.push(`bio = $${paramCount}`);
            updateValues.push(bio);
            paramCount++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                code: 'NO_UPDATE_FIELDS'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(req.user.id);

        const updateQuery = `
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, name, email, bio, avatar_url, subscription_tier, verified, created_at, updated_at
        `;

        const result = await db.query(updateQuery, updateValues);
        const updatedUser = result.rows[0];

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                bio: updatedUser.bio,
                avatar_url: updatedUser.avatar_url,
                subscription_tier: updatedUser.subscription_tier,
                verified: updatedUser.verified,
                created_at: updatedUser.created_at,
                updated_at: updatedUser.updated_at
            }
        });

    } catch (error) {
        console.error('Update user profile error:', error);
        res.status(500).json({
            error: 'Failed to update user profile',
            code: 'USER_PROFILE_UPDATE_ERROR'
        });
    }
});

// Upload user avatar
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No avatar uploaded',
                code: 'NO_FILE'
            });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        // Get current avatar to delete it later
        const currentUser = await db.query(
            'SELECT avatar_url FROM users WHERE id = $1',
            [req.user.id]
        );

        // Update user avatar
        await db.query(
            'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [avatarUrl, req.user.id]
        );

        // Delete old avatar if it exists
        const user = currentUser.rows[0];
        if (user?.avatar_url && user.avatar_url.startsWith('/uploads/avatars/')) {
            try {
                const oldAvatarPath = path.join(__dirname, '../../public', user.avatar_url);
                await fs.unlink(oldAvatarPath);
            } catch (error) {
                console.warn('Failed to delete old avatar:', error.message);
            }
        }

        res.json({
            message: 'Avatar updated successfully',
            avatar_url: avatarUrl
        });

    } catch (error) {
        console.error('Avatar upload error:', error);

        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.warn('Failed to clean up uploaded file:', unlinkError.message);
            }
        }

        res.status(500).json({
            error: 'Failed to upload avatar',
            code: 'AVATAR_UPLOAD_ERROR'
        });
    }
});

// Get current user's profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userResult = await db.query(`
            SELECT 
                id, name, email, bio, avatar_url, subscription_tier, verified, 
                created_at, updated_at, credits
            FROM users 
            WHERE id = $1
        `, [req.user.id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                bio: user.bio,
                avatar_url: user.avatar_url,
                subscription_tier: user.subscription_tier,
                verified: user.verified,
                created_at: user.created_at,
                updated_at: user.updated_at,
                credits: user.credits
            }
        });

    } catch (error) {
        console.error('Get current user profile error:', error);
        res.status(500).json({
            error: 'Failed to fetch user profile',
            code: 'USER_PROFILE_FETCH_ERROR'
        });
    }
});

// Get user's skills
router.get('/skills', authMiddleware, async (req, res) => {
    try {
        const skillsResult = await db.query(`
            SELECT 
                s.id, s.title, s.description, s.price, s.difficulty,
                s.active, s.views, s.image_url, s.created_at,
                sc.name as category_name, sc.icon as category_icon,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.id) as reviews_count,
                COUNT(DISTINCT b.id) as bookings_count
            FROM skills s
            LEFT JOIN skill_categories sc ON s.category_id = sc.id
            LEFT JOIN reviews r ON s.id = r.skill_id
            LEFT JOIN bookings b ON s.id = b.skill_id
            WHERE s.user_id = $1
            GROUP BY s.id, sc.id
            ORDER BY s.created_at DESC
        `, [req.user.id]);

        res.json({
            skills: skillsResult.rows
        });

    } catch (error) {
        console.error('Get user skills error:', error);
        res.status(500).json({
            error: 'Failed to fetch user skills',
            code: 'USER_SKILLS_FETCH_ERROR'
        });
    }
});

module.exports = router;