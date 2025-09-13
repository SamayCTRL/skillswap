const { authMiddleware, adminMiddleware, usageLimitMiddleware } = require('../../../server/middleware/auth');
const jwt = require('jsonwebtoken');
const db = require('../../../server/config/database');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../../server/config/database');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      header: jest.fn(),
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should authenticate user with valid token', async () => {
      const mockUser = testHelper.createMockUser();
      
      req.header.mockReturnValue('Bearer valid-token');
      jwt.verify.mockReturnValue({ userId: mockUser.id });
      db.getUserById.mockResolvedValue(mockUser);
      db.updateUserActivity.mockResolvedValue();

      await authMiddleware(req, res, next);

      expect(req.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        subscriptionTier: mockUser.subscription_tier,
        role: mockUser.role,
        verified: mockUser.verified
      });
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 when no token is provided', async () => {
      req.header.mockReturnValue(null);

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      req.header.mockReturnValue('Bearer invalid-token');
      jwt.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. Invalid token.',
        code: 'INVALID_TOKEN'
      });
    });

    it('should return 401 when user no longer exists', async () => {
      req.header.mockReturnValue('Bearer valid-token');
      jwt.verify.mockReturnValue({ userId: 'non-existent-user' });
      db.getUserById.mockResolvedValue(null);

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. User no longer exists.',
        code: 'USER_NOT_FOUND'
      });
    });
  });

  describe('adminMiddleware', () => {
    it('should allow access for admin users', async () => {
      req.user = { ...testHelper.createMockUser(), role: 'admin' };

      await adminMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for non-admin users', async () => {
      req.user = { ...testHelper.createMockUser(), role: 'user' };

      await adminMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. Admin privileges required.',
        code: 'ADMIN_REQUIRED'
      });
    });

    it('should require authentication', async () => {
      req.user = null;

      await adminMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    });
  });

  describe('usageLimitMiddleware', () => {
    const usageLimitCheck = usageLimitMiddleware('message');

    it('should allow action when under usage limit', async () => {
      req.user = testHelper.createMockUser();
      db.checkUsageLimit.mockResolvedValue(true);

      await usageLimitCheck(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny action when over usage limit', async () => {
      const mockUser = { ...testHelper.createMockUser(), subscriptionTier: 'free' };
      req.user = mockUser;
      db.checkUsageLimit.mockResolvedValue(false);
      db.getUsageCount.mockResolvedValue(5);

      await usageLimitCheck(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Monthly message limit exceeded for free tier.',
        code: 'USAGE_LIMIT_EXCEEDED',
        action: 'message',
        currentUsage: 5,
        tier: 'free',
        upgradeRequired: true
      });
    });

    it('should require authentication', async () => {
      req.user = null;

      await usageLimitCheck(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    });
  });
});