const request = require('supertest');
const express = require('express');
const settingsRouter = require('../settings');
const db = require('../../config/database');
const { DEFAULT_PROMPT } = require('../../config/openai-config');

jest.mock('../../config/database');

const app = express();
app.use(express.json());
app.use('/api/settings', settingsRouter);

describe('Settings Routes - OpenAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/settings/openai', () => {
    it('should update OpenAI enabled setting', async () => {
      db.run.mockResolvedValue({});

      const response = await request(app)
        .put('/api/settings/openai')
        .send({ openai_enabled: true })
        .expect(200);

      expect(response.body.message).toBe('OpenAI settings updated successfully');
      expect(response.body.updated).toContain('openai_enabled');
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE settings'),
        ['true', 'openai_enabled']
      );
    });

    it('should update OpenAI API key', async () => {
      db.run.mockResolvedValue({});

      const response = await request(app)
        .put('/api/settings/openai')
        .send({ openai_api_key: 'sk-test123' })
        .expect(200);

      expect(response.body.updated).toContain('openai_api_key');
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE settings'),
        ['sk-test123', 'openai_api_key']
      );
    });

    it('should update OpenAI response limit', async () => {
      db.run.mockResolvedValue({});

      const response = await request(app)
        .put('/api/settings/openai')
        .send({ openai_response_limit: 2000 })
        .expect(200);

      expect(response.body.updated).toContain('openai_response_limit');
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE settings'),
        ['2000', 'openai_response_limit']
      );
    });

    it('should update custom prompt', async () => {
      db.run.mockResolvedValue({});

      const response = await request(app)
        .put('/api/settings/openai')
        .send({ openai_custom_prompt: 'Custom AI prompt' })
        .expect(200);

      expect(response.body.updated).toContain('openai_custom_prompt');
    });

    it('should update multiple settings at once', async () => {
      db.run.mockResolvedValue({});

      const response = await request(app)
        .put('/api/settings/openai')
        .send({
          openai_enabled: true,
          openai_api_key: 'sk-test123',
          openai_response_limit: 1500
        })
        .expect(200);

      expect(response.body.updated).toEqual(
        expect.arrayContaining(['openai_enabled', 'openai_api_key', 'openai_response_limit'])
      );
      expect(db.run).toHaveBeenCalledTimes(3);
    });

    it('should validate response limit range', async () => {
      const response = await request(app)
        .put('/api/settings/openai')
        .send({ openai_response_limit: 50 }) // Below minimum
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle database errors', async () => {
      db.run.mockRejectedValue(new Error('Database error'));

      await request(app)
        .put('/api/settings/openai')
        .send({ openai_enabled: true })
        .expect(500);
    });
  });

  describe('GET /api/settings/openai/default-prompt', () => {
    it('should return the default OpenAI prompt', async () => {
      const response = await request(app)
        .get('/api/settings/openai/default-prompt')
        .expect(200);

      expect(response.body.default_prompt).toBe(DEFAULT_PROMPT);
      expect(response.body.default_prompt).toBeDefined();
    });
  });
});

describe('Settings Routes - Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/settings/notifications', () => {
    it('should update notification enabled setting', async () => {
      db.run.mockResolvedValue({});

      const response = await request(app)
        .put('/api/settings/notifications')
        .send({ resend_enabled: true })
        .expect(200);

      expect(response.body.message).toBe('Notification settings updated successfully');
      expect(response.body.updated).toContain('resend_enabled');
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE settings'),
        ['true', 'resend_enabled']
      );
    });

    it('should update Resend API key', async () => {
      db.run.mockResolvedValue({});

      const response = await request(app)
        .put('/api/settings/notifications')
        .send({ resend_api_key: 're_test123' })
        .expect(200);

      expect(response.body.updated).toContain('resend_api_key');
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE settings'),
        ['re_test123', 'resend_api_key']
      );
    });

    it('should update notification email', async () => {
      db.run.mockResolvedValue({});

      const response = await request(app)
        .put('/api/settings/notifications')
        .send({ notification_email: 'test@example.com' })
        .expect(200);

      expect(response.body.updated).toContain('notification_email');
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE settings'),
        ['test@example.com', 'notification_email']
      );
    });

    it('should update multiple notification settings at once', async () => {
      db.run.mockResolvedValue({});

      const response = await request(app)
        .put('/api/settings/notifications')
        .send({
          resend_enabled: true,
          resend_api_key: 're_test123',
          notification_email: 'alerts@example.com'
        })
        .expect(200);

      expect(response.body.updated).toEqual(
        expect.arrayContaining(['resend_enabled', 'resend_api_key', 'notification_email'])
      );
      expect(db.run).toHaveBeenCalledTimes(3);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .put('/api/settings/notifications')
        .send({ notification_email: 'invalid-email' })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle database errors', async () => {
      db.run.mockRejectedValue(new Error('Database error'));

      await request(app)
        .put('/api/settings/notifications')
        .send({ resend_enabled: true })
        .expect(500);
    });
  });
});
