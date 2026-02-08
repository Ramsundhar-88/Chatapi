const request = require('supertest');
const { app } = require('../server');

describe('Whisper API', () => {
  let token;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'password123' });
    token = loginRes.body.token;
  });

  describe('GET /api/whisper', () => {
    it('should access with valid JWT token', async () => {
      const res = await request(app)
        .get('/api/whisper')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.accessLevel).toBe('authenticated');
      expect(res.body.whisperMessages).toBeDefined();
    });

    it('should access with X-Decrypt-Key header', async () => {
      const res = await request(app)
        .get('/api/whisper')
        .set('X-Decrypt-Key', 'shadow-key-alpha-7');
      
      expect(res.status).toBe(200);
      expect(res.body.accessLevel).toBe('admin');
      expect(res.body.whisperMessages).toBeDefined();
    });

    it('should access with code query param', async () => {
      const res = await request(app)
        .get('/api/whisper?code=shadow-key-alpha-7');
      
      expect(res.status).toBe(200);
      expect(res.body.accessLevel).toBe('system');
      expect(res.body.whisperMessages).toBeDefined();
    });

    it('should reject without any auth', async () => {
      const res = await request(app)
        .get('/api/whisper');
      
      expect(res.status).toBe(403);
    });

    it('should reject with wrong key', async () => {
      const res = await request(app)
        .get('/api/whisper')
        .set('X-Decrypt-Key', 'wrong-key');
      
      expect(res.status).toBe(403);
    });
  });
});
