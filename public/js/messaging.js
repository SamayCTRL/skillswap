/**
 * Real-time Messaging Component
 * Handles the messaging interface, chat functionality, and real-time communication
 */

class MessagingComponent {
    constructor() {
        this.conversations = [];
        this.currentConversation = null;
        this.messages = [];
        this.unreadCount = 0;
        this.typingTimeouts = new Map();
        this.isTyping = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadConversations();
        this.setupSocketListeners();
    }

    bindEvents() {
        // Message input events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="send-message"]')) {
                this.sendMessage();
            }
            if (e.target.matches('[data-conversation-id]')) {
                const conversationId = e.target.dataset.conversationId;
                this.openConversation(conversationId);
            }
            if (e.target.matches('[data-action="start-conversation"]')) {
                this.showNewConversationModal();
            }
            if (e.target.matches('[data-action="delete-message"]')) {
                const messageId = e.target.dataset.messageId;
                this.deleteMessage(messageId);
            }
        });

        // Message input keypress
        document.addEventListener('keypress', (e) => {
            if (e.target.matches('#message-input')) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                } else {
                    this.handleTyping();
                }
            }
        });

        // Stop typing when input loses focus
        document.addEventListener('blur', (e) => {
            if (e.target.matches('#message-input')) {
                this.stopTyping();
            }
        }, true);
    }

    setupSocketListeners() {
        if (!window.SkillSwap?.socketManager) return;

        const socket = window.SkillSwap.socketManager.socket;

        // Listen for new messages
        socket.on('new_message', (data) => {
            this.handleNewMessage(data);
        });

        // Listen for typing indicators
        socket.on('user_typing', (data) => {
            this.handleUserTyping(data);
        });

        // Listen for user online/offline status
        socket.on('user_online', (data) => {
            this.updateUserStatus(data.userId, true);
        });

        socket.on('user_offline', (data) => {
            this.updateUserStatus(data.userId, false);
        });

        // Listen for message read receipts
        socket.on('messages_read', (data) => {
            this.handleMessagesRead(data);
        });
    }

    async loadConversations() {
        try {
            const response = await window.SkillSwap.apiClient.get('/messages/conversations');
            if (response.success) {
                this.conversations = response.data;
                this.renderConversationsList();
                this.updateUnreadCount();
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            window.SkillSwap.notificationManager.show('Failed to load conversations', 'error');
        }
    }

    async openConversation(conversationId) {
        try {
            this.currentConversation = conversationId;
            
            // Join conversation room
            if (window.SkillSwap?.socketManager) {
                window.SkillSwap.socketManager.joinConversation(conversationId);
            }

            // Load messages
            const response = await window.SkillSwap.apiClient.get(`/messages/conversations/${conversationId}/messages`);
            if (response.success) {
                this.messages = response.data;
                this.renderMessages();
                this.markMessagesAsRead(conversationId);
                this.scrollToBottom();
            }

            // Update UI
            this.updateConversationActiveState();
            this.showMessagingInterface();
        } catch (error) {
            console.error('Failed to open conversation:', error);
            window.SkillSwap.notificationManager.show('Failed to load conversation', 'error');
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const content = messageInput?.value.trim();

        if (!content || !this.currentConversation) return;

        try {
            // Optimistically add message to UI
            const tempMessage = {
                id: 'temp-' + Date.now(),
                content,
                sender_id: window.SkillSwap.authManager.currentUser.id,
                sender_name: window.SkillSwap.authManager.currentUser.name,
                timestamp: new Date().toISOString(),
                read_status: false,
                sending: true
            };

            this.messages.push(tempMessage);
            this.renderMessages();
            this.scrollToBottom();

            // Clear input
            messageInput.value = '';
            this.stopTyping();

            // Send message via API
            const response = await window.SkillSwap.apiClient.post(
                `/messages/conversations/${this.currentConversation}/messages`,
                { content }
            );

            if (response.success) {
                // Replace temp message with real message
                const messageIndex = this.messages.findIndex(m => m.id === tempMessage.id);
                if (messageIndex !== -1) {
                    this.messages[messageIndex] = response.data;
                    this.renderMessages();
                }

                // Update conversation list
                this.updateConversationLastMessage(this.currentConversation, response.data);
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            
            // Remove temp message on failure
            this.messages = this.messages.filter(m => !m.id.startsWith('temp-'));
            this.renderMessages();
            
            window.SkillSwap.notificationManager.show('Failed to send message', 'error');
        }
    }

    async deleteMessage(messageId) {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            await window.SkillSwap.apiClient.delete(`/messages/${messageId}`);
            
            // Remove message from UI
            this.messages = this.messages.filter(m => m.id !== messageId);
            this.renderMessages();
            
            window.SkillSwap.notificationManager.show('Message deleted', 'success');
        } catch (error) {
            console.error('Failed to delete message:', error);
            window.SkillSwap.notificationManager.show('Failed to delete message', 'error');
        }
    }

    handleNewMessage(messageData) {
        // Add message to current conversation if it matches
        if (this.currentConversation && messageData.conversation_id === this.currentConversation) {
            this.messages.push(messageData);
            this.renderMessages();
            this.scrollToBottom();
            
            // Mark as read immediately if conversation is open
            this.markMessagesAsRead(this.currentConversation);
        }

        // Update conversation list
        this.updateConversationLastMessage(messageData.conversation_id, messageData);
        this.updateUnreadCount();

        // Show notification if not current conversation
        if (!this.currentConversation || messageData.conversation_id !== this.currentConversation) {
            window.SkillSwap.notificationManager.show(
                `New message from ${messageData.sender_name}`,
                'info'
            );
        }
    }

    handleUserTyping(data) {
        if (data.conversationId !== this.currentConversation) return;

        const typingIndicator = document.getElementById('typing-indicator');
        if (!typingIndicator) return;

        if (data.isTyping) {
            typingIndicator.textContent = `${data.userName} is typing...`;
            typingIndicator.style.display = 'block';
            
            // Clear existing timeout
            if (this.typingTimeouts.has(data.userId)) {
                clearTimeout(this.typingTimeouts.get(data.userId));
            }
            
            // Set timeout to hide typing indicator
            const timeout = setTimeout(() => {
                typingIndicator.style.display = 'none';
                this.typingTimeouts.delete(data.userId);
            }, 3000);
            
            this.typingTimeouts.set(data.userId, timeout);
        } else {
            typingIndicator.style.display = 'none';
            if (this.typingTimeouts.has(data.userId)) {
                clearTimeout(this.typingTimeouts.get(data.userId));
                this.typingTimeouts.delete(data.userId);
            }
        }
    }

    handleTyping() {
        if (!this.isTyping && this.currentConversation && window.SkillSwap?.socketManager) {
            this.isTyping = true;
            window.SkillSwap.socketManager.startTyping(this.currentConversation);
            
            // Stop typing after 3 seconds of inactivity
            setTimeout(() => {
                this.stopTyping();
            }, 3000);
        }
    }

    stopTyping() {
        if (this.isTyping && this.currentConversation && window.SkillSwap?.socketManager) {
            this.isTyping = false;
            window.SkillSwap.socketManager.stopTyping(this.currentConversation);
        }
    }

    async markMessagesAsRead(conversationId) {
        try {
            const unreadMessages = this.messages.filter(m => 
                !m.read_status && m.sender_id !== window.SkillSwap.authManager.currentUser.id
            );

            if (unreadMessages.length > 0 && window.SkillSwap?.socketManager) {
                window.SkillSwap.socketManager.markMessagesRead(conversationId, unreadMessages.map(m => m.id));
            }
        } catch (error) {
            console.error('Failed to mark messages as read:', error);
        }
    }

    handleMessagesRead(data) {
        // Update message read status in current conversation
        if (this.currentConversation === data.conversationId) {
            data.messageIds.forEach(messageId => {
                const message = this.messages.find(m => m.id === messageId);
                if (message) {
                    message.read_status = true;
                }
            });
            this.renderMessages();
        }
    }

    updateUserStatus(userId, isOnline) {
        // Update user status in conversation list
        this.conversations.forEach(conversation => {
            if (conversation.other_user_id === userId) {
                conversation.other_user_online = isOnline;
            }
        });
        this.renderConversationsList();
    }

    updateConversationLastMessage(conversationId, message) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation) {
            conversation.last_message = message.content;
            conversation.last_message_at = message.timestamp;
            conversation.last_sender_name = message.sender_name;
            
            // Move conversation to top
            this.conversations = [
                conversation,
                ...this.conversations.filter(c => c.id !== conversationId)
            ];
            
            this.renderConversationsList();
        }
    }

    updateUnreadCount() {
        this.unreadCount = this.conversations.reduce((count, conversation) => {
            return count + (conversation.unread_count || 0);
        }, 0);

        // Update UI badge
        const badge = document.querySelector('[data-unread-count]');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'inline-block' : 'none';
        }
    }

    updateConversationActiveState() {
        document.querySelectorAll('[data-conversation-id]').forEach(el => {
            el.classList.remove('active');
        });
        
        const activeElement = document.querySelector(`[data-conversation-id="${this.currentConversation}"]`);
        if (activeElement) {
            activeElement.classList.add('active');
        }
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    showNewConversationModal() {
        // This would show a modal to start a new conversation
        // Implementation depends on the UI framework being used
        console.log('Show new conversation modal');
    }

    showMessagingInterface() {
        const messagingInterface = document.getElementById('messaging-interface');
        if (messagingInterface) {
            messagingInterface.style.display = 'block';
        }
    }

    renderConversationsList() {
        const container = document.getElementById('conversations-list');
        if (!container) return;

        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="message-circle"></i>
                    <p>No conversations yet</p>
                    <button class="btn btn-primary" data-action="start-conversation">
                        Start a conversation
                    </button>
                </div>
            `;
            window.SkillSwap.uiManager.initLucideIcons();
            return;
        }

        container.innerHTML = this.conversations.map(conversation => `
            <div class="conversation-item ${conversation.id === this.currentConversation ? 'active' : ''}" 
                 data-conversation-id="${conversation.id}">
                <div class="conversation-avatar">
                    <img src="${conversation.other_user_avatar || '/assets/default-avatar.svg'}" 
                         alt="${conversation.other_user_name}">
                    ${conversation.other_user_online ? '<span class="online-indicator"></span>' : ''}
                </div>
                <div class="conversation-content">
                    <div class="conversation-header">
                        <h4>${conversation.other_user_name}</h4>
                        <span class="conversation-time">
                            ${window.SkillSwap.uiManager.formatTimeAgo(conversation.last_message_at)}
                        </span>
                    </div>
                    <div class="conversation-preview">
                        <span class="last-message">
                            ${conversation.last_sender_name === window.SkillSwap.authManager.currentUser.name ? 'You: ' : ''}
                            ${window.SkillSwap.uiManager.truncateText(conversation.last_message || 'No messages yet', 50)}
                        </span>
                        ${conversation.unread_count > 0 ? `<span class="unread-badge">${conversation.unread_count}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderMessages() {
        const container = document.getElementById('messages-container');
        if (!container) return;

        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="message-circle"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            window.SkillSwap.uiManager.initLucideIcons();
            return;
        }

        const currentUserId = window.SkillSwap.authManager.currentUser.id;
        
        container.innerHTML = this.messages.map(message => {
            const isOwn = message.sender_id === currentUserId;
            const showAvatar = !isOwn;
            
            return `
                <div class="message ${isOwn ? 'message-own' : 'message-other'} ${message.sending ? 'message-sending' : ''}">
                    ${showAvatar ? `
                        <div class="message-avatar">
                            <img src="${message.sender_avatar || '/assets/default-avatar.svg'}" 
                                 alt="${message.sender_name}">
                        </div>
                    ` : ''}
                    <div class="message-content">
                        <div class="message-bubble">
                            <p>${window.SkillSwap.uiManager.escapeHtml(message.content)}</p>
                            ${isOwn ? `
                                <button class="message-delete" data-action="delete-message" data-message-id="${message.id}">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="message-meta">
                            <span class="message-time">
                                ${window.SkillSwap.uiManager.formatTime(message.timestamp)}
                            </span>
                            ${isOwn && message.read_status ? '<i data-lucide="check-check" class="read-indicator"></i>' : ''}
                            ${message.sending ? '<i data-lucide="clock" class="sending-indicator"></i>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        window.SkillSwap.uiManager.initLucideIcons();
    }

    // Public API
    openConversationWithUser(userId) {
        // Find or create conversation with specific user
        const existingConversation = this.conversations.find(c => c.other_user_id === userId);
        if (existingConversation) {
            this.openConversation(existingConversation.id);
        } else {
            this.createConversationWithUser(userId);
        }
    }

    async createConversationWithUser(userId) {
        try {
            const response = await window.SkillSwap.apiClient.post('/messages/conversations', {
                participant_id: userId
            });
            
            if (response.success) {
                this.conversations.unshift(response.data);
                this.renderConversationsList();
                this.openConversation(response.data.id);
            }
        } catch (error) {
            console.error('Failed to create conversation:', error);
            window.SkillSwap.notificationManager.show('Failed to start conversation', 'error');
        }
    }

    refresh() {
        this.loadConversations();
        if (this.currentConversation) {
            this.openConversation(this.currentConversation);
        }
    }

    destroy() {
        // Clean up event listeners and timers
        this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
        this.typingTimeouts.clear();
        
        if (this.isTyping) {
            this.stopTyping();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessagingComponent;
} else {
    window.MessagingComponent = MessagingComponent;
}