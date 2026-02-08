
# 🧪 Testing Strategy & Validation

This document describes how the Chat/Messaging API was tested to ensure
**functional correctness**, **security enforcement**, and **data protection**.

All testing was performed **manually** using `curl` and Postman.
Automated tests were intentionally omitted, as the assessment focuses on
security reasoning, backend design, and API behavior.

---

## 1. Authentication Testing

### Scenarios Validated
- Successful login with valid credentials
- Login failure with invalid username or email
- Login failure with incorrect password
- Rate limiting on repeated login attempts
- Logout invalidates active session
- Blacklisted JWTs rejected after logout
- Access denied when token is missing or expired

### Sample Tests

```bash
# Successful login
curl -X POST http://localhost:8888/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}'

# Invalid password
curl -X POST http://localhost:8888/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"wrong"}'

Expected

200 OK for valid credentials

401 Unauthorized for invalid credentials



---
```

2. Session & Logout Testing

Scenarios Validated

Session is created on login

Session is deleted on logout

JWT JTI is blacklisted on logout

Logged-out tokens cannot access protected endpoints


Sample Test
```
curl -X POST http://localhost:8888/api/auth/logout \
  -H "Authorization: Bearer <token>"

Expected

200 Logout successful

Token reuse denied after logout



---
```
3. Profile & User Data Protection

Scenarios Validated

Authenticated users can access only their own profile

Cross-user profile access is blocked

Emails, passwords, and internal IDs are never exposed

Session metadata is not returned to clients

```
Sample Test

curl http://localhost:8888/api/auth/profile \
  -H "Authorization: Bearer <token>"

Expected

Sanitized user profile only

No sensitive fields present



---
```

4. Authorization & Room Access Testing

Scenarios Validated

Public rooms accessible to authenticated users

Private rooms blocked for non-members

Room membership enforced for reading and sending messages


Sample Test
```
# Attempt access to private room as non-member
curl http://localhost:8888/api/messages/private \
  -H "Authorization: Bearer <non-member-token>"

Expected

403 Access denied



---
```

5. Messaging System Testing

Scenarios Validated

Message sending allowed only for room members

Empty or invalid message content rejected

Message editing allowed only for message owner

Message deletion allowed for:

Message owner

Room owner

Admin or moderator


Rate limiting applied to message creation


Sample Tests
```
# Send message
curl -X POST http://localhost:8888/api/messages/general \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello everyone"}'

# Edit message (non-owner)
curl -X PUT http://localhost:8888/api/messages/general/<messageId> \
  -H "Authorization: Bearer <other-user-token>" \
  -d '{"content":"Unauthorized edit"}'

Expected

201 Created for valid sends

403 Forbidden for unauthorized edits

```

---

6. Data Exposure & Sanitization Testing

Verified That

Plaintext passwords are never returned

Emails are not exposed in API responses

Internal user IDs are hidden

Message edit history is visible only to owners

Admin endpoints return sanitized user data only



---

7. Whisper Endpoint Testing (Puzzle Feature)

Scenarios Validated

Access denied without authentication or keys

Authenticated users receive encrypted whisper messages

Admin/system access reveals decryption tools

Caesar cipher and ROT13 decoding works correctly

Whisper sending blocked for basic access


Sample Tests
```
# Authenticated access
curl http://localhost:8888/api/whisper \
  -H "Authorization: Bearer <token>"

# Admin access
curl http://localhost:8888/api/whisper \
  -H "X-Decrypt-Key: <decryption-key>"

```
---

8. Decode Utility Testing

Scenarios Validated

Caesar cipher decoding with correct shift

ROT13 decoding

Invalid decode methods rejected

```
Sample Test

curl -X POST http://localhost:8888/api/whisper/decode \
  -H "Content-Type: application/json" \
  -d '{"text":"Pbatenghyngvbaf","method":"rot13"}'

Expected

{
  "decoded": "Congratulations"
}

```
---

9. Error Handling & Negative Testing

Verified That

Invalid inputs return proper 4xx errors

Unauthorized requests return 401 or 403

Internal server errors do not expose stack traces

Error messages do not leak sensitive details



---

✅ Conclusion

Manual testing confirms that the system enforces:

Secure authentication

Strict authorization

Proper session invalidation

Minimal data exposure

Predictable and safe API behavior


This approach ensures confidence in both functional correctness and security posture of the application.

---
