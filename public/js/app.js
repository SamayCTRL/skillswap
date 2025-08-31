// Skill Swap - Main Application

// Global application state and managers
window.SkillSwap = {
    // Core managers
    auth: null,
    router: null,
    ui: null,
    api: null,
    socket: null,
    messaging: null,
    notifications: null,
    
    // Application state
    user: null,
    isLoading: false,
    
    // Configuration
    config: {
        apiUrl: '/api',
        socketUrl: window.location.origin,
        version: '1.0.0'
    },
    
    // Utility functions
    utils: {
        // Format currency
        formatCurrency: (amount) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount);
        },
        
        // Format date
        formatDate: (date, options = {}) => {
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                ...options
            }).format(new Date(date));
        },
        
        // Format relative time
        formatRelativeTime: (date) => {
            const now = new Date();
            const diff = now - new Date(date);
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            if (days < 7) return `${days}d ago`;
            
            return SkillSwap.utils.formatDate(date);
        },
        
        // Debounce function
        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        // Throttle function
        throttle: (func, limit) => {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },
        
        // Escape HTML
        escapeHtml: (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        
        // Generate UUID
        generateUUID: () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        
        // Validate email
        isValidEmail: (email) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },
        
        // Get query parameters
        getQueryParams: () => {
            const params = new URLSearchParams(window.location.search);
            const result = {};
            for (const [key, value] of params) {
                result[key] = value;
            }
            return result;
        },
        
        // Set page title
        setPageTitle: (title) => {
            document.title = title ? `${title} - Skill Swap` : 'Skill Swap - Share Your Skills, Learn from Others';
        }
    }
};

// Initialize Lucide icons
const initializeIcons = () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

// Initialize application
const initializeApp = async () => {
    try {
        // Show loading spinner
        SkillSwap.ui = new UIManager();
        SkillSwap.ui.showLoading();
        
        // Initialize core managers
        SkillSwap.api = new ApiClient(SkillSwap.config.apiUrl);
        SkillSwap.auth = new AuthManager(SkillSwap.api);
        SkillSwap.router = new Router();
        SkillSwap.notifications = new NotificationManager();
        
        // Initialize icons
        initializeIcons();
        
        // Check authentication status
        const isAuthenticated = await SkillSwap.auth.checkAuth();
        
        if (isAuthenticated) {
            SkillSwap.user = SkillSwap.auth.getCurrentUser();
            
            // Initialize socket connection for authenticated users
            SkillSwap.socket = new SocketManager(SkillSwap.config.socketUrl, SkillSwap.auth.getToken());
            await SkillSwap.socket.connect();
            
            // Initialize messaging component
            if (typeof MessagingComponent !== 'undefined') {
                SkillSwap.messaging = new MessagingComponent();
            }
            
            // Update UI for authenticated user
            updateUIForAuthenticatedUser();
            
            // Load unread message count
            loadUnreadMessageCount();
            
            // Load notifications
            loadNotifications();
        } else {
            // Update UI for unauthenticated user
            updateUIForUnauthenticatedUser();
        }
        
        // Initialize router and load current page
        await SkillSwap.router.init();
        
        // Set up global event listeners
        setupEventListeners();
        
        // Hide loading spinner
        SkillSwap.ui.hideLoading();
        
        console.log('✅ Skill Swap application initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        SkillSwap.ui.hideLoading();
        SkillSwap.notifications.show('Failed to initialize application. Please refresh the page.', 'error');
    }
};

// Update UI for authenticated user
const updateUIForAuthenticatedUser = () => {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (authButtons) authButtons.classList.add('hidden');
    if (userMenu) userMenu.classList.remove('hidden');
    
    // Update user information in UI
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userTierBadge = document.getElementById('user-tier-badge');
    
    if (userAvatar && SkillSwap.user.avatar_url) {
        userAvatar.src = SkillSwap.user.avatar_url;
        userAvatar.alt = `${SkillSwap.user.name}'s avatar`;
    } else if (userAvatar) {
        userAvatar.src = '/assets/default-avatar.svg';
        userAvatar.alt = 'Default avatar';
    }
    
    if (userName) {
        userName.textContent = SkillSwap.user.name;
    }
    
    if (userTierBadge) {
        userTierBadge.textContent = SkillSwap.user.subscriptionTier.charAt(0).toUpperCase() + 
                                   SkillSwap.user.subscriptionTier.slice(1);
        userTierBadge.className = `tier-badge ${SkillSwap.user.subscriptionTier}`;
    }
};

// Update UI for unauthenticated user
const updateUIForUnauthenticatedUser = () => {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (authButtons) authButtons.classList.remove('hidden');
    if (userMenu) userMenu.classList.add('hidden');
};

// Load unread message count
const loadUnreadMessageCount = async () => {
    try {
        const response = await SkillSwap.api.get('/messages/unread-count');
        const count = response.unread_count;
        
        const badges = document.querySelectorAll('#unread-messages-badge, #mobile-unread-badge');
        badges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
        
    } catch (error) {
        console.error('Failed to load unread message count:', error);
    }
};

// Load notifications
const loadNotifications = async () => {
    try {
        const response = await SkillSwap.api.get('/notifications');
        const notifications = response.notifications || [];
        
        // Update notifications badge
        const unreadCount = notifications.filter(n => !n.read_status).length;
        const notificationsBadge = document.getElementById('notifications-badge');
        
        if (notificationsBadge) {
            if (unreadCount > 0) {
                notificationsBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                notificationsBadge.classList.remove('hidden');
            } else {
                notificationsBadge.classList.add('hidden');
            }
        }
        
        // Update notifications list
        const notificationsList = document.getElementById('notifications-list');
        if (notificationsList) {
            if (notifications.length === 0) {
                notificationsList.innerHTML = '<div class="empty-state"><p>No notifications yet</p></div>';
            } else {
                notificationsList.innerHTML = notifications.slice(0, 10).map(notification => `
                    <div class="notification-item ${!notification.read_status ? 'unread' : ''}" 
                         data-notification-id="${notification.id}">
                        <div class="notification-content">
                            <div class="notification-title">${SkillSwap.utils.escapeHtml(notification.title)}</div>
                            <div class="notification-text">${SkillSwap.utils.escapeHtml(notification.content)}</div>
                            <div class="notification-time">${SkillSwap.utils.formatRelativeTime(notification.created_at)}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
        
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
};

// Setup global event listeners
const setupEventListeners = () => {
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileNav = document.getElementById('mobile-nav');
    
    if (mobileMenuToggle && mobileNav) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileNav.classList.toggle('hidden');
        });
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        dropdowns.forEach(dropdown => {
            if (!dropdown.closest('.dropdown, .user-dropdown, .notification-bell').contains(event.target)) {
                dropdown.classList.add('hidden');
            }
        });
    });
    
    // Handle navigation clicks
    document.addEventListener('click', (event) => {
        const navLink = event.target.closest('.nav-link, .mobile-nav-link');
        if (navLink && navLink.dataset.page) {
            event.preventDefault();
            const page = navLink.dataset.page;
            SkillSwap.router.navigate(`/${page === 'home' ? '' : page}`);
        }
    });
    
    // Handle logo click
    document.addEventListener('click', (event) => {
        if (event.target.closest('.logo')) {
            event.preventDefault();
            SkillSwap.router.navigate('/');
        }
    });
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Escape key closes modals and dropdowns
        if (event.key === 'Escape') {
            closeModal();
            document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
                dropdown.classList.add('hidden');
            });
        }
        
        // Ctrl/Cmd + K opens search (if implemented)
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            // Open search modal (to be implemented)
        }
    });
    
    // Handle online/offline status
    window.addEventListener('online', () => {
        SkillSwap.notifications.show('You are back online!', 'success');
        if (SkillSwap.socket && !SkillSwap.socket.isConnected()) {
            SkillSwap.socket.connect();
        }
    });
    
    window.addEventListener('offline', () => {
        SkillSwap.notifications.show('You are offline. Some features may not work.', 'warning', 5000);
    });
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && SkillSwap.auth.isAuthenticated()) {
            // Refresh data when page becomes visible
            loadUnreadMessageCount();
            loadNotifications();
        }
    });
};

// Global functions for HTML onclick handlers
window.showLoginModal = () => {
    const template = document.getElementById('login-modal-template');
    const modalContainer = document.getElementById('modal-container');
    
    if (template && modalContainer) {
        modalContainer.innerHTML = template.innerHTML;
        initializeIcons();
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = modalContainer.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    }
};

window.showRegisterModal = () => {
    const template = document.getElementById('register-modal-template');
    const modalContainer = document.getElementById('modal-container');
    
    if (template && modalContainer) {
        modalContainer.innerHTML = template.innerHTML;
        initializeIcons();
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = modalContainer.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    }
};

window.closeModal = () => {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
        modalContainer.innerHTML = '';
    }
};

window.toggleUserDropdown = () => {
    const dropdown = document.getElementById('user-dropdown-menu');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
};

window.toggleNotifications = () => {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
};

window.markAllNotificationsRead = async () => {
    try {
        await SkillSwap.api.put('/notifications/mark-all-read');
        loadNotifications();
        SkillSwap.notifications.show('All notifications marked as read', 'success');
    } catch (error) {
        console.error('Failed to mark notifications as read:', error);
        SkillSwap.notifications.show('Failed to mark notifications as read', 'error');
    }
};

window.logout = async () => {
    try {
        await SkillSwap.auth.logout();
        SkillSwap.user = null;
        
        // Disconnect socket
        if (SkillSwap.socket) {
            SkillSwap.socket.disconnect();
            SkillSwap.socket = null;
        }
        
        // Update UI
        updateUIForUnauthenticatedUser();
        
        // Navigate to home
        SkillSwap.router.navigate('/');
        
        SkillSwap.notifications.show('You have been logged out', 'info');
    } catch (error) {
        console.error('Logout error:', error);
        SkillSwap.notifications.show('Failed to logout', 'error');
    }
};

window.handleLogin = async (event) => {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
        // Disable form
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Signing In...';
        
        // Attempt login
        const result = await SkillSwap.auth.login(email, password);
        
        if (result.success) {
            SkillSwap.user = result.user;
            
            // Initialize socket connection
            SkillSwap.socket = new SocketManager(SkillSwap.config.socketUrl, SkillSwap.auth.getToken());
            await SkillSwap.socket.connect();
            
            // Initialize messaging component
            if (typeof MessagingComponent !== 'undefined') {
                SkillSwap.messaging = new MessagingComponent();
            }
            
            // Update UI
            updateUIForAuthenticatedUser();
            
            // Load user data
            loadUnreadMessageCount();
            loadNotifications();
            
            // Close modal and show success
            closeModal();
            SkillSwap.notifications.show('Welcome back!', 'success');
            
            // Navigate to dashboard
            SkillSwap.router.navigate('/dashboard');
        } else {
            SkillSwap.notifications.show(result.error || 'Login failed', 'error');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        SkillSwap.notifications.show('Login failed. Please try again.', 'error');
    } finally {
        // Re-enable form
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
};

window.handleRegister = async (event) => {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!passwordRegex.test(password)) {
            SkillSwap.notifications.show('Password must contain uppercase, lowercase, number, and special character', 'error');
            return;
        }
        
        // Disable form
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Creating Account...';
        
        // Attempt registration
        const result = await SkillSwap.auth.register(name, email, password);
        
        if (result.success) {
            SkillSwap.user = result.user;
            
            // Initialize socket connection
            SkillSwap.socket = new SocketManager(SkillSwap.config.socketUrl, SkillSwap.auth.getToken());
            await SkillSwap.socket.connect();
            
            // Initialize messaging component
            if (typeof MessagingComponent !== 'undefined') {
                SkillSwap.messaging = new MessagingComponent();
            }
            
            // Update UI
            updateUIForAuthenticatedUser();
            
            // Load user data
            loadUnreadMessageCount();
            loadNotifications();
            
            // Close modal and show success
            closeModal();
            SkillSwap.notifications.show('Welcome to Skill Swap!', 'success');
            
            // Navigate to dashboard
            SkillSwap.router.navigate('/dashboard');
        } else {
            SkillSwap.notifications.show(result.error || 'Registration failed', 'error');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        SkillSwap.notifications.show('Registration failed. Please try again.', 'error');
    } finally {
        // Re-enable form
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
};

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (SkillSwap.socket) {
        SkillSwap.socket.disconnect();
    }
});