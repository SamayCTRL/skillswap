const express = require('express');
const db = require('../config/database');
const { messageLimiter } = require('../middleware/rateLimiter');
const { usageLimitMiddleware } = require('../middleware/auth');
const { validateMessage, validatePagination, validateUUIDParam } = require('../middleware/validation');

const router = express.Router();

// Get user's conversations
router.get('/conversations', validatePagination, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const conversationsQuery = `
            SELECT 
                c.id, c.last_message_at, c.created_at,
                CASE 
                    WHEN c.participant1_id = $1 THEN u2.id
                    ELSE u1.id
                END as other_user_id,
                CASE 
                    WHEN c.participant1_id = $1 THEN u2.name
                    ELSE u1.name
                END as other_user_name,
                CASE 
                    WHEN c.participant1_id = $1 THEN u2.avatar_url
                    ELSE u1.avatar_url
                END as other_user_avatar,
                CASE 
                    WHEN c.participant1_id = $1 THEN u2.verified
                    ELSE u1.verified
                END as other_user_verified,
                m.content as last_message_content,
                m.sender_id as last_message_sender_id,
                m.timestamp as last_message_timestamp,
                COUNT(unread.id) as unread_count
            FROM conversations c
            INNER JOIN users u1 ON c.participant1_id = u1.id
            INNER JOIN users u2 ON c.participant2_id = u2.id
            LEFT JOIN messages m ON c.id = m.conversation_id 
                AND m.timestamp = c.last_message_at
            LEFT JOIN messages unread ON c.id = unread.conversation_id 
                AND unread.sender_id != $1 AND unread.read_status = false
            WHERE c.participant1_id = $1 OR c.participant2_id = $1
            GROUP BY c.id, u1.id, u2.id, m.content, m.sender_id, m.timestamp
            ORDER BY c.last_message_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(conversationsQuery, [req.user.id, limit, offset]);

        const totalQuery = `
            SELECT COUNT(*) as total
            FROM conversations c
            WHERE c.participant1_id = $1 OR c.participant2_id = $1
        `;

        const totalResult = await db.query(totalQuery, [req.user.id]);
        const total = parseInt(totalResult.rows[0].total);

        res.json({
            conversations: result.rows.map(row => ({
                id: row.id,
                other_user: {
                    id: row.other_user_id,
                    name: row.other_user_name,
                    avatar_url: row.other_user_avatar,
                    verified: row.other_user_verified
                },
                last_message: {
                    content: row.last_message_content,
                    sender_id: row.last_message_sender_id,
                    timestamp: row.last_message_timestamp
                },
                unread_count: parseInt(row.unread_count),
                last_message_at: row.last_message_at,
                created_at: row.created_at
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
        console.error('Get conversations error:', error);
        res.status(500).json({
            error: 'Failed to fetch conversations',
            code: 'CONVERSATIONS_FETCH_ERROR'
        });
    }
});

// Get messages in a conversation
router.get('/conversations/:id/messages', validateUUIDParam('id'), validatePagination, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        // Check if user is participant in this conversation
        const conversationResult = await db.query(
            'SELECT id FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)',
            [id, req.user.id]
        );

        if (conversationResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Conversation not found or access denied',
                code: 'CONVERSATION_NOT_FOUND'
            });
        }

        const messagesQuery = `
            SELECT 
                m.id, m.content, m.message_type, m.file_url, 
                m.read_status, m.timestamp, m.sender_id,
                u.name as sender_name, u.avatar_url as sender_avatar
            FROM messages m
            INNER JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = $1
            ORDER BY m.timestamp DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(messagesQuery, [id, limit, offset]);

        // Mark messages as read
        await db.query(
            'UPDATE messages SET read_status = true WHERE conversation_id = $1 AND sender_id != $2',
            [id, req.user.id]
        );

        const totalQuery = `
            SELECT COUNT(*) as total
            FROM messages
            WHERE conversation_id = $1
        `;

        const totalResult = await db.query(totalQuery, [id]);
        const total = parseInt(totalResult.rows[0].total);

        res.json({
            messages: result.rows.reverse(), // Show oldest first
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
        console.error('Get messages error:', error);
        res.status(500).json({
            error: 'Failed to fetch messages',
            code: 'MESSAGES_FETCH_ERROR'
        });
    }
});

// Send a message
router.post('/conversations/:id/messages', 
    messageLimiter, 
    usageLimitMiddleware('message'),
    validateUUIDParam('id'),
    validateMessage,
    async (req, res) => {
    try {
        const { id } = req.params;
        const { content, message_type = 'text', file_url } = req.body;

        // Check if user is participant in this conversation
        const conversationResult = await db.query(
            'SELECT participant1_id, participant2_id FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)',
            [id, req.user.id]
        );

        if (conversationResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Conversation not found or access denied',
                code: 'CONVERSATION_NOT_FOUND'
            });
        }

        const conversation = conversationResult.rows[0];

        // Insert message
        const messageQuery = `
            INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, content, message_type, file_url, timestamp
        `;

        const result = await db.query(messageQuery, [id, req.user.id, content, message_type, file_url]);
        const message = result.rows[0];

        // Update conversation's last_message_at
        await db.query(
            'UPDATE conversations SET last_message_at = $1 WHERE id = $2',
            [message.timestamp, id]
        );

        // Update usage tracking
        await db.updateUsageTracking(req.user.id, 'message');

        // Get recipient ID for notifications
        const recipientId = conversation.participant1_id === req.user.id 
            ? conversation.participant2_id 
            : conversation.participant1_id;

        // Create notification for recipient
        await db.query(
            'INSERT INTO notifications (user_id, type, title, content, related_id) VALUES ($1, $2, $3, $4, $5)',
            [
                recipientId,
                'message',
                'New Message',
                `${req.user.name} sent you a message`,
                id
            ]
        );

        res.status(201).json({
            message: 'Message sent successfully',
            data: {
                id: message.id,
                content: message.content,
                message_type: message.message_type,
                file_url: message.file_url,
                timestamp: message.timestamp,
                sender_id: req.user.id,
                sender_name: req.user.name
            }
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            error: 'Failed to send message',
            code: 'MESSAGE_SEND_ERROR'
        });
    }
});

// Create or get conversation with a user
router.post('/conversations', async (req, res) => {
    try {
        const { participant_id } = req.body;

        if (!participant_id) {
            return res.status(400).json({
                error: 'Participant ID is required',
                code: 'PARTICIPANT_ID_REQUIRED'
            });
        }

        if (participant_id === req.user.id) {
            return res.status(400).json({
                error: 'Cannot create conversation with yourself',
                code: 'SELF_CONVERSATION_ERROR'
            });
        }

        // Check if participant exists
        const participantExists = await db.userExists(participant_id);
        if (!participantExists) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Check if conversation already exists
        const existingConversationQuery = `
            SELECT id FROM conversations 
            WHERE (participant1_id = $1 AND participant2_id = $2)
               OR (participant1_id = $2 AND participant2_id = $1)
        `;

        const existing = await db.query(existingConversationQuery, [req.user.id, participant_id]);

        if (existing.rows.length > 0) {
            return res.json({
                message: 'Conversation already exists',
                conversation_id: existing.rows[0].id
            });
        }

        // Create new conversation
        const createConversationQuery = `
            INSERT INTO conversations (participant1_id, participant2_id)
            VALUES ($1, $2)
            RETURNING id, created_at
        `;

        const result = await db.query(createConversationQuery, [req.user.id, participant_id]);
        const conversation = result.rows[0];

        res.status(201).json({
            message: 'Conversation created successfully',
            conversation_id: conversation.id,
            created_at: conversation.created_at
        });

    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({
            error: 'Failed to create conversation',
            code: 'CONVERSATION_CREATE_ERROR'
        });
    }
});

// Get unread messages count
router.get('/unread-count', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT COUNT(*) as unread_count
             FROM messages m
             INNER JOIN conversations c ON m.conversation_id = c.id
             WHERE (c.participant1_id = $1 OR c.participant2_id = $1)
               AND m.sender_id != $1 
               AND m.read_status = false`,
            [req.user.id]
        );

        res.json({
            unread_count: parseInt(result.rows[0].unread_count)
        });

    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            error: 'Failed to fetch unread count',
            code: 'UNREAD_COUNT_ERROR'
        });
    }
});

// Delete a message (sender only)
router.delete('/:messageId', validateUUIDParam('messageId'), async (req, res) => {
    try {
        const { messageId } = req.params;

        // Check if message exists and user owns it
        const messageResult = await db.query(
            'SELECT sender_id FROM messages WHERE id = $1',
            [messageId]
        );

        if (messageResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Message not found',
                code: 'MESSAGE_NOT_FOUND'
            });
        }

        if (messageResult.rows[0].sender_id !== req.user.id) {
            return res.status(403).json({
                error: 'Not authorized to delete this message',
                code: 'UNAUTHORIZED'
            });
        }

        // Soft delete - replace content instead of hard delete
        await db.query(
            'UPDATE messages SET content = $1, message_type = $2 WHERE id = $3',
            ['This message was deleted', 'deleted', messageId]
        );

        res.json({
            message: 'Message deleted successfully'
        });

    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({
            error: 'Failed to delete message',
            code: 'MESSAGE_DELETE_ERROR'
        });
    }
});

module.exports = router;