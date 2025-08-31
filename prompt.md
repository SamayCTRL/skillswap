PROJECT: Skill Swap Web Application - JavaScript Full-Stack Build
Build a comprehensive skill-sharing marketplace web application called "Skill Swap" using a complete JavaScript full-stack architecture.
TECHNOLOGY STACK:
    •    Frontend: Vanilla JavaScript (ES6+) with modern HTML5/CSS3
    •    Backend: Node.js with Express.js
    •    Database: PostgreSQL with node-postgres (pg) driver
    •    Authentication: JWT (jsonwebtoken) with bcrypt for password hashing
    •    Real-time: Socket.io for live messaging
    •    Payment: Mock Stripe integration setup
    •    Environment: dotenv for configuration
    •    Development: nodemon for auto-restart
PROJECT STRUCTURE:
skill-swap/
├── server/
│   ├── server.js (main Express server)
│   ├── config/
│   │   ├── database.js
│   │   └── config.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── skills.js
│   │   ├── messages.js
│   │   ├── bookings.js
│   │   └── subscriptions.js
│   ├── models/
│   │   └── database.sql
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rateLimiter.js
│   │   └── validation.js
│   ├── utils/
│   │   ├── email.js
│   │   └── helpers.js
│   └── socket/
│       └── messaging.js
├── public/
│   ├── index.html
│   ├── css/
│   │   ├── main.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── messaging.js
│   │   └── components/
│   └── assets/
├── package.json
└── README.md
BACKEND IMPLEMENTATION:
Database Schema (PostgreSQL): Create comprehensive database with these tables:
-- Users table with subscription tracking
users (id, email, password_hash, name, bio, avatar_url, subscription_tier, verified, credits, created_at, updated_at)

-- Skills marketplace
skills (id, user_id, title, description, category_id, difficulty, price, featured, active, views, created_at)
skill_categories (id, name, description, icon)

-- Messaging system
conversations (id, participant1_id, participant2_id, last_message_at)
messages (id, conversation_id, sender_id, content, timestamp, read_status)

-- Booking system
bookings (id, skill_id, requester_id, provider_id, scheduled_time, status, meeting_url, price, created_at)

-- Review and rating system
reviews (id, reviewer_id, reviewee_id, skill_id, booking_id, rating, comment, created_at)

-- Subscription management
subscriptions (id, user_id, tier, start_date, end_date, status, stripe_subscription_id)
usage_tracking (id, user_id, action_type, count, month_year)

-- Notifications
notifications (id, user_id, type, title, content, read_status, created_at)
Express.js Server Setup:
    •    Main server.js with Express, CORS, body-parser, helmet
    •    PostgreSQL connection pooling
    •    JWT middleware for authentication
    •    Socket.io integration for real-time features
    •    Rate limiting (express-rate-limit)
    •    Input validation (express-validator)
    •    File upload handling (multer) for avatars
API Routes:
// Authentication routes
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/verify-token

// User management
GET /api/users/profile
PUT /api/users/profile
GET /api/users/search
GET /api/users/:id
POST /api/users/avatar-upload

// Skills marketplace
GET /api/skills (with pagination, search, filtering)
POST /api/skills
GET /api/skills/:id
PUT /api/skills/:id
DELETE /api/skills/:id
GET /api/skills/categories

// Messaging system
GET /api/conversations
GET /api/conversations/:id/messages
POST /api/conversations/:id/messages
GET /api/messages/unread-count

// Booking system
POST /api/bookings
GET /api/bookings/sent
GET /api/bookings/received
PUT /api/bookings/:id/status
POST /api/bookings/:id/meeting-url

// Reviews
POST /api/reviews
GET /api/reviews/user/:id
GET /api/reviews/skill/:id

// Subscription management
GET /api/subscriptions/current
POST /api/subscriptions/upgrade
POST /api/subscriptions/cancel
GET /api/subscriptions/usage

// Notifications
GET /api/notifications
PUT /api/notifications/:id/read
FRONTEND IMPLEMENTATION:
Modern Vanilla JavaScript SPA:
    •    Module-based architecture with ES6 imports
    •    Component-based UI rendering
    •    Client-side routing (History API)
    •    State management with custom store
    •    Responsive CSS Grid/Flexbox layouts
    •    Progressive Web App features
Core Frontend Components:
// Main application structure
components/
├── Header.js (navigation, user menu)
├── Dashboard.js (tier-specific dashboards)
├── SkillBrowser.js (marketplace with search/filters)
├── SkillCard.js (individual skill display)
├── SkillDetail.js (detailed skill view)
├── UserProfile.js (profile management)
├── Messaging.js (real-time chat interface)
├── BookingModal.js (skill booking interface)
├── SubscriptionManager.js (tier management)
└── NotificationCenter.js (alerts and updates)
Freemium Business Logic (Server-Side Enforced):
    •    Free Users: 3 messages/month, browse skills, basic profile
    •    Basic ($9/month): Unlimited messaging, booking requests, schedule integration
    •    Pro ($19/month): Verification badge, skill monetization, earnings dashboard
    •    Premium ($39/month): Featured listings, advanced analytics, priority support
Real-Time Features (Socket.io):
// Socket events
'message:send'
'message:receive'
'user:online'
'user:offline'
'notification:new'
'booking:update'
'typing:start'
'typing:stop'
Key Backend Features:
    •    JWT authentication with refresh tokens
    •    Bcrypt password hashing (12 rounds)
    •    PostgreSQL connection pooling
    •    Input validation and sanitization
    •    Rate limiting (per user and endpoint)
    •    Error handling and logging
    •    Mock email notifications
    •    Subscription tier middleware
    •    Usage tracking for freemium limits
    •    Database transaction handling
Frontend Features:
    •    Responsive design (mobile-first)
    •    Real-time messaging interface
    •    Advanced skill search and filtering
    •    User profile management
    •    Jitsi Meet integration for video calls
    •    Subscription upgrade prompts
    •    Usage tracking display
    •    Notification system
    •    Loading states and error handling
Development Setup:
// package.json dependencies
{
  "express": "^4.18.2",
  "pg": "^8.8.0",
  "jsonwebtoken": "^9.0.0",
  "bcryptjs": "^2.4.3",
  "socket.io": "^4.7.0",
  "cors": "^2.8.5",
  "helmet": "^6.1.0",
  "express-rate-limit": "^6.7.0",
  "express-validator": "^6.15.0",
  "multer": "^1.4.5-lts.1",
  "dotenv": "^16.0.3"
}
Sample Data Generation: Create realistic seed data including:
    •    30+ users across all subscription tiers
    •    100+ skills across 6 categories (Tech, Creative, Business, Lifestyle, Education, Health)
    •    Sample conversations and message histories
    •    Booking records and reviews
    •    Subscription tracking data
    •    Usage analytics data
Security Implementation:
    •    SQL injection prevention (parameterized queries)
    •    XSS protection (input sanitization)
    •    CSRF protection
    •    Rate limiting per user/IP
    •    Secure JWT handling
    •    Password complexity requirements
    •    Session management
Development Workflow:
    1    Set up PostgreSQL database with schema
    2    Create Express server with basic routing
    3    Implement JWT authentication system
    4    Build skills CRUD with PostgreSQL
    5    Add real-time messaging with Socket.io
    6    Create subscription tier middleware
    7    Build responsive frontend SPA
    8    Implement booking and review systems
    9    Add Jitsi Meet video integration
    10    Create notification and analytics systems
Deployment Ready: Structure code for deployment to Railway/Render (backend) and Netlify/Vercel (frontend) with environment variables for database connection, JWT secrets, and API configurations.
Build this as a production-ready, scalable application with comprehensive error handling, logging, and documentation. Include development and production environment configurations.
