const request = require('supertest');
const express = require('express');
const authRoutes = require('../../../server/routes/auth');
const db = require('../../../server/config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../../server/config/database');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = testHelper.createMockUser();
      const mockHashedPassword = 'hashedpassword123';
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      // Mock database operations
      db.getUserByEmail.mockResolvedValue(null); // User doesn't exist
      bcrypt.hash.mockResolvedValue(mockHashedPassword);
      db.query.mockResolvedValueOnce({ rows: [mockUser] }); // Insert user
      jwt.sign.mockReturnValueOnce(mockTokens.accessToken)
              .mockReturnValueOnce(mockTokens.refreshToken);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.tokens).toEqual(mockTokens);
    });

    it('should return 400 if user already exists', async () => {
      const existingUser = testHelper.createMockUser();
      db.getUserByEmail.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User already exists');
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123' // Too short
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = { 
        ...testHelper.createMockUser(), 
        password_hash: 'hashedpassword123' 
      };
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      db.getUserByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValueOnce(mockTokens.accessToken)
              .mockReturnValueOnce(mockTokens.refreshToken);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tokens).toEqual(mockTokens);
    });

    it('should return 401 for invalid credentials', async () => {
      db.getUserByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for wrong password', async () => {
      const mockUser = { 
        ...testHelper.createMockUser(), 
        password_hash: 'hashedpassword123' 
      };

      db.getUserByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const mockUser = testHelper.createMockUser();
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      jwt.verify.mockReturnValue({ userId: mockUser.id });
      db.getUserById.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValueOnce(mockTokens.accessToken)
              .mockReturnValueOnce(mockTokens.refreshToken);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token'
        });

      expect(response.status).toBe(200);
      expect(response.body.tokens).toEqual(mockTokens);
    });

    it('should return 401 for invalid refresh token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid refresh token');
    });
  });
});