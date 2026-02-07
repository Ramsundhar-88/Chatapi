const request = require('supertest');
const { app } = require('../server');

describe('Authentication API', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'password123' });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('alice');
      // Should not expose password
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'wrongpassword' });
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'password123' });
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should require password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should login with email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@chat.com', password: 'password123' });
      
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user', async () => {
      const uniqueUser = `testuser_${Date.now()}`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ 
          username: uniqueUser, 
          email: `${uniqueUser}@test.com`, 
          password: 'newpassword123' 
        });
      
      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe(uniqueUser);
      // Note: registration doesn't auto-login, so no token returned
    });

    it('should reject duplicate username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ 
          username: 'alice', 
          email: 'newemail@test.com', 
          password: 'password123' 
        });
      
      expect(res.status).toBe(409);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'onlyusername' });
      
      expect(res.status).toBe(400);
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ 
          username: 'testuser99', 
          email: 'invalid-email', 
          password: 'password123' 
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid email format');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return profile with valid token', async () => {
      // Login first to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'password123' });
      
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token;
      expect(token).toBeDefined();

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('alice');
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout with valid token', async () => {
      // Login first
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'bob', password: 'bobsecret' });
      
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token;
      expect(token).toBeDefined();

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logout successful');
    });

    it('should reject logout without token', async () => {
      const res = await request(app)
        .post('/api/auth/logout');
      
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/auth/status', () => {
    it('should update user status', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'password123' });
      
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token;

      const res = await request(app)
        .put('/api/auth/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'away' });
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('away');
    });

    it('should reject invalid status', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'password123' });
      
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token;

      const res = await request(app)
        .put('/api/auth/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid-status' });
      
      expect(res.status).toBe(400);
    });
  });
});
