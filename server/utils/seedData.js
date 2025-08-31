const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'skill_swap',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

// Sample users data
const sampleUsers = [
    {
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        bio: 'Full-stack developer with 5 years experience in React and Node.js. Love teaching and mentoring new developers.',
        subscription_tier: 'pro'
    },
    {
        name: 'Mike Chen',
        email: 'mike@example.com', 
        bio: 'UI/UX Designer specialized in mobile apps. Passionate about creating beautiful and functional user experiences.',
        subscription_tier: 'basic'
    },
    {
        name: 'Emily Rodriguez',
        email: 'emily@example.com',
        bio: 'Marketing consultant with expertise in digital marketing and social media strategy.',
        subscription_tier: 'premium'
    },
    {
        name: 'David Kim',
        email: 'david@example.com',
        bio: 'Python developer and data scientist. Experienced in machine learning and data visualization.',
        subscription_tier: 'basic'
    },
    {
        name: 'Lisa Thompson',
        email: 'lisa@example.com',
        bio: 'Graphic designer and illustrator with 8+ years experience in branding and print design.',
        subscription_tier: 'free'
    }
];

// Sample skills data
const sampleSkills = [
    {
        title: 'React Development Fundamentals',
        description: 'Learn the basics of React including components, props, state, and hooks. Perfect for beginners who want to get started with modern web development.',
        category_id: 1, // Technology
        difficulty: 'beginner',
        price: 50.00,
        duration: 90,
        tags: ['react', 'javascript', 'frontend', 'web development'],
        requirements: 'Basic JavaScript knowledge',
        what_you_learn: 'How to build interactive web applications with React'
    },
    {
        title: 'UI/UX Design Principles',
        description: 'Master the fundamentals of user interface and user experience design. Learn design thinking, wireframing, and prototyping.',
        category_id: 2, // Creative
        difficulty: 'intermediate',
        price: 75.00,
        duration: 120,
        tags: ['ui', 'ux', 'design', 'figma'],
        requirements: 'Interest in design and creativity',
        what_you_learn: 'Design principles, user research, prototyping tools'
    },
    {
        title: 'Digital Marketing Strategy',
        description: 'Comprehensive course on digital marketing including SEO, social media, content marketing, and analytics.',
        category_id: 3, // Business
        difficulty: 'intermediate',
        price: 100.00,
        duration: 150,
        tags: ['marketing', 'seo', 'social media', 'analytics'],
        requirements: 'Basic understanding of online business',
        what_you_learn: 'How to create and execute effective digital marketing campaigns'
    },
    {
        title: 'Python Data Science',
        description: 'Learn data analysis and visualization using Python, pandas, and matplotlib. Perfect for aspiring data scientists.',
        category_id: 1, // Technology
        difficulty: 'advanced',
        price: 120.00,
        duration: 180,
        tags: ['python', 'data science', 'pandas', 'matplotlib'],
        requirements: 'Basic Python programming knowledge',
        what_you_learn: 'Data manipulation, visualization, and statistical analysis'
    },
    {
        title: 'Adobe Photoshop Mastery',
        description: 'From beginner to advanced Photoshop techniques. Learn photo editing, digital art, and design principles.',
        category_id: 2, // Creative
        difficulty: 'beginner',
        price: 60.00,
        duration: 120,
        tags: ['photoshop', 'photo editing', 'digital art', 'design'],
        requirements: 'Access to Adobe Photoshop',
        what_you_learn: 'Photo retouching, digital art creation, design workflows'
    }
];

async function seedDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('🌱 Starting database seeding...\n');
        
        // Check if data already exists
        const existingUsers = await client.query('SELECT COUNT(*) FROM users WHERE email NOT LIKE \'%@skillswap.com\'');
        const userCount = parseInt(existingUsers.rows[0].count);
        
        if (userCount > 0) {
            console.log(`ℹ️  Found ${userCount} existing users. Skipping seed data creation.`);
            console.log('💡 To reseed, delete existing data first or modify this script.\n');
            return;
        }
        
        console.log('👥 Creating sample users...');
        
        // Hash password for all sample users
        const passwordHash = await bcrypt.hash('password123', 12);
        
        // Insert sample users
        const userIds = [];
        for (const userData of sampleUsers) {
            const userId = uuidv4();
            userIds.push(userId);
            
            await client.query(`
                INSERT INTO users (id, email, password_hash, name, bio, subscription_tier, verified)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                userId,
                userData.email,
                passwordHash,
                userData.name,
                userData.bio,
                userData.subscription_tier,
                true
            ]);
            
            console.log(`✅ Created user: ${userData.name} (${userData.email})`);
        }
        
        console.log('\\n🎯 Creating sample skills...');
        
        // Insert sample skills
        for (let i = 0; i < sampleSkills.length; i++) {
            const skillData = sampleSkills[i];
            const skillId = uuidv4();
            const userId = userIds[i % userIds.length]; // Distribute skills among users
            
            await client.query(`
                INSERT INTO skills (
                    id, user_id, title, description, category_id, difficulty, 
                    price, duration, tags, requirements, what_you_learn, featured
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                skillId,
                userId,
                skillData.title,
                skillData.description,
                skillData.category_id,
                skillData.difficulty,
                skillData.price,
                skillData.duration,
                skillData.tags,
                skillData.requirements,
                skillData.what_you_learn,
                i < 3 // First 3 skills are featured
            ]);
            
            console.log(`✅ Created skill: ${skillData.title}`);
        }
        
        console.log('\\n📊 Creating sample conversations and messages...');
        
        // Create a few sample conversations
        if (userIds.length >= 2) {
            const conversationId = uuidv4();
            
            await client.query(`
                INSERT INTO conversations (id, participant1_id, participant2_id)
                VALUES ($1, $2, $3)
            `, [conversationId, userIds[0], userIds[1]]);
            
            // Add some sample messages
            const messages = [
                { sender: userIds[0], content: 'Hi! I\\'m interested in your React course.' },
                { sender: userIds[1], content: 'Great! I\\'d be happy to help you learn React. When would you like to start?' },
                { sender: userIds[0], content: 'How about this weekend? I\\'m free on Saturday afternoon.' },
                { sender: userIds[1], content: 'Perfect! Saturday at 2 PM works for me. I\\'ll send you the meeting link.' }
            ];
            
            for (const message of messages) {
                await client.query(`
                    INSERT INTO messages (conversation_id, sender_id, content)
                    VALUES ($1, $2, $3)
                `, [conversationId, message.sender, message.content]);
            }
            
            // Update conversation last_message_at
            await client.query(`
                UPDATE conversations 
                SET last_message_at = CURRENT_TIMESTAMP 
                WHERE id = $1
            `, [conversationId]);
            
            console.log('✅ Created sample conversation with messages');
        }
        
        console.log('\\n🔔 Creating sample notifications...');
        
        // Create sample notifications
        for (let i = 0; i < userIds.length; i++) {
            await client.query(`
                INSERT INTO notifications (user_id, type, title, content)
                VALUES ($1, $2, $3, $4)
            `, [
                userIds[i],
                'system',
                'Welcome to Skill Swap!',
                'Thank you for joining our community. Start exploring skills and connect with other learners!'
            ]);
        }
        
        console.log('✅ Created welcome notifications for all users');
        
        console.log('\\n📈 Updating database statistics...');
        
        // Add some view counts and interactions
        await client.query(`
            UPDATE skills 
            SET views = FLOOR(RANDOM() * 100) + 10
        `);
        
        console.log('✅ Updated skill view counts');
        
        console.log('\\n🎉 Database seeding completed successfully!\\n');
        console.log('Sample user accounts created:');
        console.log('Email: sarah@example.com | Password: password123 | Tier: Pro');
        console.log('Email: mike@example.com | Password: password123 | Tier: Basic');
        console.log('Email: emily@example.com | Password: password123 | Tier: Premium');
        console.log('Email: david@example.com | Password: password123 | Tier: Basic');
        console.log('Email: lisa@example.com | Password: password123 | Tier: Free');
        console.log('\\nAdmin account:');
        console.log('Email: admin@skillswap.com | Password: admin123 | Tier: Premium');
        
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function clearSeedData() {
    const client = await pool.connect();
    
    try {
        console.log('🗑️  Clearing seed data...');
        
        // Delete in reverse order of dependencies
        await client.query('DELETE FROM messages');
        await client.query('DELETE FROM conversations');
        await client.query('DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email NOT LIKE \\'%@skillswap.com\\')');
        await client.query('DELETE FROM skills WHERE user_id IN (SELECT id FROM users WHERE email NOT LIKE \\'%@skillswap.com\\')');
        await client.query('DELETE FROM users WHERE email NOT LIKE \\'%@skillswap.com\\'');
        
        console.log('✅ Seed data cleared successfully');
        
    } catch (error) {
        console.error('❌ Failed to clear seed data:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run seeding if this script is executed directly
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'clear') {
        clearSeedData()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    } else {
        seedDatabase()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    }
}

module.exports = { seedDatabase, clearSeedData };