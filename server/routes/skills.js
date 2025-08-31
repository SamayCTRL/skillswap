const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const db = require('../config/database');
const config = require('../config/config');
const { authMiddleware, optionalAuthMiddleware, usageLimitMiddleware, subscriptionMiddleware } = require('../middleware/auth');
const { uploadLimiter, searchLimiter } = require('../middleware/rateLimiter');
const { 
    validateSkillCreation, 
    validateSkillUpdate, 
    validateSkillSearch, 
    validateUUIDParam, 
    validatePagination 
} = require('../middleware/validation');

const router = express.Router();

// Configure multer for skill image uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../public/uploads/skills');
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
        cb(null, `skill-${uniqueSuffix}${extension}`);
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

// Get all skill categories
router.get('/categories', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, name, description, icon, color, sort_order
            FROM skill_categories 
            WHERE active = true 
            ORDER BY sort_order, name
        `);

        res.json({
            categories: result.rows
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            error: 'Failed to fetch categories',
            code: 'CATEGORIES_FETCH_ERROR'
        });
    }
});

// Search and filter skills
router.get('/', optionalAuthMiddleware, searchLimiter, validateSkillSearch, async (req, res) => {
    try {
        const {
            q = '',
            page = 1,
            limit = 20,
            category,
            difficulty,
            min_price,
            max_price,
            location_type,
            sort_by = 'created_at',
            sort_order = 'desc',
            featured_only = false
        } = req.query;

        const offset = (page - 1) * limit;
        const searchTerm = `%${q.trim()}%`;

        // Track skill view usage if user is authenticated
        if (req.user) {
            await db.updateUsageTracking(req.user.id, 'skill_view');
        }

        // Build WHERE conditions
        let whereConditions = ['s.active = true'];
        let queryParams = [];
        let paramCount = 0;

        if (q.trim()) {
            paramCount += 2;
            whereConditions.push(`(s.title ILIKE $${paramCount - 1} OR s.description ILIKE $${paramCount})`);
            queryParams.push(searchTerm, searchTerm);
        }

        if (category) {
            paramCount++;
            whereConditions.push(`s.category_id = $${paramCount}`);
            queryParams.push(parseInt(category));
        }

        if (difficulty) {
            paramCount++;
            whereConditions.push(`s.difficulty = $${paramCount}`);
            queryParams.push(difficulty);
        }

        if (min_price) {
            paramCount++;
            whereConditions.push(`s.price >= $${paramCount}`);
            queryParams.push(parseFloat(min_price));
        }

        if (max_price) {
            paramCount++;
            whereConditions.push(`s.price <= $${paramCount}`);
            queryParams.push(parseFloat(max_price));
        }

        if (location_type) {
            paramCount++;
            whereConditions.push(`s.location_type = $${paramCount}`);
            queryParams.push(location_type);
        }

        if (featured_only === 'true') {
            whereConditions.push('s.featured = true');
        }

        // Build ORDER BY clause
        const validSortColumns = {
            'created_at': 's.created_at',
            'price': 's.price',
            'rating': 'average_rating',
            'views': 's.views',
            'title': 's.title'
        };

        const sortColumn = validSortColumns[sort_by] || 's.created_at';
        const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const whereClause = whereConditions.join(' AND ');

        const searchQuery = `
            SELECT 
                s.id, s.title, s.description, s.price, s.duration, s.difficulty,
                s.featured, s.views, s.location_type, s.location, s.image_url,
                s.tags, s.max_participants, s.created_at, s.updated_at,
                u.id as user_id, u.name as user_name, u.avatar_url as user_avatar,
                u.verified as user_verified,
                sc.name as category_name, sc.icon as category_icon, sc.color as category_color,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.id) as reviews_count,
                COUNT(DISTINCT b.id) as bookings_count,
                EXISTS(
                    SELECT 1 FROM user_favorites uf 
                    WHERE uf.skill_id = s.id AND uf.user_id = $${paramCount + 3}
                ) as is_favorited
            FROM skills s
            INNER JOIN users u ON s.user_id = u.id
            LEFT JOIN skill_categories sc ON s.category_id = sc.id
            LEFT JOIN reviews r ON s.id = r.skill_id
            LEFT JOIN bookings b ON s.id = b.skill_id
            WHERE ${whereClause}
            GROUP BY s.id, u.id, sc.id
            ORDER BY ${sortColumn} ${sortDirection}
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        queryParams.push(limit, offset, req.user?.id || null);

        const result = await db.query(searchQuery, queryParams);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(DISTINCT s.id) as total
            FROM skills s
            INNER JOIN users u ON s.user_id = u.id
            LEFT JOIN skill_categories sc ON s.category_id = sc.id
            WHERE ${whereClause}
        `;

        const countResult = await db.query(countQuery, queryParams.slice(0, paramCount));
        const total = parseInt(countResult.rows[0].total);

        res.json({
            skills: result.rows.map(skill => ({
                id: skill.id,
                title: skill.title,
                description: skill.description,
                price: parseFloat(skill.price),
                duration: skill.duration,
                difficulty: skill.difficulty,
                featured: skill.featured,
                views: skill.views,
                location_type: skill.location_type,
                location: skill.location,
                image_url: skill.image_url,
                tags: skill.tags,
                max_participants: skill.max_participants,
                created_at: skill.created_at,
                updated_at: skill.updated_at,
                user: {
                    id: skill.user_id,
                    name: skill.user_name,
                    avatar_url: skill.user_avatar,
                    verified: skill.user_verified
                },
                category: {
                    name: skill.category_name,
                    icon: skill.category_icon,
                    color: skill.category_color
                },
                stats: {
                    average_rating: parseFloat(skill.average_rating),
                    reviews_count: parseInt(skill.reviews_count),
                    bookings_count: parseInt(skill.bookings_count)
                },
                is_favorited: skill.is_favorited
            })),
            pagination: {
                current_page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(total / limit),
                total_count: total,
                has_next: page * limit < total,
                has_previous: page > 1
            },
            filters: {
                query: q,
                category,
                difficulty,
                min_price,
                max_price,
                location_type,
                featured_only
            }
        });

    } catch (error) {
        console.error('Skills search error:', error);
        res.status(500).json({
            error: 'Failed to search skills',
            code: 'SKILLS_SEARCH_ERROR'
        });
    }
});

// Get single skill by ID
router.get('/:id', optionalAuthMiddleware, validateUUIDParam(), async (req, res) => {
    try {
        const { id } = req.params;

        // Increment view count
        await db.query(
            'UPDATE skills SET views = views + 1 WHERE id = $1',
            [id]
        );

        const skillQuery = `
            SELECT 
                s.id, s.title, s.description, s.price, s.duration, s.difficulty,
                s.featured, s.views, s.location_type, s.location, s.image_url,
                s.video_url, s.tags, s.max_participants, s.requirements, 
                s.what_you_learn, s.created_at, s.updated_at,
                u.id as user_id, u.name as user_name, u.avatar_url as user_avatar,
                u.verified as user_verified, u.bio as user_bio,
                sc.name as category_name, sc.icon as category_icon, sc.color as category_color,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.id) as reviews_count,
                COUNT(DISTINCT b.id) as bookings_count,
                EXISTS(
                    SELECT 1 FROM user_favorites uf 
                    WHERE uf.skill_id = s.id AND uf.user_id = $2
                ) as is_favorited
            FROM skills s
            INNER JOIN users u ON s.user_id = u.id
            LEFT JOIN skill_categories sc ON s.category_id = sc.id
            LEFT JOIN reviews r ON s.id = r.skill_id
            LEFT JOIN bookings b ON s.id = b.skill_id
            WHERE s.id = $1 AND s.active = true
            GROUP BY s.id, u.id, sc.id
        `;

        const result = await db.query(skillQuery, [id, req.user?.id || null]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Skill not found',
                code: 'SKILL_NOT_FOUND'
            });
        }

        const skill = result.rows[0];

        // Get skill availability
        const availabilityQuery = `
            SELECT day_of_week, start_time, end_time, timezone
            FROM skill_availability 
            WHERE skill_id = $1
            ORDER BY day_of_week, start_time
        `;

        const availabilityResult = await db.query(availabilityQuery, [id]);

        // Get recent reviews
        const reviewsQuery = `
            SELECT 
                r.id, r.rating, r.comment, r.created_at,
                u.name as reviewer_name, u.avatar_url as reviewer_avatar,
                u.verified as reviewer_verified
            FROM reviews r
            INNER JOIN users u ON r.reviewer_id = u.id
            WHERE r.skill_id = $1
            ORDER BY r.created_at DESC
            LIMIT 5
        `;

        const reviewsResult = await db.query(reviewsQuery, [id]);

        res.json({
            skill: {
                id: skill.id,
                title: skill.title,
                description: skill.description,
                price: parseFloat(skill.price),
                duration: skill.duration,
                difficulty: skill.difficulty,
                featured: skill.featured,
                views: skill.views + 1, // Include the increment
                location_type: skill.location_type,
                location: skill.location,
                image_url: skill.image_url,
                video_url: skill.video_url,
                tags: skill.tags,
                max_participants: skill.max_participants,
                requirements: skill.requirements,
                what_you_learn: skill.what_you_learn,
                created_at: skill.created_at,
                updated_at: skill.updated_at,
                user: {
                    id: skill.user_id,
                    name: skill.user_name,
                    avatar_url: skill.user_avatar,
                    verified: skill.user_verified,
                    bio: skill.user_bio
                },
                category: {
                    name: skill.category_name,
                    icon: skill.category_icon,
                    color: skill.category_color
                },
                stats: {
                    average_rating: parseFloat(skill.average_rating),
                    reviews_count: parseInt(skill.reviews_count),
                    bookings_count: parseInt(skill.bookings_count)
                },
                is_favorited: skill.is_favorited,
                availability: availabilityResult.rows,
                recent_reviews: reviewsResult.rows
            }
        });

    } catch (error) {
        console.error('Get skill error:', error);
        res.status(500).json({
            error: 'Failed to fetch skill',
            code: 'SKILL_FETCH_ERROR'
        });
    }
});

// Create new skill
router.post('/', authMiddleware, validateSkillCreation, async (req, res) => {
    try {
        const {
            title,
            description,
            category_id,
            difficulty = 'beginner',
            price = 0,
            duration = 60,
            max_participants = 1,
            location_type = 'online',
            location,
            tags = [],
            requirements,
            what_you_learn
        } = req.body;

        // Check subscription limits
        const userTier = req.user.subscriptionTier;
        const limits = config.subscriptionLimits[userTier];
        
        if (limits.skillsPosted !== -1) {
            const currentSkillsQuery = `
                SELECT COUNT(*) as count 
                FROM skills 
                WHERE user_id = $1 AND active = true
            `;
            const currentSkillsResult = await db.query(currentSkillsQuery, [req.user.id]);
            const currentCount = parseInt(currentSkillsResult.rows[0].count);
            
            if (currentCount >= limits.skillsPosted) {
                return res.status(403).json({
                    error: `Skill posting limit reached for ${userTier} tier`,
                    code: 'SKILL_LIMIT_REACHED',
                    current: currentCount,
                    limit: limits.skillsPosted
                });
            }
        }

        // Validate category exists
        const categoryResult = await db.query(
            'SELECT id FROM skill_categories WHERE id = $1 AND active = true',
            [category_id]
        );

        if (categoryResult.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid category selected',
                code: 'INVALID_CATEGORY'
            });
        }

        // Create skill
        const skillQuery = `
            INSERT INTO skills (
                user_id, title, description, category_id, difficulty, price,
                duration, max_participants, location_type, location, tags,
                requirements, what_you_learn
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, created_at
        `;

        const result = await db.query(skillQuery, [
            req.user.id, title, description, category_id, difficulty,
            price, duration, max_participants, location_type, location,
            tags, requirements, what_you_learn
        ]);

        const newSkill = result.rows[0];

        // Get complete skill data to return
        const skillResult = await db.query(`
            SELECT 
                s.*, sc.name as category_name, sc.icon as category_icon,
                u.name as user_name, u.avatar_url as user_avatar
            FROM skills s
            LEFT JOIN skill_categories sc ON s.category_id = sc.id
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.id = $1
        `, [newSkill.id]);

        const skill = skillResult.rows[0];

        res.status(201).json({
            message: 'Skill created successfully',
            skill: {
                id: skill.id,
                title: skill.title,
                description: skill.description,
                price: parseFloat(skill.price),
                difficulty: skill.difficulty,
                duration: skill.duration,
                location_type: skill.location_type,
                created_at: skill.created_at,
                category: {
                    name: skill.category_name,
                    icon: skill.category_icon
                },
                user: {
                    name: skill.user_name,
                    avatar_url: skill.user_avatar
                }
            }
        });

    } catch (error) {
        console.error('Create skill error:', error);
        res.status(500).json({
            error: 'Failed to create skill',
            code: 'SKILL_CREATE_ERROR'
        });
    }
});

// Update skill
router.put('/:id', authMiddleware, validateSkillUpdate, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if skill exists and user owns it
        const existingSkill = await db.query(
            'SELECT user_id FROM skills WHERE id = $1',
            [id]
        );

        if (existingSkill.rows.length === 0) {
            return res.status(404).json({
                error: 'Skill not found',
                code: 'SKILL_NOT_FOUND'
            });
        }

        if (existingSkill.rows[0].user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Not authorized to update this skill',
                code: 'UNAUTHORIZED'
            });
        }

        const {
            title,
            description,
            category_id,
            difficulty,
            price,
            duration,
            max_participants,
            location_type,
            location,
            tags,
            requirements,
            what_you_learn,
            active
        } = req.body;

        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        if (title !== undefined) {
            updateFields.push(`title = $${paramCount}`);
            updateValues.push(title);
            paramCount++;
        }

        if (description !== undefined) {
            updateFields.push(`description = $${paramCount}`);
            updateValues.push(description);
            paramCount++;
        }

        if (category_id !== undefined) {
            // Validate category
            const categoryResult = await db.query(
                'SELECT id FROM skill_categories WHERE id = $1 AND active = true',
                [category_id]
            );

            if (categoryResult.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid category selected',
                    code: 'INVALID_CATEGORY'
                });
            }

            updateFields.push(`category_id = $${paramCount}`);
            updateValues.push(category_id);
            paramCount++;
        }

        if (difficulty !== undefined) {
            updateFields.push(`difficulty = $${paramCount}`);
            updateValues.push(difficulty);
            paramCount++;
        }

        if (price !== undefined) {
            updateFields.push(`price = $${paramCount}`);
            updateValues.push(price);
            paramCount++;
        }

        if (duration !== undefined) {
            updateFields.push(`duration = $${paramCount}`);
            updateValues.push(duration);
            paramCount++;
        }

        if (max_participants !== undefined) {
            updateFields.push(`max_participants = $${paramCount}`);
            updateValues.push(max_participants);
            paramCount++;
        }

        if (location_type !== undefined) {
            updateFields.push(`location_type = $${paramCount}`);
            updateValues.push(location_type);
            paramCount++;
        }

        if (location !== undefined) {
            updateFields.push(`location = $${paramCount}`);
            updateValues.push(location);
            paramCount++;
        }

        if (tags !== undefined) {
            updateFields.push(`tags = $${paramCount}`);
            updateValues.push(tags);
            paramCount++;
        }

        if (requirements !== undefined) {
            updateFields.push(`requirements = $${paramCount}`);
            updateValues.push(requirements);
            paramCount++;
        }

        if (what_you_learn !== undefined) {
            updateFields.push(`what_you_learn = $${paramCount}`);
            updateValues.push(what_you_learn);
            paramCount++;
        }

        if (active !== undefined) {
            updateFields.push(`active = $${paramCount}`);
            updateValues.push(active);
            paramCount++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                code: 'NO_UPDATE_FIELDS'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);

        const updateQuery = `
            UPDATE skills 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await db.query(updateQuery, updateValues);
        const updatedSkill = result.rows[0];

        res.json({
            message: 'Skill updated successfully',
            skill: updatedSkill
        });

    } catch (error) {
        console.error('Update skill error:', error);
        res.status(500).json({
            error: 'Failed to update skill',
            code: 'SKILL_UPDATE_ERROR'
        });
    }
});

// Upload skill image
router.post('/:id/image', authMiddleware, uploadLimiter, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if skill exists and user owns it
        const existingSkill = await db.query(
            'SELECT user_id, image_url FROM skills WHERE id = $1',
            [id]
        );

        if (existingSkill.rows.length === 0) {
            return res.status(404).json({
                error: 'Skill not found',
                code: 'SKILL_NOT_FOUND'
            });
        }

        if (existingSkill.rows[0].user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Not authorized to update this skill',
                code: 'UNAUTHORIZED'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'No image uploaded',
                code: 'NO_FILE'
            });
        }

        const imageUrl = `/uploads/skills/${req.file.filename}`;

        // Delete old image if it exists
        const skill = existingSkill.rows[0];
        if (skill.image_url) {
            try {
                const oldImagePath = path.join(__dirname, '../../public', skill.image_url);
                await fs.unlink(oldImagePath);
            } catch (error) {
                console.warn('Failed to delete old skill image:', error.message);
            }
        }

        // Update skill image URL
        await db.query(
            'UPDATE skills SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [imageUrl, id]
        );

        res.json({
            message: 'Skill image uploaded successfully',
            image_url: imageUrl
        });

    } catch (error) {
        console.error('Skill image upload error:', error);
        
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.warn('Failed to clean up uploaded file:', unlinkError.message);
            }
        }

        res.status(500).json({
            error: 'Failed to upload skill image',
            code: 'SKILL_IMAGE_UPLOAD_ERROR'
        });
    }
});

// Delete skill
router.delete('/:id', authMiddleware, validateUUIDParam(), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if skill exists and user owns it
        const existingSkill = await db.query(
            'SELECT user_id, image_url FROM skills WHERE id = $1',
            [id]
        );

        if (existingSkill.rows.length === 0) {
            return res.status(404).json({
                error: 'Skill not found',
                code: 'SKILL_NOT_FOUND'
            });
        }

        if (existingSkill.rows[0].user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Not authorized to delete this skill',
                code: 'UNAUTHORIZED'
            });
        }

        // Check for active bookings
        const activeBookingsResult = await db.query(
            'SELECT COUNT(*) as count FROM bookings WHERE skill_id = $1 AND status IN ($2, $3)',
            [id, 'pending', 'confirmed']
        );

        const activeBookings = parseInt(activeBookingsResult.rows[0].count);
        
        if (activeBookings > 0) {
            return res.status(400).json({
                error: 'Cannot delete skill with active bookings',
                code: 'ACTIVE_BOOKINGS_EXIST',
                active_bookings: activeBookings
            });
        }

        // Delete skill image if it exists
        const skill = existingSkill.rows[0];
        if (skill.image_url) {
            try {
                const imagePath = path.join(__dirname, '../../public', skill.image_url);
                await fs.unlink(imagePath);
            } catch (error) {
                console.warn('Failed to delete skill image:', error.message);
            }
        }

        // Soft delete - mark as inactive instead of hard delete to preserve data integrity
        await db.query(
            'UPDATE skills SET active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );

        res.json({
            message: 'Skill deleted successfully'
        });

    } catch (error) {
        console.error('Delete skill error:', error);
        res.status(500).json({
            error: 'Failed to delete skill',
            code: 'SKILL_DELETE_ERROR'
        });
    }
});

// Add/remove skill from favorites
router.post('/:id/favorite', authMiddleware, validateUUIDParam(), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if skill exists and is active
        const skillResult = await db.query(
            'SELECT id FROM skills WHERE id = $1 AND active = true',
            [id]
        );

        if (skillResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Skill not found',
                code: 'SKILL_NOT_FOUND'
            });
        }

        // Check if already favorited
        const existingFavorite = await db.query(
            'SELECT id FROM user_favorites WHERE user_id = $1 AND skill_id = $2',
            [req.user.id, id]
        );

        if (existingFavorite.rows.length > 0) {
            // Remove from favorites
            await db.query(
                'DELETE FROM user_favorites WHERE user_id = $1 AND skill_id = $2',
                [req.user.id, id]
            );

            res.json({
                message: 'Skill removed from favorites',
                favorited: false
            });
        } else {
            // Add to favorites
            await db.query(
                'INSERT INTO user_favorites (user_id, skill_id) VALUES ($1, $2)',
                [req.user.id, id]
            );

            res.json({
                message: 'Skill added to favorites',
                favorited: true
            });
        }

    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({
            error: 'Failed to toggle favorite',
            code: 'FAVORITE_TOGGLE_ERROR'
        });
    }
});

// Get user's skills
router.get('/user/:userId', optionalAuthMiddleware, validatePagination, async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20, active_only = true } = req.query;
        const offset = (page - 1) * limit;

        // Build WHERE clause
        let whereCondition = 's.user_id = $1';
        if (active_only === 'true') {
            whereCondition += ' AND s.active = true';
        }

        const skillsQuery = `
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
            WHERE ${whereCondition}
            GROUP BY s.id, sc.id
            ORDER BY s.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(skillsQuery, [userId, limit, offset]);

        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) as total FROM skills s WHERE ${whereCondition}`,
            [userId]
        );
        
        const total = parseInt(countResult.rows[0].total);

        res.json({
            skills: result.rows,
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
        console.error('Get user skills error:', error);
        res.status(500).json({
            error: 'Failed to fetch user skills',
            code: 'USER_SKILLS_FETCH_ERROR'
        });
    }
});

module.exports = router;