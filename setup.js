#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

console.log('🚀 Setting up Skill Swap...\n');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('📝 Please copy .env.example to .env and configure your settings.\n');
    console.log('Run: cp .env.example .env');
    process.exit(1);
}

// Load environment variables
require('dotenv').config();

// Database configuration
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'skill_swap',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
};

async function setupDatabase() {
    console.log('📊 Setting up database...\n');
    
    const client = new Client(dbConfig);
    
    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL database');
        
        // Read and execute database schema
        const schemaPath = path.join(__dirname, 'server', 'models', 'database.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error('Database schema file not found at: ' + schemaPath);
        }
        
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schema);
        
        console.log('✅ Database schema created successfully');
        console.log('✅ Default categories and admin user created');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure PostgreSQL is running and the connection details in .env are correct.');
        } else if (error.code === '3D000') {
            console.log('\n💡 Database does not exist. Please create it first:');
            console.log(`createdb ${dbConfig.database}`);
        }
        
        process.exit(1);
    } finally {
        await client.end();
    }
}

async function createUploadDirectories() {
    console.log('\n📁 Creating upload directories...');
    
    const directories = [
        'public/uploads',
        'public/uploads/avatars',
        'public/uploads/skills'
    ];
    
    directories.forEach(dir => {
        const fullPath = path.join(__dirname, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`✅ Created directory: ${dir}`);
        }
    });
}

async function validateEnvironment() {
    console.log('\n🔍 Validating environment configuration...');
    
    const requiredVars = [
        'DB_NAME',
        'DB_USER',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        console.log('❌ Missing required environment variables:');
        missing.forEach(varName => {
            console.log(`  - ${varName}`);
        });
        console.log('\nPlease update your .env file with the missing variables.');
        process.exit(1);
    }
    
    console.log('✅ Environment configuration is valid');
}

async function main() {
    try {
        await validateEnvironment();
        await createUploadDirectories();
        await setupDatabase();
        
        console.log('\n🎉 Skill Swap setup completed successfully!\n');
        console.log('Next steps:');
        console.log('1. Start the development server: npm run dev');
        console.log('2. Open your browser to: http://localhost:3000');
        console.log('3. Register a new account or use the admin account:');
        console.log('   Email: admin@skillswap.com');
        console.log('   Password: admin123');
        console.log('\n💡 Check the README.md for more information.');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run setup if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = { setupDatabase, createUploadDirectories, validateEnvironment };