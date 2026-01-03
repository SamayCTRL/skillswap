# Supabase Setup Guide

This guide will help you set up Supabase as the backend for your Skill Swap application.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up for an account
2. Click "New Project"
3. Enter your project details and create the project
4. Wait for the project to be provisioned (this may take a minute)

## Step 2: Configure Database Schema

### Option A: Using SQL Editor (Recommended)

1. In your Supabase dashboard, go to the "SQL Editor" tab
2. Copy the contents of `server/models/database.sql` file
3. Paste the SQL commands in the editor
4. Click "Run" to execute the commands

### Option B: Using the Setup Script

After deploying your application, you can run the setup script to create the database schema:

```bash
npm run setup
```

## Step 3: Get Connection Details

1. Go to your project dashboard
2. Click on "Project Settings" in the left sidebar
3. Click on "Database" 
4. You'll find your connection details:
   - Host: Found under "Connection String" section
   - Port: Usually 5432
   - Database: Usually "postgres"
   - Username: Found under "Connection String" section
   - Password: The password you set when creating the project

## Step 4: Configure Environment Variables

In your Vercel deployment, set these environment variables:

```
SUPABASE_HOST=your-project.supabase.co
SUPABASE_PORT=5432
SUPABASE_DATABASE=postgres
SUPABASE_USER=your-username
SUPABASE_PASSWORD=your-password
```

## Step 5: Enable Authentication (Optional)

To use Supabase Auth instead of the built-in JWT system:

1. Go to "Authentication" → "Settings" in your dashboard
2. Configure email templates if needed
3. Set up OAuth providers (Google, etc.) under "Providers"

Note: This application currently uses its own JWT authentication system, but can be modified to use Supabase Auth if preferred.

## Step 6: Enable Real-time Features (Optional)

1. Go to "Database" → "Realtime" in your dashboard
2. Enable the Realtime API
3. Configure the settings as needed

## Security Considerations

1. **Row Level Security (RLS)**: Consider enabling RLS for enhanced security:
   - Go to "Database" → "Policies" 
   - Create policies to control access to your tables

2. **API Keys**: Keep your service role key secure and never expose it in client-side code

3. **Connection Pooling**: For production applications, consider using connection pooling

## Testing the Connection

After configuring your environment variables, test the connection by:

1. Deploying your application
2. Checking the application logs for database connection status
3. Testing API endpoints that interact with the database

## Troubleshooting

### Common Issues:

1. **Connection Refused**: Check that your connection details are correct
2. **SSL Error**: Ensure SSL is enabled in your database configuration
3. **Permission Error**: Verify your database user has the necessary permissions

### Useful Links:

- [Supabase Documentation](https://supabase.com/docs)
- [Database Connection Pooling](https://supabase.com/docs/guides/database/connection-pooling)
- [Authentication Guide](https://supabase.com/docs/guides/auth)