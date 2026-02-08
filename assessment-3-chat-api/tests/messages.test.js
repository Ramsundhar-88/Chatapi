const request = require('supertest');
const { app } = require('../server');

describe('Messages API', () => {
  let aliceToken;
  let bobToken;

  beforeAll(async () => {
    // Login alice (admin)
    const aliceLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'password123' });
    aliceToken = aliceLogin.body.token;

    // Login bob (user)
    const bobLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'bob', password: 'bobsecret' });
    bobToken = bobLogin.body.token;
  });

  describe('GET /api/messages', () => {
    it('should return list of rooms (with or without auth)', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${aliceToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.rooms).toBeDefined();
      expect(Array.isArray(res.body.rooms)).toBe(true);
    });

    it('should require authentication for all message endpoints', async () => {
      const res = await request(app)
        .get('/api/messages');
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/messages/:roomId', () => {
    it('should get messages from room user can access', async () => {
      const res = await request(app)
        .get('/api/messages/general')
        .set('Authorization', `Bearer ${aliceToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.messages).toBeDefined();
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    it('should return 404 for non-existent room', async () => {
      const res = await request(app)
        .get('/api/messages/non-existent-room')
        .set('Authorization', `Bearer ${bobToken}`);
      
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/messages/:roomId', () => {
    it('should send message to room', async () => {
      const res = await request(app)
        .post('/api/messages/general')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Test message from tests' });
      
      expect(res.status).toBe(201);
      expect(res.body.messageData).toBeDefined();
      expect(res.body.messageData.content).toBe('Test message from tests');
    });

    it('should validate message content', async () => {
      const res = await request(app)
        .post('/api/messages/general')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: '' });
      
      expect(res.status).toBe(400);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/messages/general')
        .send({ content: 'Unauthenticated message' });
      
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/messages/:roomId/:messageId', () => {
    let messageId;

    beforeAll(async () => {
      // Create a message to edit
      const msgRes = await request(app)
        .post('/api/messages/general')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Message to edit' });
      messageId = msgRes.body.messageData.id;
    });

    it('should edit own message', async () => {
      const res = await request(app)
        .put(`/api/messages/general/${messageId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Edited message content' });
      
      expect(res.status).toBe(200);
      expect(res.body.messageData.content).toBe('Edited message content');
      expect(res.body.messageData.edited).toBe(true);
    });

    it('should reject editing others message', async () => {
      const res = await request(app)
        .put(`/api/messages/general/${messageId}`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ content: 'Hacked edit' });
      
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/messages/:roomId/:messageId', () => {
    let messageId;

    beforeAll(async () => {
      // Create a message to delete
      const msgRes = await request(app)
        .post('/api/messages/general')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ content: 'Message to delete' });
      messageId = msgRes.body.messageData.id;
    });

    it('should delete own message', async () => {
      const res = await request(app)
        .delete(`/api/messages/general/${messageId}`)
        .set('Authorization', `Bearer ${bobToken}`);
      
      expect(res.status).toBe(200);
    });
  });
});
