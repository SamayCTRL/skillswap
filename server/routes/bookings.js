const express = require('express');
const db = require('../config/database');
const { bookingLimiter } = require('../middleware/rateLimiter');
const { usageLimitMiddleware } = require('../middleware/auth');
const { validateBooking, validateBookingStatusUpdate, validatePagination, validateUUIDParam } = require('../middleware/validation');

const router = express.Router();

// Create booking
router.post('/', bookingLimiter, usageLimitMiddleware('booking'), validateBooking, async (req, res) => {
    try {
        const { skill_id, scheduled_time, participants = 1, notes } = req.body;

        // Get skill details and check availability
        const skillResult = await db.query(
            'SELECT user_id, price, max_participants, title FROM skills WHERE id = $1 AND active = true',
            [skill_id]
        );

        if (skillResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Skill not found',
                code: 'SKILL_NOT_FOUND'
            });
        }

        const skill = skillResult.rows[0];

        if (skill.user_id === req.user.id) {
            return res.status(400).json({
                error: 'Cannot book your own skill',
                code: 'SELF_BOOKING_ERROR'
            });
        }

        if (participants > skill.max_participants) {
            return res.status(400).json({
                error: `Maximum ${skill.max_participants} participants allowed`,
                code: 'PARTICIPANT_LIMIT_EXCEEDED'
            });
        }

        // Create booking
        const bookingQuery = `
            INSERT INTO bookings (skill_id, requester_id, provider_id, scheduled_time, 
                                price, participants, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, created_at
        `;

        const result = await db.query(bookingQuery, [
            skill_id, req.user.id, skill.user_id, scheduled_time,
            skill.price, participants, notes
        ]);

        const booking = result.rows[0];

        // Create notification for provider
        await db.query(
            'INSERT INTO notifications (user_id, type, title, content, related_id) VALUES ($1, $2, $3, $4, $5)',
            [
                skill.user_id,
                'booking',
                'New Booking Request',
                `${req.user.name} requested to book "${skill.title}"`,
                booking.id
            ]
        );

        // Update usage tracking
        await db.updateUsageTracking(req.user.id, 'booking');

        res.status(201).json({
            message: 'Booking created successfully',
            booking_id: booking.id,
            created_at: booking.created_at
        });

    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({
            error: 'Failed to create booking',
            code: 'BOOKING_CREATE_ERROR'
        });
    }
});

// Get user's sent booking requests
router.get('/sent', validatePagination, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        let whereCondition = 'b.requester_id = $1';
        const queryParams = [req.user.id, limit, offset];
        
        if (status) {
            whereCondition += ' AND b.status = $4';
            queryParams.push(status);
        }

        const bookingsQuery = `
            SELECT 
                b.id, b.scheduled_time, b.status, b.price, b.participants, 
                b.notes, b.created_at,
                s.title as skill_title, s.image_url as skill_image,
                u.name as provider_name, u.avatar_url as provider_avatar
            FROM bookings b
            INNER JOIN skills s ON b.skill_id = s.id
            INNER JOIN users u ON b.provider_id = u.id
            WHERE ${whereCondition}
            ORDER BY b.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(bookingsQuery, queryParams);

        res.json({
            bookings: result.rows
        });

    } catch (error) {
        console.error('Get sent bookings error:', error);
        res.status(500).json({
            error: 'Failed to fetch sent bookings',
            code: 'BOOKINGS_FETCH_ERROR'
        });
    }
});

// Get user's received booking requests
router.get('/received', validatePagination, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        let whereCondition = 'b.provider_id = $1';
        const queryParams = [req.user.id, limit, offset];
        
        if (status) {
            whereCondition += ' AND b.status = $4';
            queryParams.push(status);
        }

        const bookingsQuery = `
            SELECT 
                b.id, b.scheduled_time, b.status, b.price, b.participants, 
                b.notes, b.created_at,
                s.title as skill_title, s.image_url as skill_image,
                u.name as requester_name, u.avatar_url as requester_avatar
            FROM bookings b
            INNER JOIN skills s ON b.skill_id = s.id
            INNER JOIN users u ON b.requester_id = u.id
            WHERE ${whereCondition}
            ORDER BY b.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(bookingsQuery, queryParams);

        res.json({
            bookings: result.rows
        });

    } catch (error) {
        console.error('Get received bookings error:', error);
        res.status(500).json({
            error: 'Failed to fetch received bookings',
            code: 'BOOKINGS_FETCH_ERROR'
        });
    }
});

// Update booking status
router.put('/:id/status', validateBookingStatusUpdate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, cancellation_reason, meeting_url } = req.body;

        // Check if booking exists and user is involved
        const bookingResult = await db.query(
            'SELECT * FROM bookings WHERE id = $1 AND (provider_id = $2 OR requester_id = $2)',
            [id, req.user.id]
        );

        if (bookingResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Booking not found or access denied',
                code: 'BOOKING_NOT_FOUND'
            });
        }

        const booking = bookingResult.rows[0];

        // Only provider can confirm, both can cancel
        if (status === 'confirmed' && booking.provider_id !== req.user.id) {
            return res.status(403).json({
                error: 'Only skill provider can confirm bookings',
                code: 'UNAUTHORIZED'
            });
        }

        // Update booking
        const updateQuery = `
            UPDATE bookings 
            SET status = $1, cancellation_reason = $2, meeting_url = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `;

        const result = await db.query(updateQuery, [status, cancellation_reason, meeting_url, id]);
        const updatedBooking = result.rows[0];

        // Create notification for the other party
        const notificationUserId = booking.provider_id === req.user.id 
            ? booking.requester_id 
            : booking.provider_id;

        let notificationTitle = '';
        let notificationContent = '';

        switch (status) {
            case 'confirmed':
                notificationTitle = 'Booking Confirmed';
                notificationContent = 'Your booking request has been confirmed!';
                break;
            case 'cancelled':
                notificationTitle = 'Booking Cancelled';
                notificationContent = 'A booking has been cancelled.';
                break;
            case 'completed':
                notificationTitle = 'Booking Completed';
                notificationContent = 'A booking has been marked as completed.';
                break;
        }

        await db.query(
            'INSERT INTO notifications (user_id, type, title, content, related_id) VALUES ($1, $2, $3, $4, $5)',
            [notificationUserId, 'booking', notificationTitle, notificationContent, id]
        );

        res.json({
            message: 'Booking status updated successfully',
            booking: updatedBooking
        });

    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({
            error: 'Failed to update booking status',
            code: 'BOOKING_UPDATE_ERROR'
        });
    }
});

module.exports = router;