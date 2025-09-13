const request = require('supertest');
const app = require('../../../server/server');
const db = require('../../../server/config/database');

describe('Auth Integration Tests', () => {
  const testUser = {
    name: 'Integration Test User',
    email: 'integration@test.com',
    password: 'password123'
  };

  beforeAll(async () => {
    // Clean up any existing test data
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    
    // Close database connections
    if (db.pool && typeof db.pool.end === 'function') {
      await db.pool.end();
    }
  });

  describe('User Registration and Login Flow', () => {
    let accessToken;
    let refreshToken;

    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();

      accessToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
    });

    it('should not register user with same email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.error).toBe('User already exists');
    });

    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('should not login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should refresh tokens', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Password Reset Flow', () => {
    it('should request password reset', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.message).toContain('reset link');
    });

    it('should handle non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      // Should still return success for security reasons
      expect(response.body.message).toContain('reset link');
    });
  });
});