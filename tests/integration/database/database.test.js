const db = require('../../../server/config/database');

describe('Database Integration Tests', () => {
  let skipTests = false;

  beforeAll(async () => {
    // Check if test database is available
    try {
      const isConnected = await db.testConnection();
      if (!isConnected) {
        skipTests = true;
        console.warn('⚠️ Test database not available - skipping integration tests');
      }
    } catch (error) {
      skipTests = true;
      console.warn('⚠️ Database connection failed - skipping integration tests:', error.message);
    }
  });

  afterAll(async () => {
    // Clean up and close connections
    if (db.pool && typeof db.pool.end === 'function') {
      await db.pool.end();
    }
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      if (skipTests) {
        console.warn('⚠️ Skipping test - database not available');
        return;
      }

      const result = await db.query('SELECT NOW()');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].now).toBeInstanceOf(Date);
    });

    it('should handle parameterized queries', async () => {
      const testValue = 'test-value';
      const result = await db.query('SELECT $1 as test_value', [testValue]);
      expect(result.rows[0].test_value).toBe(testValue);
    });
  });

  describe('User Database Operations', () => {
    const testEmail = 'dbtest@example.com';
    let testUserId;

    beforeAll(async () => {
      // Clean up any existing test user
      await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
    });

    afterAll(async () => {
      // Clean up test user
      if (testUserId) {
        await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
      }
    });

    it('should create a new user', async () => {
      const result = await db.query(`
        INSERT INTO users (name, email, password_hash, subscription_tier, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, name, subscription_tier, role
      `, ['DB Test User', testEmail, 'hashedpassword', 'free', 'user']);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].email).toBe(testEmail);
      expect(result.rows[0].subscription_tier).toBe('free');
      expect(result.rows[0].role).toBe('user');
      
      testUserId = result.rows[0].id;
    });

    it('should find user by email', async () => {
      const user = await db.getUserByEmail(testEmail);
      
      expect(user).toBeTruthy();
      expect(user.email).toBe(testEmail);
      expect(user.id).toBe(testUserId);
    });

    it('should find user by ID', async () => {
      const user = await db.getUserById(testUserId);
      
      expect(user).toBeTruthy();
      expect(user.email).toBe(testEmail);
      expect(user.id).toBe(testUserId);
    });

    it('should check if user exists', async () => {
      const exists = await db.userExists(testUserId);
      expect(exists).toBe(true);

      const notExists = await db.userExists('non-existent-id');
      expect(notExists).toBe(false);
    });

    it('should get user subscription tier', async () => {
      const tier = await db.getUserSubscriptionTier(testUserId);
      expect(tier).toBe('free');
    });
  });

  describe('Usage Tracking', () => {
    let testUserId;
    const testEmail = 'usagetest@example.com';

    beforeAll(async () => {
      // Create test user
      const result = await db.query(`
        INSERT INTO users (name, email, password_hash, subscription_tier)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['Usage Test User', testEmail, 'hashedpassword', 'free']);
      
      testUserId = result.rows[0].id;

      // Clean up any existing usage data
      await db.query('DELETE FROM usage_tracking WHERE user_id = $1', [testUserId]);
    });

    afterAll(async () => {
      // Clean up
      await db.query('DELETE FROM usage_tracking WHERE user_id = $1', [testUserId]);
      await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    });

    it('should track usage correctly', async () => {
      await db.updateUsageTracking(testUserId, 'message');
      
      const count = await db.getUsageCount(testUserId, 'message');
      expect(count).toBe(1);

      // Track another usage
      await db.updateUsageTracking(testUserId, 'message');
      
      const updatedCount = await db.getUsageCount(testUserId, 'message');
      expect(updatedCount).toBe(2);
    });

    it('should check usage limits correctly', async () => {
      // Free tier message limit is 3
      const canSend1 = await db.checkUsageLimit(testUserId, 'message');
      expect(canSend1).toBe(true); // Should be true (current: 2, limit: 3)

      // Add one more to reach limit
      await db.updateUsageTracking(testUserId, 'message');
      
      const canSend2 = await db.checkUsageLimit(testUserId, 'message');
      expect(canSend2).toBe(false); // Should be false (current: 3, limit: 3)
    });
  });

  describe('Transaction Support', () => {
    it('should support database transactions', async () => {
      const testEmail = 'transaction@test.com';
      
      try {
        await db.transaction(async (client) => {
          // Insert user within transaction
          const result = await client.query(`
            INSERT INTO users (name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id
          `, ['Transaction Test', testEmail, 'hashedpassword']);
          
          const userId = result.rows[0].id;
          
          // Verify user exists within transaction
          const user = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
          expect(user.rows).toHaveLength(1);
          
          // Clean up within transaction
          await client.query('DELETE FROM users WHERE id = $1', [userId]);
        });
      } catch (error) {
        throw error;
      }

      // Verify user doesn't exist after transaction
      const user = await db.getUserByEmail(testEmail);
      expect(user).toBeNull();
    });

    it('should rollback transaction on error', async () => {
      const testEmail = 'rollback@test.com';
      
      try {
        await db.transaction(async (client) => {
          await client.query(`
            INSERT INTO users (name, email, password_hash)
            VALUES ($1, $2, $3)
          `, ['Rollback Test', testEmail, 'hashedpassword']);
          
          // Force an error
          throw new Error('Forced rollback');
        });
      } catch (error) {
        expect(error.message).toBe('Forced rollback');
      }

      // Verify user doesn't exist (transaction was rolled back)
      const user = await db.getUserByEmail(testEmail);
      expect(user).toBeNull();
    });
  });
});