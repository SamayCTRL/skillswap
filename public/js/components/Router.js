// Client-side Router
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.setupRoutes();
    }
    
    // Setup default routes
    setupRoutes() {
        this.addRoute('/', () => this.loadHomePage());
        this.addRoute('/dashboard', () => this.loadDashboard());
        this.addRoute('/messages', () => this.loadMessages());
        this.addRoute('/profile', () => this.loadProfile());
        this.addRoute('/skills/:id', (params) => this.loadSkillDetail(params.id));
        this.addRoute('/users/:id', (params) => this.loadUserProfile(params.id));
        this.addRoute('/subscription', () => this.loadSubscriptionPage());
    }
    
    // Add route
    addRoute(path, handler) {
        this.routes.set(path, handler);
    }
    
    // Initialize router
    async init() {
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });
        
        // Handle initial load
        await this.handleRoute();
    }
    
    // Navigate to route
    navigate(path, replace = false) {
        if (replace) {
            history.replaceState(null, '', path);
        } else {
            history.pushState(null, '', path);
        }
        this.handleRoute();
    }
    
    // Handle current route
    async handleRoute() {
        const path = window.location.pathname;
        const handler = this.findRoute(path);
        
        if (handler) {
            try {
                this.currentRoute = path;
                this.updateActiveNavLinks();
                await handler.callback(handler.params);
            } catch (error) {
                console.error('Route handler error:', error);
                this.loadErrorPage(error);
            }
        } else {
            this.loadNotFoundPage();
        }
    }
    
    // Find matching route
    findRoute(path) {
        for (const [pattern, callback] of this.routes) {
            const params = this.matchRoute(pattern, path);
            if (params !== null) {
                return { callback, params };
            }
        }
        return null;
    }
    
    // Match route pattern
    matchRoute(pattern, path) {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');
        
        if (patternParts.length !== pathParts.length) {
            return null;
        }
        
        const params = {};
        
        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const pathPart = pathParts[i];
            
            if (patternPart.startsWith(':')) {
                // Parameter
                const paramName = patternPart.slice(1);
                params[paramName] = pathPart;
            } else if (patternPart !== pathPart) {
                // No match
                return null;
            }
        }
        
        return params;
    }
    
    // Update active navigation links
    updateActiveNavLinks() {
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            
            const linkPath = link.getAttribute('href');
            if (linkPath && this.currentRoute === linkPath) {
                link.classList.add('active');
            }
        });
    }
    
    // Route handlers
    async loadHomePage() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="hero-section">
                    <div class="hero-content">
                        <h1>Share Your Skills, Learn from Others</h1>
                        <p>Join our community of skilled professionals and learners. Share what you know, learn what you need.</p>
                        ${!window.SkillSwap.auth.isAuthenticated() ? `
                            <div class="hero-actions">
                                <button class="btn btn-primary btn-lg" onclick="showRegisterModal()">Get Started</button>
                                <button class="btn btn-secondary btn-lg" onclick="showLoginModal()">Sign In</button>
                            </div>
                        ` : `
                            <div class="hero-actions">
                                <a href="/dashboard" class="btn btn-primary btn-lg">Go to Dashboard</a>
                            </div>
                        `}
                    </div>
                </div>
                <div class="featured-skills">
                    <h2>Featured Skills</h2>
                    <div id="featured-skills-grid" class="skill-grid">
                        <div class="loading">Loading featured skills...</div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Home');
        this.loadFeaturedSkills();
    }
    
    async loadDashboard() {
        if (!window.SkillSwap.auth.isAuthenticated()) {
            this.navigate('/');
            return;
        }
        
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="dashboard">
                    <div class="dashboard-header">
                        <h1>Dashboard</h1>
                        <p>Welcome back, ${window.SkillSwap.user.name}!</p>
                    </div>
                    <div class="dashboard-grid">
                        <div class="dashboard-main">
                            <div class="dashboard-cards">
                                <div class="card">
                                    <div class="card-header">
                                        <h3>Your Skills</h3>
                                    </div>
                                    <div class="card-body">
                                        <div id="user-skills-list">
                                            <div class="loading">Loading your skills...</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="dashboard-sidebar">
                            <div class="sidebar">
                                <h4>Quick Stats</h4>
                                <div id="user-stats">
                                    <div class="loading">Loading stats...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Dashboard');
    }
    
    async loadMessages() {
        if (!window.SkillSwap.auth.isAuthenticated()) {
            this.navigate('/');
            return;
        }
        
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="messages-page">
                    <div class="messages-layout">
                        <div class="conversations-sidebar">
                            <div class="sidebar-header">
                                <h3>Messages</h3>
                            </div>
                            <div id="conversations-list">
                                <div class="loading">Loading conversations...</div>
                            </div>
                        </div>
                        <div class="chat-area">
                            <div class="empty-state">
                                <h3>Select a conversation</h3>
                                <p>Choose a conversation from the sidebar to start messaging.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Messages');
    }
    
    async loadProfile() {
        if (!window.SkillSwap.auth.isAuthenticated()) {
            this.navigate('/');
            return;
        }
        
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="profile-page">
                    <h1>Your Profile</h1>
                    <div class="profile-layout">
                        <div class="profile-main">
                            <div class="card">
                                <div class="card-header">
                                    <h3>Profile Information</h3>
                                </div>
                                <div class="card-body">
                                    <div id="profile-form">
                                        <div class="loading">Loading profile...</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="profile-sidebar">
                            <div class="card">
                                <div class="card-body text-center">
                                    <img id="profile-avatar" class="user-avatar" style="width: 6rem; height: 6rem;" src="${window.SkillSwap.user.avatar_url || '/assets/default-avatar.png'}" alt="Profile Avatar">
                                    <h4 class="mt-4">${window.SkillSwap.user.name}</h4>
                                    <p class="text-muted">${window.SkillSwap.user.email}</p>
                                    <div class="tier-badge ${window.SkillSwap.user.subscriptionTier}">
                                        ${window.SkillSwap.user.subscriptionTier.charAt(0).toUpperCase() + window.SkillSwap.user.subscriptionTier.slice(1)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Profile');
    }
    
    async loadSkillDetail(skillId) {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="skill-detail-page">
                    <div id="skill-detail-content">
                        <div class="loading">Loading skill details...</div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Skill Details');
    }
    
    async loadUserProfile(userId) {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="user-profile-page">
                    <div id="user-profile-content">
                        <div class="loading">Loading user profile...</div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('User Profile');
    }
    
    async loadSubscriptionPage() {
        if (!window.SkillSwap.auth.isAuthenticated()) {
            this.navigate('/');
            return;
        }
        
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="subscription-page">
                    <h1>Subscription</h1>
                    <div id="subscription-content">
                        <div class="loading">Loading subscription details...</div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Subscription');
    }
    
    // Load featured skills for home page
    async loadFeaturedSkills() {
        try {
            const response = await window.SkillSwap.api.get('/skills', {
                featured_only: true,
                limit: 8
            });
            
            const container = document.getElementById('featured-skills-grid');
            if (container && response.skills) {
                if (response.skills.length === 0) {
                    container.innerHTML = '<div class="empty-state"><p>No featured skills available</p></div>';
                } else {
                    container.innerHTML = response.skills.map(skill => `
                        <div class="skill-card card hover-lift" onclick="SkillSwap.router.navigate('/skills/${skill.id}')">
                            ${skill.image_url ? `
                                <img src="${skill.image_url}" alt="${skill.title}" class="skill-image">
                            ` : ''}
                            <div class="card-body">
                                <h4>${skill.title}</h4>
                                <p class="text-muted">${skill.description.substring(0, 100)}${skill.description.length > 100 ? '...' : ''}</p>
                                <div class="skill-meta">
                                    <span class="skill-price">${skill.price > 0 ? window.SkillSwap.utils.formatCurrency(skill.price) : 'Free'}</span>
                                    <span class="skill-difficulty">${skill.difficulty}</span>
                                </div>
                                <div class="skill-provider">
                                    <img src="${skill.user.avatar_url || '/assets/default-avatar.png'}" alt="${skill.user.name}" class="user-avatar-sm">
                                    <span>${skill.user.name}</span>
                                    ${skill.user.verified ? '<i data-lucide="check-circle" class="verified-icon"></i>' : ''}
                                </div>
                            </div>
                        </div>
                    `).join('');
                    
                    // Initialize icons
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load featured skills:', error);
            const container = document.getElementById('featured-skills-grid');
            if (container) {
                container.innerHTML = '<div class="error-state"><p>Failed to load featured skills</p></div>';
            }
        }
    }
    
    // Error page
    loadErrorPage(error) {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="error-page">
                    <div class="error-state">
                        <h1>Oops! Something went wrong</h1>
                        <p>We encountered an error while loading this page.</p>
                        <button class="btn btn-primary" onclick="location.reload()">Reload Page</button>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Error');
    }
    
    // 404 page
    loadNotFoundPage() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="not-found-page">
                    <div class="error-state">
                        <h1>Page Not Found</h1>
                        <p>The page you're looking for doesn't exist.</p>
                        <a href="/" class="btn btn-primary" onclick="event.preventDefault(); SkillSwap.router.navigate('/')">Go Home</a>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Page Not Found');
    }
}