
# 💬 Assessment 3 – Secure Chat & Messaging API

```text
This repository contains my solution for Assessment 3: Chat/Messaging API,
focused on secure authentication, strict authorization, and clean backend design.

The original project intentionally included multiple security vulnerabilities.
My work involved hardening the system, removing insecure patterns, and
documenting security decisions while preserving expected functionality.
````

---

## 🎯 Objectives Addressed

```text
• Secure authentication and session management
• Proper authorization for rooms and messages
• Prevention of sensitive data exposure
• Clean separation of concerns
• Puzzle-based whisper endpoint (non-critical feature)
• Real-time–ready backend design
```

---

## 🛠️ Tech Stack

```text
Node.js (v18+)
Express.js
JWT (JSON Web Tokens)
bcrypt
In-memory stores (users, sessions, messages)
curl / Postman for manual testing
```

---

## 📁 Project Structure (High-Level)

```text
.
├── routes/
│   ├── auth.js
│   ├── messages.js
│   └── whisper.js
├── middleware/
│   ├── auth.js
│   ├── validation.js
│   └── rateLimit.js
├── data/
│   ├── users.js
│   ├── sessions.js
│   ├── messages.js
│   └── whispers.js
├── utils/
│   ├── helpers.js
│   └── crypto.js
├── SECURITY_FIXES.md
├── TESTING.md
└── README.md
```

---

## 🚀 Setup & Run Instructions

### Prerequisites

```text
• Node.js v18 or higher
• npm
```

---

### Installation

```bash
git clone https://github.com/Ramsundhar-88/Chatapi.git
cd assessment-3-chat-api
npm install
```

---

## 🔐 Environment Configuration

```env
JWT_SECRET=your-secure-jwt-secret
```

```text
Check .env.example for reference.
⚠️ Do not commit .env files to version control.
```

---

## ▶️ Run the Server

```bash
npm run dev
```

```text
The API will be available at:
http://localhost:8888
```

---

## 🔐 Authentication Overview

```text
• Passwords are hashed using bcrypt
• Short-lived JWT access tokens
• Each token includes a JTI (JWT ID)
• Server-side session tracking
• Token blacklisting on logout
• No hardcoded secrets
• No admin backdoor keys

Refresh tokens were intentionally omitted for simplicity and clarity.
```

---

## 🛡️ Authorization Overview

```text
• Authentication enforced on all protected routes
• Room membership required for reading and sending messages
• Message editing restricted to message owners
• Message deletion allowed for:
  - Message owner
  - Room owner
  - Admin / Moderator
• All responses sanitized to prevent data leakage
```

---

## 🤫 Whisper Endpoint (Puzzle Feature)

```text
The whisper endpoint is a non-critical puzzle feature designed to test:
• Attention to detail
• Basic cryptographic reasoning
```

```text
Features:
• Multiple access levels (authenticated, admin, system)
• Secrets loaded from configuration
• Caesar cipher and ROT13 decoding utilities
• Fully isolated from core authentication logic
```

---

## 🧪 Testing

```text
All endpoints were manually tested using curl and Postman.

Testing covered:
• Authentication success and failure cases
• Authorization violations
• Token invalidation on logout
• Rate limiting
• Data exposure prevention
• Whisper puzzle access and decoding
```

```text
See TESTING.md for detailed test scenarios.
```

---

## 🔐 Security Fixes & Design Decisions

```text
Key vulnerabilities addressed:
• Plaintext password storage
• Hardcoded secrets
• Authorization bypasses
• Sensitive data exposure
• Admin backdoors
```

```text
Full breakdown available in SECURITY_FIXES.md
```

---

## 🎥 Video Walkthrough

```text
A short video walkthrough accompanies this submission, explaining:
• Authentication design
• Authorization logic
• Security decisions
• Testing approach

(Video)[https://drive.google.com/file/d/1QjydCubWiY_DEyCWNzoCas4lAcb6_vnK/view?usp=sharing]
```

---

## 🧠 Design Philosophy

```text
This solution prioritizes:
• Secure defaults
• Least-privilege access
• Explicit authorization
• Readability and maintainability
• Clear documentation
```

```text
The system is designed to be easily extended with:
• Persistent storage (DB)
• Redis-backed sessions
• Refresh tokens
• WebSocket real-time features
```

```

---

