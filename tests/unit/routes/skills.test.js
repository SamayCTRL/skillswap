const request = require('supertest');
const express = require('express');
const skillRoutes = require('../../../server/routes/skills');
const db = require('../../../server/config/database');

// Mock dependencies
jest.mock('../../../server/config/database');

describe('Skills Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/skills', skillRoutes);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/skills', () => {
    it('should return paginated skills list', async () => {
      const mockSkills = [
        testHelper.createMockSkill(),
        { ...testHelper.createMockSkill(), id: 'skill-2', title: 'Another Skill' }
      ];

      db.query.mockResolvedValue({
        rows: mockSkills,
        rowCount: 2
      });

      const response = await request(app)
        .get('/api/skills')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.skills).toEqual(mockSkills);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter skills by category', async () => {
      const mockSkills = [testHelper.createMockSkill()];
      
      db.query.mockResolvedValue({
        rows: mockSkills,
        rowCount: 1
      });

      const response = await request(app)
        .get('/api/skills')
        .query({ category: 'technology', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['technology'])
      );
    });

    it('should search skills by query term', async () => {
      const mockSkills = [testHelper.createMockSkill()];
      
      db.query.mockResolvedValue({
        rows: mockSkills,
        rowCount: 1
      });

      const response = await request(app)
        .get('/api/skills')
        .query({ search: 'javascript', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%javascript%'])
      );
    });
  });

  describe('GET /api/skills/:id', () => {
    it('should return skill details', async () => {
      const mockSkill = testHelper.createMockSkill();
      
      db.query.mockResolvedValue({
        rows: [mockSkill],
        rowCount: 1
      });

      const response = await request(app)
        .get('/api/skills/test-skill-id');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSkill);
    });

    it('should return 404 for non-existent skill', async () => {
      db.query.mockResolvedValue({
        rows: [],
        rowCount: 0
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
      expect(response.body).toEqual(mockCategories);
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