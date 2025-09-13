const request = require('supertest');
const express = require('express');
const skillRoutes = require('../../../server/routes/skills');
const db = require('../../../server/config/database');

// Mock dependencies
jest.mock('../../../server/config/database');
jest.mock('../../../server/config/config', () => ({
  upload: {
    maxFileSize: 5242880,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif']
  }
}));

// Mock middleware
jest.mock('../../../server/middleware/auth', () => ({
  authMiddleware: (req, res, next) => next(),
  optionalAuthMiddleware: (req, res, next) => next(),
  usageLimitMiddleware: () => (req, res, next) => next(),
  subscriptionMiddleware: () => (req, res, next) => next()
}));

jest.mock('../../../server/middleware/rateLimiter', () => ({
  uploadLimiter: (req, res, next) => next(),
  searchLimiter: (req, res, next) => next()
}));

jest.mock('../../../server/middleware/validation', () => {
  const mockMiddleware = (req, res, next) => {
    if (typeof next === 'function') {
      next();
    }
  };
  
  // Some validators are middleware factories (functions that return middleware)
  const mockMiddlewareFactory = () => mockMiddleware;
  
  return {
    validateSkillCreation: mockMiddleware,
    validateSkillUpdate: mockMiddleware,
    validateSkillSearch: mockMiddleware,
    validateUUIDParam: mockMiddlewareFactory, // This one is called as a function
    validatePagination: mockMiddleware
  };
});

describe('Skills Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock req.user for optional auth middleware
    app.use((req, res, next) => {
      req.user = null; // Default to no user
      next();
    });
    
    app.use('/api/skills', skillRoutes);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/skills', () => {
    it('should return paginated skills list', async () => {
      const mockSkills = [
        {
          id: 'skill-1',
          title: 'Test Skill',
          description: 'A test skill',
          price: 25.00,
          user_id: 'user-1',
          user_name: 'Test User',
          category_name: 'Technology',
          average_rating: 4.5,
          reviews_count: 10,
          bookings_count: 5
        },
        {
          id: 'skill-2', 
          title: 'Another Skill',
          description: 'Another test skill',
          price: 30.00,
          user_id: 'user-2',
          user_name: 'Another User',
          category_name: 'Arts',
          average_rating: 4.0,
          reviews_count: 8,
          bookings_count: 3
        }
      ];

      db.query.mockResolvedValueOnce({ rows: mockSkills }) // Main query
              .mockResolvedValueOnce({ rows: [{ total: '2' }] }); // Count query

      const response = await request(app)
        .get('/api/skills')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.skills).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter skills by category', async () => {
      const mockSkills = [
        {
          id: 'skill-1',
          title: 'Tech Skill',
          category_name: 'Technology'
        }
      ];
      
      db.query.mockResolvedValueOnce({ rows: mockSkills })
              .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const response = await request(app)
        .get('/api/skills')
        .query({ category: '1', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('s.category_id = $1'),
        expect.arrayContaining([10, 0, null, 1])
      );
    });

    it('should search skills by query term', async () => {
      const mockSkills = [
        {
          id: 'skill-1',
          title: 'JavaScript Tutorial',
          description: 'Learn JavaScript'
        }
      ];
      
      db.query.mockResolvedValueOnce({ rows: mockSkills })
              .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const response = await request(app)
        .get('/api/skills')
        .query({ q: 'javascript', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%javascript%', '%javascript%', 10, 0, null])
      );
    });
  });

  describe('GET /api/skills/:id', () => {
    it('should return skill details', async () => {
      const mockSkill = {
        id: 'test-skill-id',
        title: 'Test Skill',
        description: 'A test skill',
        price: 25.00
      };
      
      db.query.mockResolvedValue({
        rows: [mockSkill]
      });

      const response = await request(app)
        .get('/api/skills/test-skill-id');

      expect(response.status).toBe(200);
      expect(response.body.skill).toEqual(mockSkill);
    });

    it('should return 404 for non-existent skill', async () => {
      db.query.mockResolvedValue({
        rows: []
      });

      const response = await request(app)
        .get('/api/skills/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Skill not found');
    });
  });

  describe('GET /api/skills/categories', () => {
    it('should return all skill categories', async () => {
      const mockCategories = [
        { id: 1, name: 'Technology', description: 'Tech skills' },
        { id: 2, name: 'Arts', description: 'Creative skills' }
      ];

      db.query.mockResolvedValue({
        rows: mockCategories
      });

      const response = await request(app)
        .get('/api/skills/categories');

      expect(response.status).toBe(200);
      expect(response.body.categories).toEqual(mockCategories);
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/skills/categories');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch categories');
    });
  });
});