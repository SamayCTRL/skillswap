// vercel-entry.js - Vercel-compatible entry point
// This file allows the Express app to work in a Vercel serverless environment

// Only start the server if not in a Vercel environment
if (process.env.VERCEL_ENV !== 'production') {
  // This is for local development only
  const express = require('express');
  const http = require('http');
  const socketIo = require('socket.io');
  const cors = require('cors');
  const helmet = require('helmet');
  const morgan = require('morgan');
  const rateLimit = require('express-rate-limit');
  const mongoSanitize = require('express-mongo-sanitize');
  const xss = require('xss');
  const path = require('path');
  require('dotenv').config();

  const db = require('./config/database');
  const { authMiddleware } = require('./middleware/auth');

  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/users');
  const skillRoutes = require('./routes/skills');
  const messageRoutes = require('./routes/messages');
  const bookingRoutes = require('./routes/bookings');
  const subscriptionRoutes = require('./routes/subscriptions');

  const messagingSocket = require('./socket/messaging');

  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server, {
      cors: {
          origin: process.env.CLIENT_URL || "http://localhost:8000",
          methods: ["GET", "POST"],
      },
      transports: ['websocket', 'polling']
  });

  // Security middleware
  app.use(helmet({
      contentSecurityPolicy: {
          directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: ["'self'", "https:"],
              upgradeInsecureRequests: [],
          },
      },
  }));

  app.use(cors({
      origin: process.env.CLIENT_URL || "http://localhost:8000",
      credentials: true
  }));

  // Rate limiting
  const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 requests per windowMs
      message: 'Too many authentication attempts, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
  });

  // Logging
  app.use(morgan('combined'));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Data sanitization
  app.use(mongoSanitize());

  // XSS protection for query parameters
  app.use((req, res, next) => {
      if (req.query) {
          req.query = JSON.parse(JSON.stringify(req.query), (key, value) =>
              typeof value === 'string' ? xss(value) : value
          );
      }
      next();
  });

  // Static files
  app.use(express.static(path.join(__dirname, '../public')));

  // Health check endpoint
  app.get('/health', (req, res) => {
      res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0'
      });
  });

  // API Routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', userRoutes); // No auth required for public user profiles
  app.use('/api/skills', skillRoutes);
  app.use('/api/messages', authMiddleware, messageRoutes);
  app.use('/api/bookings', authMiddleware, bookingRoutes);
  app.use('/api/subscriptions', authMiddleware, subscriptionRoutes);

  // Serve static files
  app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../public', 'index.html'));
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
      });
  });

  // Socket.io connection handling
  messagingSocket(io);

  // Initialize database connection and start server
  async function startServer() {
      try {
          await db.testConnection();
          const PORT = process.env.PORT || 8000;
          
          server.listen(PORT, () => {
              console.log(`🚀 Skill Swap server running on port ${PORT}`);
              console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
              console.log(`🔗 Health check: http://localhost:${PORT}/health`);
              console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
              console.log(`📱 Frontend URL: http://localhost:${PORT}`);
          });
      } catch (error) {
          console.error('Failed to start server:', error);
          process.exit(1);
      }
  }

  if (require.main === module) {
      startServer();
  }

  module.exports = app;
} else {
  // For Vercel environment
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const morgan = require('morgan');
  const rateLimit = require('express-rate-limit');
  const mongoSanitize = require('express-mongo-sanitize');
  const xss = require('xss');
  const path = require('path');
  require('dotenv').config();

  const db = require('./config/database');
  const { authMiddleware } = require('./middleware/auth');

  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/users');
  const skillRoutes = require('./routes/skills');
  const messageRoutes = require('./routes/messages');
  const bookingRoutes = require('./routes/bookings');
  const subscriptionRoutes = require('./routes/subscriptions');

  const app = express();

  // Security middleware
  app.use(helmet({
      contentSecurityPolicy: {
          directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: ["'self'", "https:"],
              upgradeInsecureRequests: [],
          },
      },
  }));

  app.use(cors({
      origin: process.env.CLIENT_URL || "http://localhost:8000",
      credentials: true
  }));

  // Rate limiting
  const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 requests per windowMs
      message: 'Too many authentication attempts, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
  });

  // Logging - only in development for Vercel
  if (process.env.NODE_ENV !== 'production') {
      app.use(morgan('combined'));
  }

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Data sanitization
  app.use(mongoSanitize());

  // XSS protection for query parameters
  app.use((req, res, next) => {
      if (req.query) {
          req.query = JSON.parse(JSON.stringify(req.query), (key, value) =>
              typeof value === 'string' ? xss(value) : value
          );
      }
      next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
      res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0'
      });
  });

  // API Routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', userRoutes); // No auth required for public user profiles
  app.use('/api/skills', skillRoutes);
  app.use('/api/messages', authMiddleware, messageRoutes);
  app.use('/api/bookings', authMiddleware, bookingRoutes);
  app.use('/api/subscriptions', authMiddleware, subscriptionRoutes);

  // Error handling middleware
  app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
      });
  });

  module.exports = app;
}