-- Skill Swap Database Schema
-- PostgreSQL Database Setup

-- Create database (run manually)
-- CREATE DATABASE skill_swap;

-- Use UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Subscription tiers enum
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'pro', 'premium');

-- Booking status enum
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Subscription status enum
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due');

-- Notification type enum
CREATE TYPE notification_type AS ENUM ('message', 'booking', 'review', 'subscription', 'system');

-- Difficulty level enum
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- User role enum
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');

-- Users table with subscription tracking
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    subscription_tier subscription_tier DEFAULT 'free',
    role user_role DEFAULT 'user',
    verified BOOLEAN DEFAULT FALSE,
    credits INTEGER DEFAULT 0,
    location VARCHAR(100),
    timezone VARCHAR(50),
    phone VARCHAR(20),
    website VARCHAR(200),
    social_links JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skill categories table
CREATE TABLE skill_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skills marketplace table
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER REFERENCES skill_categories(id),
    difficulty difficulty_level DEFAULT 'beginner',
    price DECIMAL(10,2) DEFAULT 0,
    duration INTEGER DEFAULT 60, -- in minutes
    featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    views INTEGER DEFAULT 0,
    tags TEXT[],
    requirements TEXT,
    what_you_learn TEXT,
    max_participants INTEGER DEFAULT 1,
    location_type VARCHAR(20) DEFAULT 'online', -- 'online', 'in-person', 'both'
    location VARCHAR(200),
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(participant1_id, participant2_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file'
    file_url VARCHAR(500),
    read_status BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status booking_status DEFAULT 'pending',
    meeting_url VARCHAR(500),
    meeting_password VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    participants INTEGER DEFAULT 1,
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews and ratings table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reviewer_id, booking_id)
);

-- Subscription management table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    status subscription_status DEFAULT 'active',
    stripe_subscription_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage tracking for freemium limits
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'message', 'booking', 'skill_view'
    count INTEGER DEFAULT 1,
    month_year VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, action_type, month_year)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    related_id UUID, -- Can reference booking, message, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User favorites table
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_id)
);

-- User followers table (for expert following)
CREATE TABLE user_followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
);

-- Skill availability table (for scheduling)
CREATE TABLE skill_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_skills_user_id ON skills(user_id);
CREATE INDEX idx_skills_category_id ON skills(category_id);
CREATE INDEX idx_skills_active ON skills(active);
CREATE INDEX idx_skills_featured ON skills(featured);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_bookings_requester_id ON bookings(requester_id);
CREATE INDEX idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX idx_bookings_scheduled_time ON bookings(scheduled_time);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_status ON notifications(read_status);
CREATE INDEX idx_usage_tracking_user_month ON usage_tracking(user_id, month_year);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default skill categories
INSERT INTO skill_categories (name, description, icon, color, sort_order) VALUES
('Technology', 'Programming, web development, AI, data science', 'code', '#3B82F6', 1),
('Creative', 'Design, photography, writing, music, art', 'palette', '#EC4899', 2),
('Business', 'Marketing, finance, entrepreneurship, consulting', 'briefcase', '#10B981', 3),
('Lifestyle', 'Cooking, fitness, wellness, personal development', 'heart', '#F59E0B', 4),
('Education', 'Teaching, tutoring, academic subjects', 'academic-cap', '#8B5CF6', 5),
('Health', 'Nutrition, mental health, medical advice', 'shield-check', '#EF4444', 6);

-- Function to get user's current subscription tier
CREATE OR REPLACE FUNCTION get_user_subscription_tier(user_uuid UUID)
RETURNS subscription_tier AS $$
DECLARE
    current_tier subscription_tier;
BEGIN
    SELECT subscription_tier INTO current_tier
    FROM users
    WHERE id = user_uuid;
    
    RETURN COALESCE(current_tier, 'free');
END;
$$ LANGUAGE plpgsql;

-- Function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(user_uuid UUID, action VARCHAR(50), current_month VARCHAR(7))
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER := 0;
    tier subscription_tier;
    limit_reached BOOLEAN := FALSE;
BEGIN
    -- Get user's subscription tier
    SELECT subscription_tier INTO tier FROM users WHERE id = user_uuid;
    
    -- Get current usage count
    SELECT count INTO current_count
    FROM usage_tracking
    WHERE user_id = user_uuid AND action_type = action AND month_year = current_month;
    
    -- Check limits based on tier and action
    IF tier = 'free' THEN
        IF action = 'message' AND current_count >= 3 THEN
            limit_reached := TRUE;
        END IF;
    END IF;
    
    RETURN NOT limit_reached;
END;
$$ LANGUAGE plpgsql;

-- Create initial admin user (password: admin123 - hashed with bcrypt)
INSERT INTO users (email, password_hash, name, subscription_tier, verified) VALUES
('admin@skillswap.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewJVTOT1iHx9wfQ6', 'Admin User', 'premium', TRUE);

-- Sample data will be added via seed script