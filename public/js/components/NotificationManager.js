// Notification Manager for toast notifications
class NotificationManager {
    constructor() {
        this.container = document.getElementById('toast-container');
        this.notifications = new Map();
        this.nextId = 1;
    }
    
    // Show notification
    show(message, type = 'info', duration = 4000, options = {}) {
        const id = this.nextId++;
        
        const notification = document.createElement('div');
        notification.className = `toast ${type}`;
        notification.innerHTML = `
            <div class="toast-content">
                ${options.icon ? `<i data-lucide="${options.icon}"></i>` : ''}
                <div class="toast-message">
                    ${options.title ? `<div class="toast-title">${options.title}</div>` : ''}
                    <div class="toast-text">${message}</div>
                </div>
                <button class="toast-close" onclick="SkillSwap.notifications.hide(${id})">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `;
        
        this.container.appendChild(notification);
        this.notifications.set(id, notification);
        
        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, duration);
        }
        
        return id;
    }
    
    // Hide notification
    hide(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.style.animation = 'slideOut 0.3s ease-in-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }
    
    // Show success notification
    success(message, duration = 4000, options = {}) {
        return this.show(message, 'success', duration, {
            icon: 'check-circle',
            ...options
        });
    }
    
    // Show error notification
    error(message, duration = 6000, options = {}) {
        return this.show(message, 'error', duration, {
            icon: 'x-circle',
            ...options
        });
    }
    
    // Show warning notification
    warning(message, duration = 5000, options = {}) {
        return this.show(message, 'warning', duration, {
            icon: 'alert-triangle',
            ...options
        });
    }
    
    // Show info notification
    info(message, duration = 4000, options = {}) {
        return this.show(message, 'info', duration, {
            icon: 'info',
            ...options
        });
    }
    
    // Clear all notifications
    clearAll() {
        this.notifications.forEach((notification, id) => {
            this.hide(id);
        });
    }
}