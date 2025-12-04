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
        this.addRoute('/home', () => this.loadHomePage());
        this.addRoute('/browse', () => this.loadBrowsePage());
        this.addRoute('/dashboard', () => this.loadDashboard());
        this.addRoute('/create-skill', () => this.loadCreateSkillPage());
        this.addRoute('/my-skills', () => this.loadMySkillsPage());
        this.addRoute('/messages', () => this.loadMessages());
        this.addRoute('/profile', () => this.loadProfile());
        this.addRoute('/settings', () => this.loadSettingsPage());
        this.addRoute('/subscription', () => this.loadSubscriptionPage());
        this.addRoute('/upgrade', () => this.loadSubscriptionPage());
        this.addRoute('/skills/:id', (params) => this.loadSkillDetail(params.id));
        this.addRoute('/users/:id', (params) => this.loadUserProfile(params.id));
        this.addRoute('/search', () => this.loadSearchPage());
        this.addRoute('/bookings', () => this.loadBookingsPage());
        this.addRoute('/help', () => this.loadHelpPage());
        this.addRoute('/login', () => this.loadLoginPage());
        this.addRoute('/register', () => this.loadRegisterPage());
    }
    
    // Add route
    addRoute(path, handler) {
        this.routes.set(path, handler);
    }
    
    // Initialize router
    async init() {
        console.log('🛠️ Router initializing...');
        
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            console.log('🔄 Popstate event triggered');
            this.handleRoute();
        });
        
        // Handle initial load
        console.log('🏠 Loading initial route:', window.location.pathname);
        await this.handleRoute();
        console.log('✅ Router initialized successfully');
    }
    
    // Navigate to route
    navigate(path, replace = false) {
        console.log('🧭 Navigate to:', path, replace ? '(replace)' : '');
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
        console.log('🎨 Handling route:', path);
        const handler = this.findRoute(path);
        
        if (handler) {
            try {
                console.log('✅ Route handler found for:', path);
                this.currentRoute = path;
                this.updateActiveNavLinks();
                await handler.callback(handler.params);
                console.log('✅ Route handled successfully:', path);
            } catch (error) {
                console.error('❌ Route handler error for', path, ':', error);
                this.loadErrorPage(error);
            }
        } else {
            console.warn('⚠️ No route handler found for:', path);
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
            // Check if content already exists (from static HTML)
            const existingHero = content.querySelector('.hero-section');
            if (!existingHero) {
                // Only load dynamic content if static content doesn't exist
                content.innerHTML = `
                    <div class="hero-section">
                        <div class="hero-content">
                            <h1>Share Your Skills, Learn from Others</h1>
                            <p>Join our community of skilled professionals and learners. Share what you know, learn what you need.</p>
                            ${window.SkillSwap && window.SkillSwap.auth && !window.SkillSwap.auth.isAuthenticated() ? `
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
            } else {
                // Update existing content for authenticated users
                const heroActions = content.querySelector('.hero-actions');
                if (heroActions && window.SkillSwap && window.SkillSwap.auth && window.SkillSwap.auth.isAuthenticated()) {
                    heroActions.innerHTML = `
                        <a href="/dashboard" class="btn btn-primary btn-lg">Go to Dashboard</a>
                    `;
                }
            }
        }
        
        if (window.SkillSwap && window.SkillSwap.utils) {
            window.SkillSwap.utils.setPageTitle('Home');
        }
        this.loadFeaturedSkills();
    }
    
    // Load featured skills
    async loadFeaturedSkills() {
        const skillsGrid = document.getElementById('featured-skills-grid');
        if (!skillsGrid) return;
        
        try {
            // Show loading state
            skillsGrid.innerHTML = `
                <div class="skill-card">
                    <div class="skill-card-header">
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text"></div>
                    </div>
                    <div class="skill-card-body">
                        <div class="skeleton skeleton-text"></div>
                    </div>
                </div>
                <div class="skill-card">
                    <div class="skill-card-header">
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text"></div>
                    </div>
                    <div class="skill-card-body">
                        <div class="skeleton skeleton-text"></div>
                    </div>
                </div>
                <div class="skill-card">
                    <div class="skill-card-header">
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text"></div>
                    </div>
                    <div class="skill-card-body">
                        <div class="skeleton skeleton-text"></div>
                    </div>
                </div>
            `;
            
            // Try to load skills from API
            const response = await window.SkillSwap.api.get('/skills/featured');
            const skills = response.skills || [];
            
            if (skills.length > 0) {
                // Display actual skills
                skillsGrid.innerHTML = skills.map(skill => `
                    <div class="skill-card" onclick="navigateToSkill('${skill.id}')">
                        <div class="skill-card-header">
                            <h3>${window.SkillSwap.utils.escapeHtml(skill.title)}</h3>
                            <div class="skill-rating">
                                <span class="rating">${skill.average_rating || '4.8'}</span>
                                <span class="reviews">(${skill.review_count || '0'} reviews)</span>
                            </div>
                        </div>
                        <div class="skill-card-body">
                            <p>${window.SkillSwap.utils.escapeHtml(skill.description)}</p>
                            <div class="skill-meta">
                                <span class="price">$${skill.hourly_rate}/hour</span>
                                <span class="category">${window.SkillSwap.utils.escapeHtml(skill.category)}</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                // Fallback to static content
                skillsGrid.innerHTML = `
                    <div class="skill-card">
                        <div class="skill-card-header">
                            <h3>JavaScript Programming</h3>
                            <div class="skill-rating">
                                <span class="rating">4.8</span>
                                <span class="reviews">(124 reviews)</span>
                            </div>
                        </div>
                        <div class="skill-card-body">
                            <p>Learn modern JavaScript from basics to advanced concepts</p>
                            <div class="skill-meta">
                                <span class="price">$25/hour</span>
                                <span class="category">Programming</span>
                            </div>
                        </div>
                    </div>
                    <div class="skill-card">
                        <div class="skill-card-header">
                            <h3>Guitar Lessons</h3>
                            <div class="skill-rating">
                                <span class="rating">4.9</span>
                                <span class="reviews">(87 reviews)</span>
                            </div>
                        </div>
                        <div class="skill-card-body">
                            <p>Acoustic and electric guitar lessons for all skill levels</p>
                            <div class="skill-meta">
                                <span class="price">$30/hour</span>
                                <span class="category">Music</span>
                            </div>
                        </div>
                    </div>
                    <div class="skill-card">
                        <div class="skill-card-header">
                            <h3>Spanish Tutoring</h3>
                            <div class="skill-rating">
                                <span class="rating">4.7</span>
                                <span class="reviews">(156 reviews)</span>
                            </div>
                        </div>
                        <div class="skill-card-body">
                            <p>Conversational Spanish and grammar lessons</p>
                            <div class="skill-meta">
                                <span class="price">$20/hour</span>
                                <span class="category">Language</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Failed to load featured skills:', error);
            // Show static fallback content on error
            skillsGrid.innerHTML = `
                <div class="skill-card">
                    <div class="skill-card-header">
                        <h3>JavaScript Programming</h3>
                        <div class="skill-rating">
                            <span class="rating">4.8</span>
                            <span class="reviews">(124 reviews)</span>
                        </div>
                    </div>
                    <div class="skill-card-body">
                        <p>Learn modern JavaScript from basics to advanced concepts</p>
                        <div class="skill-meta">
                            <span class="price">$25/hour</span>
                            <span class="category">Programming</span>
                        </div>
                    </div>
                </div>
                <div class="skill-card">
                    <div class="skill-card-header">
                        <h3>Guitar Lessons</h3>
                        <div class="skill-rating">
                            <span class="rating">4.9</span>
                            <span class="reviews">(87 reviews)</span>
                        </div>
                    </div>
                    <div class="skill-card-body">
                        <p>Acoustic and electric guitar lessons for all skill levels</p>
                        <div class="skill-meta">
                            <span class="price">$30/hour</span>
                            <span class="category">Music</span>
                        </div>
                    </div>
                </div>
                <div class="skill-card">
                    <div class="skill-card-header">
                        <h3>Spanish Tutoring</h3>
                        <div class="skill-rating">
                            <span class="rating">4.7</span>
                            <span class="reviews">(156 reviews)</span>
                        </div>
                    </div>
                    <div class="skill-card-body">
                        <p>Conversational Spanish and grammar lessons</p>
                        <div class="skill-meta">
                            <span class="price">$20/hour</span>
                            <span class="category">Language</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    async loadBrowsePage() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="page-header">
                    <h1>Browse Skills</h1>
                    <p>Discover amazing skills from our community</p>
                </div>
                
                <div class="search-filters">
                    <div class="search-bar">
                        <input type="text" id="skill-search" placeholder="Search skills..." class="search-input">
                        <button class="btn btn-primary" onclick="searchSkills()">Search</button>
                    </div>
                    
                    <div class="filter-chips">
                        <button class="filter-chip active" data-category="all">All</button>
                        <button class="filter-chip" data-category="programming">Programming</button>
                        <button class="filter-chip" data-category="design">Design</button>
                        <button class="filter-chip" data-category="language">Language</button>
                        <button class="filter-chip" data-category="music">Music</button>
                        <button class="filter-chip" data-category="fitness">Fitness</button>
                        <button class="filter-chip" data-category="cooking">Cooking</button>
                        <button class="filter-chip" data-category="business">Business</button>
                        <button class="filter-chip" data-category="crafts">Arts & Crafts</button>
                    </div>
                </div>
                
                <div id="skills-grid" class="skill-grid">
                    <div class="loading">Loading skills...</div>
                </div>
                
                <div class="pagination" id="skills-pagination">
                    <!-- Pagination will be added dynamically -->
                </div>
            `;
        }
        
        if (window.SkillSwap && window.SkillSwap.utils) {
            window.SkillSwap.utils.setPageTitle('Browse Skills');
        }
        this.loadSkills();
    }
    
    async loadCreateSkillPage() {
        if (!window.SkillSwap.auth.isAuthenticated()) {
            this.navigate('/');
            return;
        }
        
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="page-header">
                    <h1>Share Your Skill</h1>
                    <p>Create a new skill listing to teach others</p>
                </div>
                
                <form id="create-skill-form" class="skill-form">
                    <div class="form-section">
                        <h3>Basic Information</h3>
                        
                        <div class="form-group">
                            <label for="skill-title">Skill Title *</label>
                            <input type="text" id="skill-title" name="title" required 
                                   placeholder="e.g., JavaScript Programming, Guitar Lessons">
                        </div>
                        
                        <div class="form-group">
                            <label for="skill-description">Description *</label>
                            <textarea id="skill-description" name="description" required rows="4"
                                      placeholder="Describe what you'll teach and what students will learn..."></textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="skill-category">Category *</label>
                                <select id="skill-category" name="category" required>
                                    <option value="">Select a category</option>
                                    <option value="programming">Programming</option>
                                    <option value="design">Design</option>
                                    <option value="language">Language</option>
                                    <option value="music">Music</option>
                                    <option value="fitness">Fitness</option>
                                    <option value="cooking">Cooking</option>
                                    <option value="business">Business</option>
                                    <option value="crafts">Arts & Crafts</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="skill-level">Skill Level *</label>
                                <select id="skill-level" name="skill_level" required>
                                    <option value="">Select level</option>
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                    <option value="expert">Expert</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h3>What You're Looking For</h3>
                        
                        <div class="form-group">
                            <label for="looking-for">Skills you'd like to learn in exchange *</label>
                            <textarea id="looking-for" name="looking_for" required rows="3"
                                      placeholder="Describe what skills you'd like to learn in exchange for teaching your skill..."></textarea>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h3>Session Details</h3>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="session-duration">Typical Session Duration</label>
                                <select id="session-duration" name="session_duration">
                                    <option value="30">30 minutes</option>
                                    <option value="60" selected>1 hour</option>
                                    <option value="90">1.5 hours</option>
                                    <option value="120">2 hours</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="session-format">Format</label>
                                <select id="session-format" name="format">
                                    <option value="online">Online</option>
                                    <option value="in-person">In Person</option>
                                    <option value="both">Both</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="availability">Availability</label>
                            <textarea id="availability" name="availability" rows="2"
                                      placeholder="When are you generally available? (e.g., Weekday evenings, Weekend afternoons)"></textarea>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="history.back()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Skill Listing</button>
                    </div>
                </form>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Create Skill');
        this.setupCreateSkillForm();
    }
    
    async loadMySkillsPage() {
        if (!window.SkillSwap.auth.isAuthenticated()) {
            this.navigate('/');
            return;
        }
        
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="page-header">
                    <div>
                        <h1>My Skills</h1>
                        <p>Manage your skill listings</p>
                    </div>
                    <a href="/create-skill" class="btn btn-primary">Add New Skill</a>
                </div>
                
                <div class="skills-tabs">
                    <button class="tab-btn active" data-tab="teaching">Teaching</button>
                    <button class="tab-btn" data-tab="learning">Learning</button>
                    <button class="tab-btn" data-tab="requests">Requests</button>
                </div>
                
                <div class="tab-content">
                    <div id="teaching-tab" class="tab-panel active">
                        <div id="my-teaching-skills" class="skills-list">
                            <div class="loading">Loading your skills...</div>
                        </div>
                    </div>
                    
                    <div id="learning-tab" class="tab-panel">
                        <div id="my-learning-skills" class="skills-list">
                            <div class="loading">Loading...</div>
                        </div>
                    </div>
                    
                    <div id="requests-tab" class="tab-panel">
                        <div id="skill-requests" class="requests-list">
                            <div class="loading">Loading requests...</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('My Skills');
        this.loadUserSkills();
    }
    
    async loadSubscriptionPage() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="page-header">
                    <h1>Subscription Plans</h1>
                    <p>Choose the plan that works best for you</p>
                </div>
                
                <div class="pricing-cards">
                    <div class="pricing-card">
                        <div class="pricing-header">
                            <h3>Free</h3>
                            <div class="price">$0<span class="period">/month</span></div>
                        </div>
                        <div class="pricing-features">
                            <ul>
                                <li>✓ Create up to 3 skill listings</li>
                                <li>✓ Browse and request skills</li>
                                <li>✓ Basic messaging</li>
                                <li>✓ Community access</li>
                                <li>✗ Verified account badge</li>
                                <li>✗ Priority matching</li>
                                <li>✗ Highlighted posts</li>
                                <li>✗ Advanced analytics</li>
                            </ul>
                        </div>
                        <div class="pricing-action">
                            <button class="btn btn-secondary" disabled>Current Plan</button>
                        </div>
                    </div>
                    
                    <div class="pricing-card featured">
                        <div class="featured-badge">Most Popular</div>
                        <div class="pricing-header">
                            <h3>Verified</h3>
                            <div class="price">$9.99<span class="period">/month</span></div>
                        </div>
                        <div class="pricing-features">
                            <ul>
                                <li>✓ Unlimited skill listings</li>
                                <li>✓ Verified account badge</li>
                                <li>✓ Priority matching</li>
                                <li>✓ Highlighted posts</li>
                                <li>✓ Advanced messaging features</li>
                                <li>✓ Skill monetization (3.5+ rating required)</li>
                                <li>✓ Detailed analytics</li>
                                <li>✓ Priority support</li>
                            </ul>
                        </div>
                        <div class="pricing-action">
                            <button class="btn btn-primary" onclick="upgradeSubscription('verified')">Upgrade Now</button>
                        </div>
                    </div>
                    
                    <div class="pricing-card">
                        <div class="pricing-header">
                            <h3>Pro</h3>
                            <div class="price">$19.99<span class="period">/month</span></div>
                        </div>
                        <div class="pricing-features">
                            <ul>
                                <li>✓ Everything in Verified</li>
                                <li>✓ Featured profile placement</li>
                                <li>✓ Custom branding options</li>
                                <li>✓ Advanced booking calendar</li>
                                <li>✓ Multi-skill package deals</li>
                                <li>✓ White-label resources</li>
                                <li>✓ Dedicated account manager</li>
                                <li>✓ API access</li>
                            </ul>
                        </div>
                        <div class="pricing-action">
                            <button class="btn btn-primary" onclick="upgradeSubscription('pro')">Upgrade Now</button>
                        </div>
                    </div>
                </div>
                
                <div class="subscription-faq">
                    <h2>Frequently Asked Questions</h2>
                    
                    <div class="faq-item">
                        <h4>How does skill monetization work?</h4>
                        <p>With a Verified subscription and a 3.5+ star rating, you can charge for your teaching sessions while still participating in skill swaps. This allows experienced teachers to earn money for premium sessions while contributing to the community.</p>
                    </div>
                    
                    <div class="faq-item">
                        <h4>What are priority matches?</h4>
                        <p>Verified users get matched first when someone is looking for their skills, and their profiles appear higher in search results.</p>
                    </div>
                    
                    <div class="faq-item">
                        <h4>Can I cancel anytime?</h4>
                        <p>Yes! You can cancel your subscription at any time. You'll keep access to premium features until the end of your billing cycle.</p>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Subscription Plans');
    }
    
    async loadSettingsPage() {
        if (!window.SkillSwap.auth.isAuthenticated()) {
            this.navigate('/');
            return;
        }
        
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="page-header">
                    <h1>Settings</h1>
                    <p>Manage your account preferences</p>
                </div>
                
                <div class="settings-tabs">
                    <button class="tab-btn active" data-tab="profile">Profile</button>
                    <button class="tab-btn" data-tab="account">Account</button>
                    <button class="tab-btn" data-tab="notifications">Notifications</button>
                    <button class="tab-btn" data-tab="privacy">Privacy</button>
                </div>
                
                <div class="tab-content">
                    <div id="profile-tab" class="tab-panel active">
                        <form id="profile-settings-form">
                            <div class="form-group">
                                <label for="display-name">Display Name</label>
                                <input type="text" id="display-name" name="name" value="${window.SkillSwap.user?.name || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="bio">Bio</label>
                                <textarea id="bio" name="bio" rows="4" placeholder="Tell others about yourself..."></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="location">Location</label>
                                <input type="text" id="location" name="location" placeholder="City, Country">
                            </div>
                            
                            <div class="form-group">
                                <label for="avatar-upload">Profile Picture</label>
                                <input type="file" id="avatar-upload" accept="image/*">
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                    
                    <div id="account-tab" class="tab-panel">
                        <form id="account-settings-form">
                            <div class="form-group">
                                <label for="email">Email Address</label>
                                <input type="email" id="email" name="email" value="${window.SkillSwap.user?.email || ''}" disabled>
                                <small class="form-hint">Contact support to change your email address</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="current-password">Current Password</label>
                                <input type="password" id="current-password" name="currentPassword">
                            </div>
                            
                            <div class="form-group">
                                <label for="new-password">New Password</label>
                                <input type="password" id="new-password" name="newPassword">
                            </div>
                            
                            <div class="form-group">
                                <label for="confirm-password">Confirm New Password</label>
                                <input type="password" id="confirm-password" name="confirmPassword">
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Change Password</button>
                            </div>
                        </form>
                        
                        <div class="danger-zone">
                            <h3>Danger Zone</h3>
                            <p>Permanently delete your account and all associated data.</p>
                            <button class="btn btn-danger" onclick="deleteAccount()">Delete Account</button>
                        </div>
                    </div>
                    
                    <div id="notifications-tab" class="tab-panel">
                        <form id="notification-settings-form">
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="emailNotifications" checked>
                                    <span class="checkmark"></span>
                                    Email notifications for new messages
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="skillMatches" checked>
                                    <span class="checkmark"></span>
                                    Notify me of skill matches
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="marketingEmails">
                                    <span class="checkmark"></span>
                                    Marketing and promotional emails
                                </label>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Save Preferences</button>
                            </div>
                        </form>
                    </div>
                    
                    <div id="privacy-tab" class="tab-panel">
                        <form id="privacy-settings-form">
                            <div class="form-group">
                                <label for="profile-visibility">Profile Visibility</label>
                                <select id="profile-visibility" name="visibility">
                                    <option value="public">Public - Anyone can see my profile</option>
                                    <option value="members">Members only - Only registered users can see my profile</option>
                                    <option value="private">Private - Only people I've connected with can see my profile</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="showLocation" checked>
                                    <span class="checkmark"></span>
                                    Show my location on my profile
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="showLastSeen">
                                    <span class="checkmark"></span>
                                    Show when I was last online
                                </label>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Save Settings</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Settings');
        this.setupSettingsTabs();
    }
    
    async loadMessages() {
        if (!window.SkillSwap.auth.isAuthenticated()) {
            this.navigate('/');
            return;
        }
        
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="page-header">
                    <h1>Messages</h1>
                    <p>Communicate with other skill sharers</p>
                </div>
                
                <div class="messages-layout">
                    <div class="conversations-sidebar">
                        <div class="conversations-header">
                            <h3>Conversations</h3>
                            <button class="btn btn-primary btn-sm" onclick="startNewConversation()">New Message</button>
                        </div>
                        <div id="conversations-list" class="conversations-list">
                            <div class="loading">Loading conversations...</div>
                        </div>
                    </div>
                    
                    <div class="chat-area">
                        <div class="empty-chat">
                            <h3>Select a conversation</h3>
                            <p>Choose a conversation from the sidebar to start messaging</p>
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
        const user = window.SkillSwap.user;
        
        if (content) {
            content.innerHTML = `
                <div class="profile-layout">
                    <div class="profile-main">
                        <div class="profile-header">
                            <div class="profile-avatar">
                                <img src="${user.avatar_url || '/assets/default-avatar.svg'}" alt="${user.name}" class="avatar-large">
                                ${user.verified ? '<div class="verified-badge-large"><i data-lucide="check-circle"></i></div>' : ''}
                            </div>
                            <div class="profile-info">
                                <h1>${user.name}</h1>
                                <p class="user-tier">${user.subscriptionTier} Member</p>
                                <p class="user-bio">${user.bio || 'No bio added yet'}</p>
                            </div>
                        </div>
                        
                        <div class="profile-tabs">
                            <button class="tab-btn active" data-tab="skills">Skills</button>
                            <button class="tab-btn" data-tab="reviews">Reviews</button>
                            <button class="tab-btn" data-tab="about">About</button>
                        </div>
                        
                        <div class="tab-content">
                            <div id="skills-tab" class="tab-panel active">
                                <div id="profile-skills" class="skills-grid">
                                    <div class="loading">Loading skills...</div>
                                </div>
                            </div>
                            
                            <div id="reviews-tab" class="tab-panel">
                                <div id="profile-reviews">
                                    <div class="loading">Loading reviews...</div>
                                </div>
                            </div>
                            
                            <div id="about-tab" class="tab-panel">
                                <div class="about-section">
                                    <h3>About ${user.name}</h3>
                                    <p>${user.bio || 'No additional information provided.'}</p>
                                    
                                    <div class="profile-stats">
                                        <div class="stat">
                                            <span class="stat-value">0</span>
                                            <span class="stat-label">Skills Shared</span>
                                        </div>
                                        <div class="stat">
                                            <span class="stat-value">0</span>
                                            <span class="stat-label">Sessions Completed</span>
                                        </div>
                                        <div class="stat">
                                            <span class="stat-value">5.0</span>
                                            <span class="stat-label">Average Rating</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-sidebar">
                        <div class="profile-actions">
                            <a href="/settings" class="btn btn-primary btn-full">Edit Profile</a>
                            <button class="btn btn-secondary btn-full" onclick="shareProfile()">Share Profile</button>
                        </div>
                        
                        <div class="profile-contact">
                            <h4>Contact Information</h4>
                            <p><i data-lucide="mail"></i> ${user.email}</p>
                            <p><i data-lucide="calendar"></i> Member since ${SkillSwap.utils.formatDate(user.createdAt || new Date())}</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Profile');
    }
    
    async loadSearchPage() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="page-header">
                    <h1>Search Results</h1>
                    <p>Find the perfect skill match</p>
                </div>
                
                <div class="search-results">
                    <div id="search-results-grid" class="skill-grid">
                        <div class="loading">Searching...</div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Search');
    }
    
    async loadBookingsPage() {
        if (!window.SkillSwap.auth.isAuthenticated()) {
            this.navigate('/');
            return;
        }
        
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="page-header">
                    <h1>Bookings</h1>
                    <p>Manage your skill sessions</p>
                </div>
                
                <div class="bookings-tabs">
                    <button class="tab-btn active" data-tab="upcoming">Upcoming</button>
                    <button class="tab-btn" data-tab="past">Past</button>
                    <button class="tab-btn" data-tab="requests">Requests</button>
                </div>
                
                <div class="tab-content">
                    <div id="upcoming-tab" class="tab-panel active">
                        <div id="upcoming-bookings">
                            <div class="empty-state">
                                <p>No upcoming sessions</p>
                            </div>
                        </div>
                    </div>
                    
                    <div id="past-tab" class="tab-panel">
                        <div id="past-bookings">
                            <div class="empty-state">
                                <p>No past sessions</p>
                            </div>
                        </div>
                    </div>
                    
                    <div id="requests-tab" class="tab-panel">
                        <div id="booking-requests">
                            <div class="empty-state">
                                <p>No pending requests</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Bookings');
    }
    
    async loadHelpPage() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="page-header">
                    <h1>Help Center</h1>
                    <p>Get help with Skill Swap</p>
                </div>
                
                <div class="help-content">
                    <div class="help-section">
                        <h2>Getting Started</h2>
                        <div class="help-articles">
                            <a href="#" class="help-article">How to create your first skill listing</a>
                            <a href="#" class="help-article">Finding skills to learn</a>
                            <a href="#" class="help-article">Setting up your profile</a>
                        </div>
                    </div>
                    
                    <div class="help-section">
                        <h2>Skill Swapping</h2>
                        <div class="help-articles">
                            <a href="#" class="help-article">How skill swapping works</a>
                            <a href="#" class="help-article">Booking sessions</a>
                            <a href="#" class="help-article">Rating and reviews</a>
                        </div>
                    </div>
                    
                    <div class="help-section">
                        <h2>Subscription & Payments</h2>
                        <div class="help-articles">
                            <a href="#" class="help-article">Upgrading to verified status</a>
                            <a href="#" class="help-article">Monetizing your skills</a>
                            <a href="#" class="help-article">Managing your subscription</a>
                        </div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Help');
    }
    
    async loadSkillDetail(skillId) {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="skill-detail-layout">
                    <div class="skill-detail-main">
                        <div id="skill-detail-content">
                            <div class="loading">Loading skill details...</div>
                        </div>
                    </div>
                    
                    <div class="skill-detail-sidebar">
                        <div class="booking-card">
                            <h3>Book a Session</h3>
                            <div class="price">Free (Skill Swap)</div>
                            <button class="btn btn-primary btn-full">Request Skill Swap</button>
                        </div>
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
                <div class="profile-layout">
                    <div class="profile-main">
                        <div id="user-profile-content">
                            <div class="loading">Loading user profile...</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('User Profile');
    }
    
    async loadDashboard() {
        if (!window.SkillSwap.auth.isAuthenticated()) {
            this.navigate('/');
            return;
        }
        
        const content = document.getElementById('page-content');
        const user = window.SkillSwap.user;
        
        if (content) {
            content.innerHTML = `
                <div class="dashboard">
                    <div class="dashboard-header">
                        <div class="welcome-section">
                            <h1>Welcome back, ${user.name}!</h1>
                            <p>Ready to share your skills and learn something new?</p>
                        </div>
                        <div class="quick-actions">
                            <a href="/create-skill" class="btn btn-primary">
                                <i data-lucide="plus"></i>
                                Share a Skill
                            </a>
                            <a href="/browse" class="btn btn-secondary">
                                <i data-lucide="search"></i>
                                Find Skills
                            </a>
                        </div>
                    </div>
                    
                    <div class="dashboard-grid">
                        <div class="dashboard-main">
                            <div class="dashboard-cards">
                                <div class="stat-cards">
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i data-lucide="book-open"></i>
                                        </div>
                                        <div class="stat-content">
                                            <h3 id="skills-count">0</h3>
                                            <p>Skills Shared</p>
                                        </div>
                                    </div>
                                    
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i data-lucide="users"></i>
                                        </div>
                                        <div class="stat-content">
                                            <h3 id="connections-count">0</h3>
                                            <p>Connections</p>
                                        </div>
                                    </div>
                                    
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i data-lucide="star"></i>
                                        </div>
                                        <div class="stat-content">
                                            <h3 id="rating-display">5.0</h3>
                                            <p>Average Rating</p>
                                        </div>
                                    </div>
                                    
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i data-lucide="calendar"></i>
                                        </div>
                                        <div class="stat-content">
                                            <h3 id="sessions-count">0</h3>
                                            <p>Sessions This Month</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card">
                                    <div class="card-header">
                                        <h3>Your Recent Skills</h3>
                                        <a href="/my-skills" class="btn btn-secondary btn-sm">View All</a>
                                    </div>
                                    <div class="card-body">
                                        <div id="recent-skills">
                                            <div class="loading">Loading your skills...</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card">
                                    <div class="card-header">
                                        <h3>Recent Activity</h3>
                                    </div>
                                    <div class="card-body">
                                        <div id="recent-activity">
                                            <div class="activity-item">
                                                <div class="activity-icon">
                                                    <i data-lucide="user-plus"></i>
                                                </div>
                                                <div class="activity-content">
                                                    <p>You joined Skill Swap!</p>
                                                    <span class="activity-time">Just now</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="dashboard-sidebar">
                            <div class="sidebar">
                                <div class="user-card">
                                    <div class="user-avatar-large">
                                        <img src="${user.avatar_url || '/assets/default-avatar.svg'}" alt="${user.name}" class="avatar">
                                        ${user.verified ? '<div class="verified-badge"><i data-lucide="check-circle"></i></div>' : ''}
                                    </div>
                                    <div class="user-info">
                                        <h4>${user.name}</h4>
                                        <p class="user-tier">${user.subscriptionTier} Member</p>
                                        ${!user.verified ? '<p class="upgrade-prompt"><a href="/subscription">Upgrade to get verified</a></p>' : ''}
                                    </div>
                                </div>
                                
                                <div class="quick-stats">
                                    <h4>Quick Stats</h4>
                                    <div class="stat-list">
                                        <div class="stat-item">
                                            <span class="stat-label">Profile Views</span>
                                            <span class="stat-value" id="profile-views">0</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="stat-label">Messages</span>
                                            <span class="stat-value" id="total-messages">0</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="stat-label">Reviews</span>
                                            <span class="stat-value" id="total-reviews">0</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="suggested-skills">
                                    <h4>Suggested for You</h4>
                                    <div id="suggested-skills-list">
                                        <div class="loading">Loading suggestions...</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        window.SkillSwap.utils.setPageTitle('Dashboard');
        this.loadDashboardData();
    }
    
    // Load dashboard data
    async loadDashboardData() {
        try {
            // Load user skills count and recent skills
            this.loadUserSkillsCount();
            this.loadRecentSkills();
            
            // Load suggestions
            this.loadSuggestedSkills();
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }
    
    async loadUserSkillsCount() {
        try {
            const response = await window.SkillSwap.api.get('/skills/my-skills');
            const skills = response.skills || [];
            
            document.getElementById('skills-count').textContent = skills.length;
            
        } catch (error) {
            console.error('Failed to load skills count:', error);
            document.getElementById('skills-count').textContent = '0';
        }
    }
    
    async loadRecentSkills() {
        try {
            const response = await window.SkillSwap.api.get('/skills/my-skills');
            const skills = response.skills || [];
            
            const recentSkillsContainer = document.getElementById('recent-skills');
            
            if (skills.length === 0) {
                recentSkillsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>You haven't shared any skills yet.</p>
                        <a href="/create-skill" class="btn btn-primary">Share Your First Skill</a>
                    </div>
                `;
            } else {
                const recentSkills = skills.slice(0, 3);
                recentSkillsContainer.innerHTML = recentSkills.map(skill => `
                    <div class="skill-item">
                        <div class="skill-info">
                            <h4>${window.SkillSwap.utils.escapeHtml(skill.title)}</h4>
                            <p>${window.SkillSwap.utils.escapeHtml(skill.category)}</p>
                        </div>
                        <div class="skill-stats">
                            <span class="rating">${skill.average_rating || 'No ratings yet'}</span>
                        </div>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error('Failed to load recent skills:', error);
            document.getElementById('recent-skills').innerHTML = `
                <div class="empty-state">
                    <p>Failed to load skills.</p>
                </div>
            `;
        }
    }
    
    async loadSuggestedSkills() {
        try {
            const response = await window.SkillSwap.api.get('/skills/suggestions');
            const suggestions = response.skills || [];
            
            const suggestionsContainer = document.getElementById('suggested-skills-list');
            
            if (suggestions.length === 0) {
                suggestionsContainer.innerHTML = `
                    <div class="suggestion-item">
                        <h5>Photography Basics</h5>
                        <p>Learn camera fundamentals</p>
                    </div>
                    <div class="suggestion-item">
                        <h5>Public Speaking</h5>
                        <p>Improve presentation skills</p>
                    </div>
                    <div class="suggestion-item">
                        <h5>Cooking Essentials</h5>
                        <p>Master basic cooking techniques</p>
                    </div>
                `;
            } else {
                suggestionsContainer.innerHTML = suggestions.slice(0, 3).map(skill => `
                    <div class="suggestion-item">
                        <h5>${window.SkillSwap.utils.escapeHtml(skill.title)}</h5>
                        <p>${window.SkillSwap.utils.escapeHtml(skill.description.substring(0, 60))}...</p>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error('Failed to load suggestions:', error);
            // Show fallback suggestions
            document.getElementById('suggested-skills-list').innerHTML = `
                <div class="suggestion-item">
                    <h5>Photography Basics</h5>
                    <p>Learn camera fundamentals</p>
                </div>
                <div class="suggestion-item">
                    <h5>Public Speaking</h5>
                    <p>Improve presentation skills</p>
                </div>
            `;
        }
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
            if (window.SkillSwap && window.SkillSwap.api) {
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
                            <div class="skill-card card hover-lift" onclick="window.SkillSwap.router.navigate('/skills/${skill.id}')">
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
            } else {
                // Fallback content if API is not available
                const container = document.getElementById('featured-skills-grid');
                if (container) {
                    container.innerHTML = `
                        <div class="feature-card">
                            <h3>Start Learning</h3>
                            <p>Browse skills shared by our community members</p>
                        </div>
                        <div class="feature-card">
                            <h3>Share Knowledge</h3>
                            <p>Create your own skill listings to teach others</p>
                        </div>
                        <div class="feature-card">
                            <h3>Fair Exchange</h3>
                            <p>Learn something new while teaching what you know</p>
                        </div>
                    `;
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
    
    // Load skills for browse page
    async loadSkills() {
        try {
            if (window.SkillSwap && window.SkillSwap.api) {
                const response = await window.SkillSwap.api.get('/skills');
                
                const container = document.getElementById('skills-grid');
                if (container && response.skills) {
                    if (response.skills.length === 0) {
                        container.innerHTML = '<div class="empty-state"><p>No skills available yet</p></div>';
                    } else {
                        container.innerHTML = response.skills.map(skill => `
                            <div class="skill-card card hover-lift" onclick="window.SkillSwap.router.navigate('/skills/${skill.id}')">
                                <div class="card-body">
                                    <h4>${skill.title}</h4>
                                    <p class="text-muted">${skill.description.substring(0, 100)}${skill.description.length > 100 ? '...' : ''}</p>
                                    <div class="skill-meta">
                                        <span class="skill-category">${skill.category}</span>
                                        <span class="skill-level">${skill.skill_level}</span>
                                    </div>
                                    <div class="skill-provider">
                                        <img src="${skill.user.avatar_url || '/assets/default-avatar.png'}" alt="${skill.user.name}" class="user-avatar-sm">
                                        <span>${skill.user.name}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('');
                    }
                }
            } else {
                // Fallback content if API is not available
                const container = document.getElementById('skills-grid');
                if (container) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <p>Sign in to browse and create skill listings</p>
                            <button class="btn btn-primary" onclick="showLoginModal()">Sign In</button>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Failed to load skills:', error);
            const container = document.getElementById('skills-grid');
            if (container) {
                container.innerHTML = '<div class="error-state"><p>Failed to load skills</p></div>';
            }
        }
    }
    
    // Setup create skill form handlers
    setupCreateSkillForm() {
        const form = document.getElementById('create-skill-form');
        if (form) {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                
                const formData = new FormData(form);
                const skillData = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    category: formData.get('category'),
                    skill_level: formData.get('skill_level'),
                    looking_for: formData.get('looking_for'),
                    session_duration: formData.get('session_duration'),
                    format: formData.get('format'),
                    availability: formData.get('availability')
                };
                
                try {
                    if (window.SkillSwap && window.SkillSwap.api) {
                        await window.SkillSwap.api.post('/skills', skillData);
                        window.SkillSwap.notifications.show('Skill created successfully!', 'success');
                        window.SkillSwap.router.navigate('/my-skills');
                    }
                } catch (error) {
                    console.error('Failed to create skill:', error);
                    if (window.SkillSwap && window.SkillSwap.notifications) {
                        window.SkillSwap.notifications.show('Failed to create skill', 'error');
                    }
                }
            });
        }
    }
    
    // Setup settings tabs
    setupSettingsTabs() {
        const tabButtons = document.querySelectorAll('.settings-tabs .tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active tab panel
                tabPanels.forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.id === `${targetTab}-tab`) {
                        panel.classList.add('active');
                    }
                });
            });
        });
    }
    
    // Load login page
    loadLoginPage() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="container" style="padding: 40px 20px; max-width: 500px;">
                    <h1>🔐 Sign In to Skill Swap</h1>
                    <p>Welcome back! Sign in to your account.</p>
                    
                    <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0;">
                        <form id="loginForm">
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Email:</label>
                                <input type="email" id="loginEmail" required style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px;">
                            </div>
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Password:</label>
                                <input type="password" id="loginPassword" required style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px;">
                            </div>
                            <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 15px;">Sign In</button>
                        </form>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <p style="color: #6B7280;">OR</p>
                        </div>
                        
                        <button class="btn btn-secondary" onclick="signInWithGoogle()" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;">
                            <span>🔍</span> Sign in with Google
                        </button>
                        
                        <div style="text-align: center; margin-top: 20px;">
                            <p>Don't have an account? <a href="#" data-navigate="/register" style="color: #3B82F6;">Sign up here</a></p>
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <button class="btn btn-secondary" data-navigate="/">← Back to Home</button>
                    </div>
                </div>
            `;
            
            // Add event listener for login form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (window.handleLogin) {
                        window.handleLogin(e);
                    }
                });
            }
        }
        
        if (window.SkillSwap && window.SkillSwap.utils) {
            window.SkillSwap.utils.setPageTitle('Sign In');
        }
    }
    
    // Load register page
    loadRegisterPage() {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = `
                <div class="container" style="padding: 40px 20px; max-width: 500px;">
                    <h1>📝 Create Your Account</h1>
                    <p>Join Skill Swap and start sharing your skills!</p>
                    
                    <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0;">
                        <form id="registerForm">
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Full Name:</label>
                                <input type="text" id="registerName" required style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px;">
                            </div>
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Email:</label>
                                <input type="email" id="registerEmail" required style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px;">
                            </div>
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Password:</label>
                                <input type="password" id="registerPassword" required minlength="6" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px;">
                            </div>
                            <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 15px;">Create Account</button>
                        </form>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <p style="color: #6B7280;">OR</p>
                        </div>
                        
                        <button class="btn btn-secondary" onclick="signUpWithGoogle()" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;">
                            <span>🔍</span> Sign up with Google
                        </button>
                        
                        <div style="text-align: center; margin-top: 20px;">
                            <p>Already have an account? <a href="#" data-navigate="/login" style="color: #3B82F6;">Sign in here</a></p>
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <button class="btn btn-secondary" data-navigate="/">← Back to Home</button>
                    </div>
                </div>
            `;
            
            // Add event listener for register form
            const registerForm = document.getElementById('registerForm');
            if (registerForm) {
                registerForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (window.handleRegister) {
                        window.handleRegister(e);
                    }
                });
            }
        }
        
        if (window.SkillSwap && window.SkillSwap.utils) {
            window.SkillSwap.utils.setPageTitle('Create Account');
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