const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../config/database');

// Store active connections
const activeUsers = new Map();

module.exports = (io) => {
    // Authentication middleware for socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
            
            if (!token) {
                return next(new Error('Authentication error'));
            }

            const cleanToken = token.replace('Bearer ', '');
            const decoded = jwt.verify(cleanToken, config.jwt.secret);
            
            // Get user details
            const user = await db.getUserById(decoded.userId);
            if (!user) {
                return next(new Error('User not found'));
            }

            socket.userId = user.id;
            socket.userName = user.name;
            socket.userAvatar = user.avatar_url;
            
            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User ${socket.userName} connected:`, socket.id);
        
        // Store user connection
        activeUsers.set(socket.userId, {
            socketId: socket.id,
            name: socket.userName,
            avatar: socket.userAvatar,
            lastSeen: new Date()
        });

        // Join user to their personal room for notifications
        socket.join(`user_${socket.userId}`);

        // Broadcast user online status to their conversations
        socket.broadcast.emit('user_online', {
            userId: socket.userId,
            name: socket.userName
        });

        // Handle joining conversation rooms
        socket.on('join_conversation', (conversationId) => {
            socket.join(`conversation_${conversationId}`);
            console.log(`User ${socket.userName} joined conversation: ${conversationId}`);
        });

        // Handle leaving conversation rooms
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(`conversation_${conversationId}`);
            console.log(`User ${socket.userName} left conversation: ${conversationId}`);
        });

        // Handle new messages
        socket.on('send_message', async (data) => {
            try {
                const { conversationId, content, messageType = 'text' } = data;

                // Verify user is part of this conversation
                const conversationResult = await db.query(
                    'SELECT participant1_id, participant2_id FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)',
                    [conversationId, socket.userId]
                );

                if (conversationResult.rows.length === 0) {
                    socket.emit('error', { message: 'Not authorized for this conversation' });
                    return;
                }

                const conversation = conversationResult.rows[0];

                // Check usage limits
                const canSendMessage = await db.checkUsageLimit(socket.userId, 'message');
                if (!canSendMessage) {
                    socket.emit('message_limit_reached', {
                        message: 'Monthly message limit reached. Upgrade your subscription to continue messaging.'
                    });
                    return;
                }

                // Insert message into database
                const messageResult = await db.query(
                    'INSERT INTO messages (conversation_id, sender_id, content, message_type) VALUES ($1, $2, $3, $4) RETURNING *',
                    [conversationId, socket.userId, content, messageType]
                );

                const message = messageResult.rows[0];

                // Update conversation last_message_at
                await db.query(
                    'UPDATE conversations SET last_message_at = $1 WHERE id = $2',
                    [message.timestamp, conversationId]
                );

                // Update usage tracking
                await db.updateUsageTracking(socket.userId, 'message');

                // Prepare message data to broadcast
                const messageData = {
                    id: message.id,
                    conversationId: message.conversation_id,
                    senderId: message.sender_id,
                    senderName: socket.userName,
                    senderAvatar: socket.userAvatar,
                    content: message.content,
                    messageType: message.message_type,
                    timestamp: message.timestamp
                };

                // Broadcast to conversation room
                io.to(`conversation_${conversationId}`).emit('new_message', messageData);

                // Send notification to offline recipient
                const recipientId = conversation.participant1_id === socket.userId 
                    ? conversation.participant2_id 
                    : conversation.participant1_id;

                const recipientOnline = activeUsers.has(recipientId);
                if (!recipientOnline) {
                    // Create notification for offline user
                    await db.query(
                        'INSERT INTO notifications (user_id, type, title, content, related_id) VALUES ($1, $2, $3, $4, $5)',
                        [
                            recipientId,
                            'message',
                            'New Message',
                            `${socket.userName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                            conversationId
                        ]
                    );
                }

                // Send to recipient's personal room if they're online
                io.to(`user_${recipientId}`).emit('conversation_updated', {
                    conversationId,
                    lastMessage: messageData,
                    unreadCount: 1
                });

            } catch (error) {
                console.error('Send message error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Handle typing indicators
        socket.on('typing_start', (data) => {
            const { conversationId } = data;
            socket.to(`conversation_${conversationId}`).emit('user_typing', {
                userId: socket.userId,
                userName: socket.userName,
                conversationId
            });
        });

        socket.on('typing_stop', (data) => {
            const { conversationId } = data;
            socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
                userId: socket.userId,
                conversationId
            });
        });

        // Handle message read status
        socket.on('mark_messages_read', async (data) => {
            try {
                const { conversationId } = data;

                // Mark messages as read
                await db.query(
                    'UPDATE messages SET read_status = true WHERE conversation_id = $1 AND sender_id != $2 AND read_status = false',
                    [conversationId, socket.userId]
                );

                // Notify sender that messages were read
                socket.to(`conversation_${conversationId}`).emit('messages_read', {
                    conversationId,
                    readById: socket.userId
                });

            } catch (error) {
                console.error('Mark messages read error:', error);
            }
        });

        // Handle booking updates
        socket.on('booking_update', (data) => {
            const { bookingId, recipientId, status, message } = data;
            
            io.to(`user_${recipientId}`).emit('booking_notification', {
                bookingId,
                status,
                message,
                timestamp: new Date()
            });
        });

        // Handle video call invitations
        socket.on('video_call_invite', (data) => {
            const { recipientId, roomName, skillTitle } = data;
            
            io.to(`user_${recipientId}`).emit('video_call_invitation', {
                from: {
                    id: socket.userId,
                    name: socket.userName,
                    avatar: socket.userAvatar
                },
                roomName,
                skillTitle,
                timestamp: new Date()
            });
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log(`User ${socket.userName} disconnected:`, reason);
            
            // Remove from active users
            activeUsers.delete(socket.userId);
            
            // Broadcast user offline status
            socket.broadcast.emit('user_offline', {
                userId: socket.userId,
                name: socket.userName,
                lastSeen: new Date()
            });

            // Update user's last activity in database
            db.updateUserActivity(socket.userId).catch(error => {
                console.error('Failed to update user activity:', error);
            });
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error('Socket error for user', socket.userName, ':', error);
        });
    });

    // Helper function to send notifications to users
    const sendNotificationToUser = (userId, notification) => {
        io.to(`user_${userId}`).emit('notification', notification);
    };

    // Helper function to check if user is online
    const isUserOnline = (userId) => {
        return activeUsers.has(userId);
    };

    // Helper function to get online users count
    const getOnlineUsersCount = () => {
        return activeUsers.size;
    };

    // Export helper functions for use in other parts of the app
    io.sendNotificationToUser = sendNotificationToUser;
    io.isUserOnline = isUserOnline;
    io.getOnlineUsersCount = getOnlineUsersCount;

    console.log('Socket.io messaging system initialized');
};