// Socket.io Manager for real-time features
class SocketManager {
    constructor(url, token) {
        this.url = url;
        this.token = token;
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }
    
    // Connect to socket server
    async connect() {
        try {
            this.socket = io(this.url, {
                auth: {
                    token: this.token
                },
                timeout: 10000,
                retries: 3
            });
            
            this.setupEventHandlers();
            
            return new Promise((resolve, reject) => {
                this.socket.on('connect', () => {
                    console.log('✅ Socket connected:', this.socket.id);
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                });
                
                this.socket.on('connect_error', (error) => {
                    console.error('❌ Socket connection error:', error);
                    this.connected = false;
                    reject(error);
                });
            });
            
        } catch (error) {
            console.error('Failed to initialize socket:', error);
            throw error;
        }
    }
    
    // Disconnect from socket server
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }
    
    // Check if connected
    isConnected() {
        return this.connected && this.socket && this.socket.connected;
    }
    
    // Setup socket event handlers
    setupEventHandlers() {
        if (!this.socket) return;
        
        // Connection events
        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            this.connected = false;
            
            // Auto-reconnect for certain reasons
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, don't reconnect
                return;
            }
            
            this.attemptReconnect();
        });
        
        // Message events
        this.socket.on('new_message', (data) => {
            this.handleNewMessage(data);
        });
        
        this.socket.on('user_typing', (data) => {
            this.handleUserTyping(data);
        });
        
        this.socket.on('user_stopped_typing', (data) => {
            this.handleUserStoppedTyping(data);
        });
        
        this.socket.on('messages_read', (data) => {
            this.handleMessagesRead(data);
        });
        
        // User presence events
        this.socket.on('user_online', (data) => {
            this.handleUserOnline(data);
        });
        
        this.socket.on('user_offline', (data) => {
            this.handleUserOffline(data);
        });
        
        // Notification events
        this.socket.on('notification', (data) => {
            this.handleNotification(data);
        });
        
        // Booking events
        this.socket.on('booking_notification', (data) => {
            this.handleBookingNotification(data);
        });
        
        // Video call events
        this.socket.on('video_call_invitation', (data) => {
            this.handleVideoCallInvitation(data);
        });
        
        // Error handling
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
        
        this.socket.on('message_limit_reached', (data) => {
            window.SkillSwap.notifications.warning(data.message, 8000, {
                title: 'Message Limit Reached'
            });
        });
    }
    
    // Attempt to reconnect
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            window.SkillSwap.notifications.error('Connection lost. Please refresh the page.', 0);
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            this.connect().catch(() => {
                this.attemptReconnect();
            });
        }, delay);
    }
    
    // Join conversation room
    joinConversation(conversationId) {
        if (this.isConnected()) {
            this.socket.emit('join_conversation', conversationId);
        }
    }
    
    // Leave conversation room
    leaveConversation(conversationId) {
        if (this.isConnected()) {
            this.socket.emit('leave_conversation', conversationId);
        }
    }
    
    // Send message
    sendMessage(conversationId, content, messageType = 'text') {
        if (this.isConnected()) {
            this.socket.emit('send_message', {
                conversationId,
                content,
                messageType
            });
        }
    }
    
    // Send typing indicator
    startTyping(conversationId) {
        if (this.isConnected()) {
            this.socket.emit('typing_start', { conversationId });
        }
    }
    
    // Stop typing indicator
    stopTyping(conversationId) {
        if (this.isConnected()) {
            this.socket.emit('typing_stop', { conversationId });
        }
    }
    
    // Mark messages as read
    markMessagesRead(conversationId) {
        if (this.isConnected()) {
            this.socket.emit('mark_messages_read', { conversationId });
        }
    }
    
    // Handle new message
    handleNewMessage(data) {
        console.log('New message received:', data);
        
        // Update conversation list if on messages page
        if (window.location.pathname === '/messages') {
            this.updateConversationsList(data);
        }
        
        // Update unread count
        this.updateUnreadCount(1);
        
        // Show notification if not on messages page or conversation not active
        if (window.location.pathname !== '/messages' || !this.isConversationActive(data.conversationId)) {
            window.SkillSwap.notifications.info(
                `New message from ${data.senderName}`,
                5000,
                {
                    title: 'New Message',
                    icon: 'message-circle'
                }
            );
        }
    }
    
    // Handle user typing
    handleUserTyping(data) {
        if (this.isConversationActive(data.conversationId)) {
            this.showTypingIndicator(data.userName);
        }
    }
    
    // Handle user stopped typing
    handleUserStoppedTyping(data) {
        if (this.isConversationActive(data.conversationId)) {
            this.hideTypingIndicator(data.userId);
        }
    }
    
    // Handle messages read
    handleMessagesRead(data) {
        if (this.isConversationActive(data.conversationId)) {
            this.markMessagesAsRead(data.conversationId);
        }
    }
    
    // Handle user online
    handleUserOnline(data) {
        this.updateUserPresence(data.userId, true);
    }
    
    // Handle user offline
    handleUserOffline(data) {
        this.updateUserPresence(data.userId, false, data.lastSeen);
    }
    
    // Handle notification
    handleNotification(data) {
        window.SkillSwap.notifications.info(data.content, 6000, {
            title: data.title
        });
        
        // Update notifications count
        this.updateNotificationsCount(1);
    }
    
    // Handle booking notification
    handleBookingNotification(data) {
        window.SkillSwap.notifications.info(data.message, 8000, {
            title: 'Booking Update',
            icon: 'calendar'
        });
    }
    
    // Handle video call invitation
    handleVideoCallInvitation(data) {
        const accept = confirm(`${data.from.name} is inviting you to a video call for "${data.skillTitle}". Accept?`);
        
        if (accept) {
            // Open Jitsi Meet room
            this.joinVideoCall(data.roomName);
        }
    }
    
    // Utility methods
    isConversationActive(conversationId) {
        // Check if user is currently viewing this conversation
        return window.location.pathname === '/messages' && 
               document.querySelector(`[data-conversation-id="${conversationId}"]`)?.classList.contains('active');
    }
    
    updateConversationsList(messageData) {
        // Update the conversations list with new message data
        const conversationElement = document.querySelector(`[data-conversation-id="${messageData.conversationId}"]`);
        if (conversationElement) {
            // Update last message preview and timestamp
            const lastMessageElement = conversationElement.querySelector('.last-message');
            if (lastMessageElement) {
                lastMessageElement.textContent = messageData.content;
            }
            
            const timestampElement = conversationElement.querySelector('.timestamp');
            if (timestampElement) {
                timestampElement.textContent = window.SkillSwap.utils.formatRelativeTime(messageData.timestamp);
            }
            
            // Move conversation to top of list
            const conversationsList = conversationElement.parentNode;
            conversationsList.insertBefore(conversationElement, conversationsList.firstChild);
        }
    }
    
    updateUnreadCount(increment) {
        const badges = document.querySelectorAll('#unread-messages-badge, #mobile-unread-badge');
        badges.forEach(badge => {
            const currentCount = parseInt(badge.textContent) || 0;
            const newCount = currentCount + increment;
            
            if (newCount > 0) {
                badge.textContent = newCount > 99 ? '99+' : newCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    }
    
    updateNotificationsCount(increment) {
        const badge = document.getElementById('notifications-badge');
        if (badge) {
            const currentCount = parseInt(badge.textContent) || 0;
            const newCount = currentCount + increment;
            
            if (newCount > 0) {
                badge.textContent = newCount > 99 ? '99+' : newCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }
    
    showTypingIndicator(userName) {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.textContent = `${userName} is typing...`;
            indicator.style.display = 'block';
        }
    }
    
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    markMessagesAsRead(conversationId) {
        const messages = document.querySelectorAll(`[data-conversation-id="${conversationId}"] .message.sent`);
        messages.forEach(message => {
            message.classList.add('read');
        });
    }
    
    updateUserPresence(userId, isOnline, lastSeen = null) {
        const presenceIndicators = document.querySelectorAll(`[data-user-id="${userId}"] .presence-indicator`);
        presenceIndicators.forEach(indicator => {
            if (isOnline) {
                indicator.classList.add('online');
                indicator.classList.remove('offline');
                indicator.title = 'Online';
            } else {
                indicator.classList.add('offline');
                indicator.classList.remove('online');
                indicator.title = lastSeen ? `Last seen ${window.SkillSwap.utils.formatRelativeTime(lastSeen)}` : 'Offline';
            }
        });
    }
    
    joinVideoCall(roomName) {
        if (typeof JitsiMeetExternalAPI !== 'undefined') {
            const domain = 'meet.jit.si';
            const options = {
                roomName: roomName,
                width: '100%',
                height: 600,
                parentNode: document.getElementById('video-call-container') || document.body,
                configOverwrite: {
                    startWithAudioMuted: false,
                    startWithVideoMuted: false
                }
            };
            
            new JitsiMeetExternalAPI(domain, options);
        } else {
            // Fallback to opening in new window
            window.open(`https://meet.jit.si/${roomName}`, '_blank');
        }
    }
}