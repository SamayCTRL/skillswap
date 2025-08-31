const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const db = require('../config/database');
const config = require('../config/config');
const { uploadLimiter, searchLimiter } = require('../middleware/rateLimiter');
const { validateProfileUpdate, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Configure multer for avatar uploads
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
        cb(null, `avatar-${req.user.id}-${uniqueSuffix}${extension}`);
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

// Get current user profile
router.get('/profile', async (req, res) => {
    try {
        const userQuery = `
            SELECT 
                u.id, u.email, u.name, u.bio, u.avatar_url, u.subscription_tier,
                u.verified, u.credits, u.location, u.timezone, u.phone, 
                u.website, u.social_links, u.created_at, u.updated_at,
                COUNT(DISTINCT s.id) as skills_count,
                COUNT(DISTINCT f.id) as followers_count,
                COUNT(DISTINCT following.id) as following_count,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.id) as reviews_count
            FROM users u
            LEFT JOIN skills s ON u.id = s.user_id AND s.active = true
            LEFT JOIN user_followers f ON u.id = f.following_id
            LEFT JOIN user_followers following ON u.id = following.follower_id
            LEFT JOIN reviews r ON u.id = r.reviewee_id
            WHERE u.id = $1
            GROUP BY u.id
        `;

        const result = await db.query(userQuery, [req.user.id]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Get usage statistics
        const currentMonth = new Date().toISOString().slice(0, 7);
        const usageQuery = `
            SELECT action_type, count
            FROM usage_tracking
            WHERE user_id = $1 AND month_year = $2
        `;

        const usageResult = await db.query(usageQuery, [req.user.id, currentMonth]);
        const usage = {};
        usageResult.rows.forEach(row => {
            usage[row.action_type] = row.count;
        });

        // Get subscription limits
        const limits = config.subscriptionLimits[user.subscription_tier] || config.subscriptionLimits.free;

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                bio: user.bio,
                avatar_url: user.avatar_url,
                subscription_tier: user.subscription_tier,
                verified: user.verified,
                credits: user.credits,
                location: user.location,
                timezone: user.timezone,
                phone: user.phone,
                website: user.website,
                social_links: user.social_links,
                created_at: user.created_at,
                updated_at: user.updated_at,
                stats: {
                    skills_count: parseInt(user.skills_count),
                    followers_count: parseInt(user.followers_count),
                    following_count: parseInt(user.following_count),
                    average_rating: parseFloat(user.average_rating),
                    reviews_count: parseInt(user.reviews_count)
                }
            },
            usage: {
                current: usage,
                limits: limits
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to fetch profile',
            code: 'PROFILE_FETCH_ERROR'
        });
    }
});

// Update user profile
router.put('/profile', validateProfileUpdate, async (req, res) => {
    try {
        const {
            name,
            bio,
            location,
            timezone,
            phone,
            website,
            social_links
        } = req.body;

        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        if (name !== undefined) {
            updateFields.push(`name = $${paramCount}`);
            updateValues.push(name);
            paramCount++;
        }

        if (bio !== undefined) {
            updateFields.push(`bio = $${paramCount}`);
            updateValues.push(bio);
            paramCount++;
        }

        if (location !== undefined) {
            updateFields.push(`location = $${paramCount}`);
            updateValues.push(location);
            paramCount++;
        }

        if (timezone !== undefined) {
            updateFields.push(`timezone = $${paramCount}`);
            updateValues.push(timezone);
            paramCount++;
        }

        if (phone !== undefined) {
            updateFields.push(`phone = $${paramCount}`);
            updateValues.push(phone);
            paramCount++;
        }

        if (website !== undefined) {
            updateFields.push(`website = $${paramCount}`);
            updateValues.push(website);
            paramCount++;
        }

        if (social_links !== undefined) {
            updateFields.push(`social_links = $${paramCount}`);
            updateValues.push(JSON.stringify(social_links));
            paramCount++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                code: 'NO_UPDATE_FIELDS'
            });
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(req.user.id);

        const updateQuery = `
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, email, name, bio, avatar_url, subscription_tier, verified, 
                      location, timezone, phone, website, social_links, updated_at
        `;

        const result = await db.query(updateQuery, updateValues);
        const updatedUser = result.rows[0];

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Failed to update profile',
            code: 'PROFILE_UPDATE_ERROR'
        });
    }
});

// Upload avatar
router.post('/avatar', uploadLimiter, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                code: 'NO_FILE'
            });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        // Delete old avatar if it exists
        const currentUserResult = await db.query(
            'SELECT avatar_url FROM users WHERE id = $1',
            [req.user.id]
        );

        const currentUser = currentUserResult.rows[0];
        if (currentUser && currentUser.avatar_url) {
            try {
                const oldAvatarPath = path.join(__dirname, '../../public', currentUser.avatar_url);
                await fs.unlink(oldAvatarPath);
            } catch (error) {
                console.warn('Failed to delete old avatar:', error.message);
            }
        }

        // Update user's avatar URL
        await db.query(
            'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [avatarUrl, req.user.id]
        );

        res.json({
            message: 'Avatar uploaded successfully',
            avatar_url: avatarUrl
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        
        // Clean up uploaded file on error
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

// Delete avatar
router.delete('/avatar', async (req, res) => {
    try {
        const currentUserResult = await db.query(
            'SELECT avatar_url FROM users WHERE id = $1',
            [req.user.id]
        );

        const currentUser = currentUserResult.rows[0];
        
        if (currentUser && currentUser.avatar_url) {
            try {
                const avatarPath = path.join(__dirname, '../../public', currentUser.avatar_url);
                await fs.unlink(avatarPath);
            } catch (error) {
                console.warn('Failed to delete avatar file:', error.message);
            }
        }

        // Remove avatar URL from database
        await db.query(
            'UPDATE users SET avatar_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [req.user.id]
        );

        res.json({
            message: 'Avatar deleted successfully'
        });

    } catch (error) {
        console.error('Avatar deletion error:', error);
        res.status(500).json({
            error: 'Failed to delete avatar',
            code: 'AVATAR_DELETE_ERROR'
        });
    }
});

// Get public user profile
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
            return res.status(400).json({
                error: 'Invalid user ID format',
                code: 'INVALID_USER_ID'
            });
        }

        const userQuery = `
            SELECT 
                u.id, u.name, u.bio, u.avatar_url, u.verified, u.location,
                u.website, u.social_links, u.created_at,
                COUNT(DISTINCT s.id) as skills_count,
                COUNT(DISTINCT f.id) as followers_count,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.id) as reviews_count
            FROM users u
            LEFT JOIN skills s ON u.id = s.user_id AND s.active = true
            LEFT JOIN user_followers f ON u.id = f.following_id
            LEFT JOIN reviews r ON u.id = r.reviewee_id
            WHERE u.id = $1
            GROUP BY u.id
        `;

        const result = await db.query(userQuery, [id]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Get user's active skills
        const skillsQuery = `
            SELECT s.id, s.title, s.description, s.price, s.difficulty, s.image_url,
                   sc.name as category_name, sc.icon as category_icon
            FROM skills s
            LEFT JOIN skill_categories sc ON s.category_id = sc.id
            WHERE s.user_id = $1 AND s.active = true
            ORDER BY s.created_at DESC
            LIMIT 6
        `;

        const skillsResult = await db.query(skillsQuery, [id]);

        // Check if current user is following this user
        let isFollowing = false;
        if (req.user) {
            const followQuery = `
                SELECT EXISTS(
                    SELECT 1 FROM user_followers 
                    WHERE follower_id = $1 AND following_id = $2
                )
            `;
            const followResult = await db.query(followQuery, [req.user.id, id]);
            isFollowing = followResult.rows[0].exists;
        }

        res.json({
            user: {
                id: user.id,
                name: user.name,
                bio: user.bio,
                avatar_url: user.avatar_url,
                verified: user.verified,
                location: user.location,
                website: user.website,
                social_links: user.social_links,
                created_at: user.created_at,
                stats: {
                    skills_count: parseInt(user.skills_count),
                    followers_count: parseInt(user.followers_count),
                    average_rating: parseFloat(user.average_rating),
                    reviews_count: parseInt(user.reviews_count)
                },
                is_following: isFollowing
            },
            skills: skillsResult.rows
        });

    } catch (error) {
        console.error('Get public profile error:', error);
        res.status(500).json({
            error: 'Failed to fetch user profile',
            code: 'PROFILE_FETCH_ERROR'
        });
    }
});

// Search users
router.get('/', searchLimiter, validatePagination, async (req, res) => {
    try {
        const {
            q = '',
            page = 1,
            limit = 20,
            verified_only = false,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;

        const offset = (page - 1) * limit;
        const searchTerm = `%${q.trim()}%`;

        let whereConditions = [];
        let queryParams = [searchTerm, searchTerm];
        let paramCount = 2;

        if (verified_only === 'true') {
            whereConditions.push(`u.verified = true`);
        }

        const whereClause = whereConditions.length > 0 
            ? `AND ${whereConditions.join(' AND ')}` 
            : '';

        const validSortColumns = {
            'created_at': 'u.created_at',
            'name': 'u.name',
            'rating': 'average_rating',
            'followers': 'followers_count'
        };

        const sortColumn = validSortColumns[sort_by] || 'u.created_at';
        const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const searchQuery = `
            SELECT 
                u.id, u.name, u.bio, u.avatar_url, u.verified, u.location,
                u.created_at,
                COUNT(DISTINCT s.id) as skills_count,
                COUNT(DISTINCT f.id) as followers_count,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.id) as reviews_count
            FROM users u
            LEFT JOIN skills s ON u.id = s.user_id AND s.active = true
            LEFT JOIN user_followers f ON u.id = f.following_id
            LEFT JOIN reviews r ON u.id = r.reviewee_id
            WHERE (u.name ILIKE $1 OR u.bio ILIKE $2)
            ${whereClause}
            GROUP BY u.id
            ORDER BY ${sortColumn} ${sortDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        queryParams.push(limit, offset);

        const result = await db.query(searchQuery, queryParams);

        // Get total count
        const countQuery = `
            SELECT COUNT(DISTINCT u.id) as total
            FROM users u
            WHERE (u.name ILIKE $1 OR u.bio ILIKE $2)
            ${whereClause}
        `;

        const countResult = await db.query(countQuery, queryParams.slice(0, paramCount));
        const total = parseInt(countResult.rows[0].total);

        res.json({
            users: result.rows.map(user => ({
                id: user.id,
                name: user.name,
                bio: user.bio,
                avatar_url: user.avatar_url,
                verified: user.verified,
                location: user.location,
                created_at: user.created_at,
                stats: {
                    skills_count: parseInt(user.skills_count),
                    followers_count: parseInt(user.followers_count),
                    average_rating: parseFloat(user.average_rating),
                    reviews_count: parseInt(user.reviews_count)
                }
            })),
            pagination: {
                current_page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(total / limit),
                total_count: total,
                has_next: page * limit < total,
                has_previous: page > 1
            }
        });

    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            error: 'Failed to search users',
            code: 'USER_SEARCH_ERROR'
        });
    }
});

// Follow/unfollow user
router.post('/:id/follow', async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({
                error: 'Cannot follow yourself',
                code: 'SELF_FOLLOW_ERROR'
            });
        }

        // Check if target user exists
        const targetUser = await db.getUserById(id);
        if (!targetUser) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Check if already following
        const existingFollow = await db.query(
            'SELECT id FROM user_followers WHERE follower_id = $1 AND following_id = $2',
            [req.user.id, id]
        );

        if (existingFollow.rows.length > 0) {
            // Unfollow
            await db.query(
                'DELETE FROM user_followers WHERE follower_id = $1 AND following_id = $2',
                [req.user.id, id]
            );

            res.json({
                message: 'User unfollowed successfully',
                following: false
            });
        } else {
            // Follow
            await db.query(
                'INSERT INTO user_followers (follower_id, following_id) VALUES ($1, $2)',
                [req.user.id, id]
            );

            // Create notification
            await db.query(
                'INSERT INTO notifications (user_id, type, title, content, related_id) VALUES ($1, $2, $3, $4, $5)',
                [
                    id,
                    'system',
                    'New Follower',
                    `${req.user.name} is now following you!`,
                    req.user.id
                ]
            );

            res.json({
                message: 'User followed successfully',
                following: true
            });
        }

    } catch (error) {
        console.error('Follow/unfollow error:', error);
        res.status(500).json({
            error: 'Failed to follow/unfollow user',
            code: 'FOLLOW_ERROR'
        });
    }
});

module.exports = router;