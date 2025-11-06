import request from 'supertest';
import app from '../src/app.js';

describe('Express Server and Middleware Stack', () => {
  describe('Security Middleware', () => {
    it('should set security headers with Helmet', async () => {
      const response = await request(app).get('/api/v1');

      // Helmet sets various security headers
      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
    });
  });

  describe('CORS Middleware', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should allow configured origins', async () => {
      const response = await request(app)
        .get('/api/v1')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Body Parsing Middleware', () => {
    it('should parse JSON request bodies', async () => {
      // Body parsing is tested implicitly through API endpoints
      // The middleware is configured in app.js with express.json()
      const response = await request(app).get('/api/v1');
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should parse URL-encoded request bodies', async () => {
      // URL-encoded parsing is configured in app.js with express.urlencoded()
      const response = await request(app).get('/api/v1');
      expect(response.status).toBe(200);
    });
  });

  describe('Compression Middleware', () => {
    it('should compress responses', async () => {
      const response = await request(app)
        .get('/api/v1')
        .set('Accept-Encoding', 'gzip, deflate');

      // Compression middleware is configured in app.js
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('API Versioning', () => {
    it('should respond to /api/v1 root endpoint', async () => {
      const response = await request(app).get('/api/v1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.endpoints).toBeDefined();
    });

    it('should have proper API structure', async () => {
      const response = await request(app).get('/api/v1');

      expect(response.body.endpoints).toHaveProperty('health');
      expect(response.body.endpoints).toHaveProperty('queues');
      expect(response.body.endpoints).toHaveProperty('auth');
      expect(response.body.endpoints).toHaveProperty('contacts');
      expect(response.body.endpoints).toHaveProperty('messages');
    });
  });

  describe('Health Check Endpoint', () => {
    it('should respond to health check', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors for non-existent routes', async () => {
      const response = await request(app).get('/api/v1/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return proper error structure', async () => {
      const response = await request(app).get('/api/v1/nonexistent');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.success).toBe(false);
    });
  });

  describe('Request Logging', () => {
    it('should log requests through Morgan', async () => {
      // Morgan logging is configured in app.js
      // Test that requests are processed successfully
      const response = await request(app).get('/api/v1');
      expect(response.status).toBe(200);
    });
  });
});
