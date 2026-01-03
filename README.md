# Skill Swap - Comprehensive Skill-Sharing Marketplace

A full-stack JavaScript web application for sharing skills and learning from others. Built with Node.js, Express, PostgreSQL, Socket.io, and Vanilla JavaScript.

## 🚀 Recent Updates & New Features

### Backend Enhancements
- **📧 Email Service Integration**: Comprehensive email service with templates for welcome emails, password reset, booking confirmations, and notifications
- **🛠️ Utility Functions**: Added helper functions for password hashing, token generation, validation, file handling, and API responses
- **🔐 Enhanced Authentication**: Integrated welcome email sending for new user registrations

### Frontend Improvements
- **💬 Advanced Messaging Component**: Full-featured real-time messaging interface with typing indicators, read receipts, and conversation management
- **🎨 Asset Management**: Added default avatars, skill placeholders, and application logo
- **⚡ Script Loading**: Improved JavaScript module loading for better performance

### Key Components Added
1. **Email Service** (`server/utils/email.js`)
   - Nodemailer integration with development and production configs
   - Template-based emails (welcome, password reset, booking confirmations)
   - Bulk email support for announcements

2. **Helper Utilities** (`server/utils/helpers.js`)
   - Password utilities (hashing, validation, generation)
   - Token management (JWT, secure tokens)
   - Date/time formatting and manipulation
   - String utilities (slugify, validation, sanitization)
   - File handling and validation
   - Database query builders
   - API response formatters

3. **Messaging Component** (`public/js/messaging.js`)
   - Real-time conversation interface
   - Message sending/receiving with optimistic updates
   - Typing indicators and read receipts
   - User online/offline status
   - Message deletion and conversation management

### Environment Configuration
Updated `.env.example` with new email service variables:
```env
# Email Service Provider
SENDGRID_API_KEY=your-sendgrid-api-key
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
```

## Features

### 🚀 Core Features
- **User Authentication** - JWT-based authentication with refresh tokens
- **Skills Marketplace** - Browse, search, and filter skills by category, price, difficulty
- **Real-time Messaging** - Socket.io powered chat system with typing indicators
- **Booking System** - Schedule skill sessions with integrated video calling
- **Review & Rating System** - Rate and review skill providers
- **Freemium Subscription Tiers** - Free, Basic, Pro, and Premium tiers with usage limits

### 💎 Advanced Features
- **Real-time Notifications** - Live updates for messages, bookings, and system events
- **File Upload** - Profile avatars and skill images with multer
- **Video Integration** - Jitsi Meet integration for video calls
- **Usage Tracking** - Monitor API usage by subscription tier
- **Responsive Design** - Mobile-first responsive UI
- **Advanced Search** - Full-text search with filters and sorting

### 🎨 User Experience
- **Modern UI** - Clean, professional design with Lucide icons
- **Progressive Web App** - Fast loading with modern JavaScript
- **Toast Notifications** - User-friendly feedback system
- **Loading States** - Skeleton screens and loading indicators
- **Error Handling** - Comprehensive error handling and user feedback

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **Socket.io** - Real-time communication
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Multer** - File uploads
- **Helmet** - Security headers
- **Rate Limiting** - API protection

### Frontend
- **Vanilla JavaScript (ES6+)** - Modern JavaScript without frameworks
- **CSS Grid & Flexbox** - Responsive layouts
- **Socket.io Client** - Real-time features
- **Jitsi Meet API** - Video calling
- **Lucide Icons** - Modern icon set
- **Service Workers** - PWA capabilities (optional)

### Database Schema
- **Users** - Authentication and profile data
- **Skills** - Marketplace listings
- **Messages** - Real-time chat system
- **Bookings** - Session scheduling
- **Reviews** - Rating and feedback system
- **Subscriptions** - Tier management
- **Notifications** - System alerts

## Installation & Setup

### Prerequisites
- Node.js 16+ 
- PostgreSQL 12+
- npm or yarn

### 1. Database Setup

```bash
# Install PostgreSQL (macOS with Homebrew)
brew install postgresql
brew services start postgresql

# Create database
createdb skill_swap

# Or using psql
psql postgres
CREATE DATABASE skill_swap;
\\q
```

### 2. Project Setup

```bash
# Clone or create the project directory
cd skill-swap

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 3. Configure Environment Variables

Edit `.env` file with your settings:

```env
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skill_swap
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# Bcrypt Configuration
BCRYPT_SALT_ROUNDS=12
```

### 4. Initialize Database

```bash
# Run the database schema
psql -d skill_swap -f server/models/database.sql

# Or using node (if you create a script)
npm run db:init
```

### 5. Start the Application

```bash
# Development mode (with nodemon)
npm run dev

# Or production mode
npm start
```

The application will be available at `http://localhost:3000`

## Database Schema

### Core Tables

#### Users
```sql
users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    subscription_tier subscription_tier DEFAULT 'free',
    verified BOOLEAN DEFAULT FALSE,
    credits INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

#### Skills
```sql
skills (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER REFERENCES skill_categories(id),
    difficulty difficulty_level DEFAULT 'beginner',
    price DECIMAL(10,2) DEFAULT 0,
    duration INTEGER DEFAULT 60,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

#### Messages
```sql
messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    read_status BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/logout` - Logout user

### Skills Endpoints
- `GET /api/skills` - List skills with pagination and filters
- `POST /api/skills` - Create new skill (authenticated)
- `GET /api/skills/:id` - Get skill details
- `PUT /api/skills/:id` - Update skill (owner only)
- `DELETE /api/skills/:id` - Delete skill (owner only)
- `GET /api/skills/categories` - Get skill categories

### User Endpoints
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/avatar` - Upload avatar
- `GET /api/users/:id` - Get public user profile
- `GET /api/users` - Search users

### Messaging Endpoints
- `GET /api/messages/conversations` - Get user's conversations
- `GET /api/messages/conversations/:id/messages` - Get conversation messages
- `POST /api/messages/conversations/:id/messages` - Send message
- `POST /api/messages/conversations` - Create conversation
- `GET /api/messages/unread-count` - Get unread message count

### Booking Endpoints
- `POST /api/bookings` - Create booking
- `GET /api/bookings/sent` - Get sent booking requests
- `GET /api/bookings/received` - Get received booking requests
- `PUT /api/bookings/:id/status` - Update booking status

### Subscription Endpoints
- `GET /api/subscriptions/current` - Get current subscription
- `POST /api/subscriptions/upgrade` - Upgrade subscription
- `POST /api/subscriptions/cancel` - Cancel subscription
- `GET /api/subscriptions/usage` - Get usage statistics

## Subscription Tiers

### Free Tier
- Browse skills
- Basic profile
- 3 messages per month
- 1 booking per month

### Basic Tier ($9/month)
- All free features
- Unlimited messaging
- 10 bookings per month
- Calendar integration

### Pro Tier ($19/month)
- All basic features
- Unlimited bookings
- Verified badge
- Skill monetization
- Earnings dashboard

### Premium Tier ($39/month)
- All pro features
- Featured listings
- Advanced analytics
- Priority support

## Real-time Features

### Socket.io Events

#### Client to Server
- `join_conversation` - Join conversation room
- `send_message` - Send message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `mark_messages_read` - Mark messages as read

#### Server to Client
- `new_message` - New message received
- `user_typing` - User typing indicator
- `user_online` - User came online
- `user_offline` - User went offline
- `notification` - System notification
- `booking_notification` - Booking status update

## Security Features

### Authentication & Authorization
- JWT access tokens (24h expiry)
- Refresh tokens (7d expiry)
- bcrypt password hashing (12 rounds)
- Rate limiting on authentication endpoints

### API Security
- Helmet.js security headers
- CORS configuration
- Input validation with express-validator
- SQL injection prevention (parameterized queries)
- XSS protection
- CSRF protection

### Rate Limiting
- General API: 100 requests/15min
- Authentication: 10 requests/15min
- Messages: 50 messages/minute
- File uploads: 10 uploads/15min

## Development

### Project Structure
```
skill-swap/
├── server/                 # Backend code
│   ├── server.js          # Main server file
│   ├── config/            # Configuration files
│   ├── routes/            # API routes
│   ├── models/            # Database models
│   ├── middleware/        # Custom middleware
│   ├── utils/             # Utility functions
│   └── socket/            # Socket.io handlers
├── public/                # Frontend code
│   ├── index.html         # Main HTML file
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript modules
│   └── assets/            # Static assets
└── package.json           # Dependencies
```

### Scripts
```json
{
  "start": "node server/server.js",
  "dev": "nodemon server/server.js",
  "seed": "node server/utils/seedData.js"
}
```

### Environment Variables
See `.env.example` for all available configuration options.

## Deployment

### Vercel + Supabase Deployment (Recommended)

This application can be deployed on Vercel (frontend) with Supabase (backend/database):

#### Part 1: Set up Supabase Backend

1. **Create a Supabase account**:
   - Go to [supabase.com](https://supabase.com) and sign up
   - Create a new project

2. **Set up your database**:
   - In your Supabase dashboard, go to SQL Editor
   - Run the database schema from `server/models/database.sql` to create tables
   - Or use the setup script after deployment

3. **Get your connection details**:
   - Go to Project Settings → Database
   - Note your Host, Database, Username, Password, and Port

#### Part 2: Deploy to Vercel

1. **Prepare your code**:
   - Push this code to a GitHub/GitLab/Bitbucket repository

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com) and connect your Git account
   - Import your repository
   - In the settings, set:
     - Build Command: `npm run vercel-build`
     - Output Directory: leave empty
     - Install Command: `npm install`

3. **Add Environment Variables in Vercel Dashboard**:
   - `NODE_ENV` - Set to 'production'
   - `SUPABASE_HOST` - Your Supabase project URL
   - `SUPABASE_PORT` - Usually 5432
   - `SUPABASE_DATABASE` - Usually 'postgres'
   - `SUPABASE_USER` - Your Supabase database user
   - `SUPABASE_PASSWORD` - Your Supabase database password
   - `JWT_SECRET` - JWT secret for authentication
   - `JWT_REFRESH_SECRET` - JWT refresh token secret
   - `GOOGLE_CLIENT_ID` - Google OAuth client ID
   - `SENDGRID_API_KEY` or AWS credentials for email service

4. **Vercel Configuration**:
   The `vercel.json` file is already configured for this application:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server/server.js",
         "use": "@vercel/node",
         "config": { 
           "includeFiles": ["server/**/*", "public/**/*", "package.json", "package-lock.json", "*.js", "*.json", "*.env"]
         }
       }
     ],
     "routes": [
       {
         "src": "^(api/.*)$",
         "dest": "server/server.js"
       },
       {
         "src": "^(.*)$",
         "dest": "server/server.js"
       }
     ],
     "env": {
       "NODE_ENV": "production",
       "PORT": "3000"
     }
   }
   ```

### Alternative: Railway Deployment
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8000
CMD ["npm", "start"]
```

### Post-Deployment Setup

After deployment, run the database setup:

```bash
npm run setup
```

This will create the necessary database tables and initial data.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Email: support@skillswap.com
- Documentation: https://docs.skillswap.com

---

Built with ❤️ using modern JavaScript technologies.