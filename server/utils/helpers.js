const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');

/**
 * Helper Functions Module
 * Utility functions used across the Skill Swap application
 */

const helpers = {
    /**
     * Password utilities
     */
    password: {
        /**
         * Hash password using bcrypt
         */
        hash: async (password) => {
            const saltRounds = 12;
            return await bcrypt.hash(password, saltRounds);
        },

        /**
         * Compare password with hash
         */
        compare: async (password, hash) => {
            return await bcrypt.compare(password, hash);
        },

        /**
         * Generate secure random password
         */
        generate: (length = 12) => {
            const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
            let password = '';
            for (let i = 0; i < length; i++) {
                password += charset.charAt(Math.floor(Math.random() * charset.length));
            }
            return password;
        },

        /**
         * Validate password strength
         */
        validate: (password) => {
            const minLength = 8;
            const hasLowercase = /[a-z]/.test(password);
            const hasUppercase = /[A-Z]/.test(password);
            const hasNumbers = /\d/.test(password);
            const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

            return {
                isValid: password.length >= minLength && hasLowercase && hasUppercase && hasNumbers && hasSpecialChar,
                length: password.length >= minLength,
                lowercase: hasLowercase,
                uppercase: hasUppercase,
                numbers: hasNumbers,
                specialChar: hasSpecialChar
            };
        }
    },

    /**
     * Token utilities
     */
    token: {
        /**
         * Generate JWT token
         */
        generate: (payload, secret, expiresIn = '24h') => {
            return jwt.sign(payload, secret, { expiresIn });
        },

        /**
         * Verify JWT token
         */
        verify: (token, secret) => {
            return jwt.verify(token, secret);
        },

        /**
         * Generate secure random token
         */
        generateSecure: (length = 32) => {
            return crypto.randomBytes(length).toString('hex');
        },

        /**
         * Generate numeric verification code
         */
        generateCode: (length = 6) => {
            const min = Math.pow(10, length - 1);
            const max = Math.pow(10, length) - 1;
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    },

    /**
     * Date and time utilities
     */
    datetime: {
        /**
         * Format date for display
         */
        formatDate: (date, format = 'YYYY-MM-DD') => {
            return moment(date).format(format);
        },

        /**
         * Format datetime for display
         */
        formatDateTime: (date, format = 'YYYY-MM-DD HH:mm:ss') => {
            return moment(date).format(format);
        },

        /**
         * Get relative time (e.g., "2 hours ago")
         */
        timeAgo: (date) => {
            return moment(date).fromNow();
        },

        /**
         * Check if date is in the future
         */
        isFuture: (date) => {
            return moment(date).isAfter(moment());
        },

        /**
         * Check if date is in the past
         */
        isPast: (date) => {
            return moment(date).isBefore(moment());
        },

        /**
         * Add time to date
         */
        addTime: (date, amount, unit = 'hours') => {
            return moment(date).add(amount, unit).toDate();
        },

        /**
         * Get start and end of day
         */
        dayBounds: (date) => {
            const startOfDay = moment(date).startOf('day').toDate();
            const endOfDay = moment(date).endOf('day').toDate();
            return { startOfDay, endOfDay };
        }
    },

    /**
     * String utilities
     */
    string: {
        /**
         * Generate slug from string
         */
        slugify: (text) => {
            return text
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        },

        /**
         * Capitalize first letter
         */
        capitalize: (text) => {
            return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        },

        /**
         * Convert to title case
         */
        titleCase: (text) => {
            return text.replace(/\w\S*/g, (txt) => 
                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
        },

        /**
         * Truncate text with ellipsis
         */
        truncate: (text, length = 100, suffix = '...') => {
            if (text.length <= length) return text;
            return text.substring(0, length).trim() + suffix;
        },

        /**
         * Remove HTML tags
         */
        stripHtml: (html) => {
            return html.replace(/<[^>]*>/g, '');
        },

        /**
         * Escape HTML characters
         */
        escapeHtml: (text) => {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, (m) => map[m]);
        }
    },

    /**
     * Validation utilities
     */
    validation: {
        /**
         * Validate email format
         */
        isValidEmail: (email) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        /**
         * Validate URL format
         */
        isValidUrl: (url) => {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        },

        /**
         * Validate phone number
         */
        isValidPhone: (phone) => {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            return phoneRegex.test(phone);
        },

        /**
         * Validate UUID format
         */
        isValidUUID: (uuid) => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            return uuidRegex.test(uuid);
        },

        /**
         * Sanitize input string
         */
        sanitizeInput: (input) => {
            if (typeof input !== 'string') return input;
            return input.trim().replace(/[<>]/g, '');
        }
    },

    /**
     * File utilities
     */
    file: {
        /**
         * Get file extension
         */
        getExtension: (filename) => {
            return filename.split('.').pop().toLowerCase();
        },

        /**
         * Check if file type is allowed
         */
        isAllowedType: (filename, allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']) => {
            const extension = helpers.file.getExtension(filename);
            return allowedTypes.includes(extension);
        },

        /**
         * Generate unique filename
         */
        generateUniqueFilename: (originalName) => {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2);
            const extension = helpers.file.getExtension(originalName);
            return `${timestamp}_${random}.${extension}`;
        },

        /**
         * Format file size
         */
        formatFileSize: (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    },

    /**
     * Array utilities
     */
    array: {
        /**
         * Remove duplicates from array
         */
        unique: (array) => {
            return [...new Set(array)];
        },

        /**
         * Shuffle array
         */
        shuffle: (array) => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        },

        /**
         * Chunk array into smaller arrays
         */
        chunk: (array, size) => {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        },

        /**
         * Get random item from array
         */
        random: (array) => {
            return array[Math.floor(Math.random() * array.length)];
        }
    },

    /**
     * Object utilities
     */
    object: {
        /**
         * Deep clone object
         */
        deepClone: (obj) => {
            return JSON.parse(JSON.stringify(obj));
        },

        /**
         * Pick specific properties from object
         */
        pick: (obj, keys) => {
            const result = {};
            keys.forEach(key => {
                if (key in obj) {
                    result[key] = obj[key];
                }
            });
            return result;
        },

        /**
         * Omit specific properties from object
         */
        omit: (obj, keys) => {
            const result = { ...obj };
            keys.forEach(key => {
                delete result[key];
            });
            return result;
        },

        /**
         * Check if object is empty
         */
        isEmpty: (obj) => {
            return Object.keys(obj).length === 0;
        }
    },

    /**
     * Number utilities
     */
    number: {
        /**
         * Format currency
         */
        formatCurrency: (amount, currency = 'USD') => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency
            }).format(amount);
        },

        /**
         * Round to specific decimal places
         */
        round: (num, decimals = 2) => {
            return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
        },

        /**
         * Generate random number in range
         */
        randomBetween: (min, max) => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        /**
         * Clamp number between min and max
         */
        clamp: (num, min, max) => {
            return Math.min(Math.max(num, min), max);
        }
    },

    /**
     * Database utilities
     */
    db: {
        /**
         * Build pagination object
         */
        buildPagination: (page = 1, limit = 20, total = 0) => {
            const offset = (page - 1) * limit;
            const totalPages = Math.ceil(total / limit);
            
            return {
                page: parseInt(page),
                limit: parseInt(limit),
                offset,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                total
            };
        },

        /**
         * Build SQL WHERE clause from filters
         */
        buildWhereClause: (filters) => {
            const conditions = [];
            const values = [];
            let paramCount = 1;

            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (Array.isArray(value)) {
                        const placeholders = value.map(() => `$${paramCount++}`).join(', ');
                        conditions.push(`${key} IN (${placeholders})`);
                        values.push(...value);
                    } else {
                        conditions.push(`${key} = $${paramCount++}`);
                        values.push(value);
                    }
                }
            });

            return {
                whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
                values
            };
        }
    },

    /**
     * API response utilities
     */
    response: {
        /**
         * Success response format
         */
        success: (data, message = 'Success', meta = null) => {
            const response = {
                success: true,
                message,
                data
            };
            
            if (meta) {
                response.meta = meta;
            }
            
            return response;
        },

        /**
         * Error response format
         */
        error: (message = 'An error occurred', code = 'ERROR', details = null) => {
            const response = {
                success: false,
                error: message,
                code
            };
            
            if (details) {
                response.details = details;
            }
            
            return response;
        },

        /**
         * Paginated response format
         */
        paginated: (data, pagination, message = 'Success') => {
            return {
                success: true,
                message,
                data,
                pagination
            };
        }
    },

    /**
     * Logging utilities
     */
    log: {
        /**
         * Log with timestamp and level
         */
        write: (level, message, data = null) => {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level: level.toUpperCase(),
                message
            };
            
            if (data) {
                logEntry.data = data;
            }
            
            console.log(JSON.stringify(logEntry));
        },

        info: (message, data = null) => helpers.log.write('info', message, data),
        warn: (message, data = null) => helpers.log.write('warn', message, data),
        error: (message, data = null) => helpers.log.write('error', message, data),
        debug: (message, data = null) => helpers.log.write('debug', message, data)
    }
};

module.exports = helpers;