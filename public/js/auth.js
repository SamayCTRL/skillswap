// Authentication Manager
class AuthManager {
    constructor(apiClient) {
        this.api = apiClient;
        this.user = null;
        this.token = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        
        // Set up API client with current token
        if (this.token) {
            this.api.setAuthToken(this.token);
        }
    }
    
    // Google OAuth login
    async googleLogin(credential) {
        try {
            const response = await this.api.post('/auth/google-login', {
                credential
            });
            
            // Store tokens and user data
            this.token = response.tokens.accessToken;
            this.refreshToken = response.tokens.refreshToken;
            this.user = response.user;
            
            // Save to localStorage
            localStorage.setItem('accessToken', this.token);
            localStorage.setItem('refreshToken', this.refreshToken);
            
            // Set auth token for API client
            this.api.setAuthToken(this.token);
            
            return {
                success: true,
                user: this.user
            };
            
        } catch (error) {
            console.error('Google login error:', error);
            return {
                success: false,
                error: error.message || 'Google login failed'
            };
        }
    }
    
    // Google OAuth registration
    async googleRegister(credential) {
        try {
            const response = await this.api.post('/auth/google-register', {
                credential
            });
            
            // Store tokens and user data
            this.token = response.tokens.accessToken;
            this.refreshToken = response.tokens.refreshToken;
            this.user = response.user;
            
            // Save to localStorage
            localStorage.setItem('accessToken', this.token);
            localStorage.setItem('refreshToken', this.refreshToken);
            
            // Set auth token for API client
            this.api.setAuthToken(this.token);
            
            return {
                success: true,
                user: this.user
            };
            
        } catch (error) {
            console.error('Google registration error:', error);
            return {
                success: false,
                error: error.message || 'Google registration failed'
            };
        }
    }
    
    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token && !!this.user;
    }
    
    // Get current user
    getCurrentUser() {
        return this.user;
    }
    
    // Get auth token
    getToken() {
        return this.token;
    }
    
    // Check authentication status with server
    async checkAuth() {
        if (!this.token) {
            return false;
        }
        
        try {
            // Try to verify token with server
            const response = await this.api.get('/auth/verify');
            this.user = response.user;
            return true;
        } catch (error) {
            // Token might be expired, try to refresh
            if (this.refreshToken) {
                const refreshed = await this.refreshAuthToken();
                if (refreshed) {
                    return await this.checkAuth();
                }
            }
            
            // Clear invalid tokens
            this.clearTokens();
            return false;
        }
    }
    
    // Login user
    async login(email, password) {
        try {
            const response = await this.api.post('/auth/login', {
                email,
                password
            });
            
            // Store tokens and user data
            this.token = response.tokens.accessToken;
            this.refreshToken = response.tokens.refreshToken;
            this.user = response.user;
            
            // Save to localStorage
            localStorage.setItem('accessToken', this.token);
            localStorage.setItem('refreshToken', this.refreshToken);
            
            // Set auth token for API client
            this.api.setAuthToken(this.token);
            
            return {
                success: true,
                user: this.user
            };
            
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.message || 'Login failed'
            };
        }
    }
    
    // Register new user
    async register(name, email, password) {
        try {
            const response = await this.api.post('/auth/register', {
                name,
                email,
                password
            });
            
            // Store tokens and user data
            this.token = response.tokens.accessToken;
            this.refreshToken = response.tokens.refreshToken;
            this.user = response.user;
            
            // Save to localStorage
            localStorage.setItem('accessToken', this.token);
            localStorage.setItem('refreshToken', this.refreshToken);
            
            // Set auth token for API client
            this.api.setAuthToken(this.token);
            
            return {
                success: true,
                user: this.user
            };
            
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: error.message || 'Registration failed'
            };
        }
    }
    
    // Refresh authentication token
    async refreshAuthToken() {
        if (!this.refreshToken) {
            return false;
        }
        
        try {
            const response = await this.api.post('/auth/refresh', {
                refreshToken: this.refreshToken
            });
            
            // Update tokens
            this.token = response.tokens.accessToken;
            this.refreshToken = response.tokens.refreshToken;
            
            // Save to localStorage
            localStorage.setItem('accessToken', this.token);
            localStorage.setItem('refreshToken', this.refreshToken);
            
            // Set auth token for API client
            this.api.setAuthToken(this.token);
            
            return true;
            
        } catch (error) {
            console.error('Token refresh error:', error);
            this.clearTokens();
            return false;
        }
    }
    
    // Logout user
    async logout() {
        try {
            // Call logout endpoint if authenticated
            if (this.token) {
                await this.api.post('/auth/logout');
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear tokens and user data regardless of API call result
            this.clearTokens();
        }
    }
    
    // Clear all authentication data
    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        this.user = null;
        
        // Clear localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Clear API client token
        this.api.setAuthToken(null);
    }
    
    // Handle token expiration
    async handleTokenExpiration() {
        const refreshed = await this.refreshAuthToken();
        if (!refreshed) {
            // Force logout if refresh fails
            this.clearTokens();
            
            // Redirect to login if needed
            if (window.SkillSwap && window.SkillSwap.router) {
                window.SkillSwap.router.navigate('/login');
            }
            
            // Show notification
            if (window.SkillSwap && window.SkillSwap.notifications) {
                window.SkillSwap.notifications.show('Your session has expired. Please log in again.', 'warning');
            }
        }
        return refreshed;
    }
    
    // Handle authentication errors globally
    handleAuthError(error) {
        if (error.status === 401) {
            // Token expired or invalid
            this.handleTokenExpiration();
        }
    }
}