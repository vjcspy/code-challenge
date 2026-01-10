# Scoreboard Module Specification

## Overview

This document specifies the backend module for a real-time scoreboard system that displays the top 10 users by score. The system supports live updates when user scores change and implements security measures to prevent unauthorized score manipulation.

### Objectives

| Objective | Description |
|-----------|-------------|
| **Real-time Leaderboard** | Display top 10 users with live score updates |
| **Score Updates** | Process score increases when users complete actions |
| **Live Synchronization** | Push updates to all connected clients instantly |
| **Security** | Prevent malicious score manipulation |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                       │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐     │
│  │   Web Browser #1    │  │   Web Browser #2    │  │   Web Browser #N    │     │
│  │  (Scoreboard View)  │  │  (Scoreboard View)  │  │  (Scoreboard View)  │     │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘     │
│             │ WebSocket              │ WebSocket              │ WebSocket      │
│             │ Connection             │ Connection             │ Connection     │
└─────────────┼────────────────────────┼────────────────────────┼─────────────────┘
              │                        │                        │
              └────────────────────────┼────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER                                      │
│                    (WebSocket-aware / Sticky Sessions)                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   API Server #1     │  │   API Server #2     │  │   API Server #N     │
│  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │
│  │  REST API     │  │  │  │  REST API     │  │  │  │  REST API     │  │
│  │  - POST /score│  │  │  │  - POST /score│  │  │  │  - POST /score│  │
│  │  - GET /top10 │  │  │  │  - GET /top10 │  │  │  │  - GET /top10 │  │
│  └───────────────┘  │  │  └───────────────┘  │  │  └───────────────┘  │
│  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │
│  │  WebSocket    │  │  │  │  WebSocket    │  │  │  │  WebSocket    │  │
│  │  Handler      │  │  │  │  Handler      │  │  │  │  Handler      │  │
│  └───────────────┘  │  │  └───────────────┘  │  │  └───────────────┘  │
└──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘
           │                        │                        │
           └────────────────────────┼────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MESSAGE BROKER                                     │
│                           (Redis Pub/Sub)                                       │
│                                                                                 │
│   Channel: "scoreboard:updates"                                                 │
│   Purpose: Broadcast score changes to all API server instances                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   Redis Cache       │  │   PostgreSQL        │  │   Action Validator  │
│  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │
│  │ Sorted Set    │  │  │  │ users         │  │  │  │ Verify action │  │
│  │ "leaderboard" │  │  │  │ scores        │  │  │  │ authenticity  │  │
│  │               │  │  │  │ action_logs   │  │  │  │ (signature)   │  │
│  │ Score → User  │  │  │  └───────────────┘  │  │  └───────────────┘  │
│  └───────────────┘  │  │                     │  │                     │
│                     │  │  Source of Truth    │  │  Anti-cheat Layer   │
│  Fast Leaderboard   │  │                     │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **API Server** | Handle REST API requests, manage WebSocket connections |
| **Redis Cache** | Store leaderboard as sorted set for O(log N) updates |
| **Redis Pub/Sub** | Broadcast score updates across server instances |
| **PostgreSQL** | Persistent storage for users, scores, and action logs |
| **Action Validator** | Verify action authenticity before updating scores |

---

## API Specification

### REST Endpoints

#### 1. Update Score

```
POST /api/v1/scores/action
```

**Description**: Called when a user completes an action that awards points.

**Headers**:
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token (JWT) |
| `X-Action-Signature` | Yes | HMAC signature of the action payload |
| `X-Request-ID` | No | Client-provided request ID for tracing |

**Request Body**:
```json
{
  "actionId": "string",           // Unique identifier for this action
  "actionType": "string",         // Type of action (e.g., "quiz_complete", "task_finish")
  "timestamp": "ISO8601 string",  // When the action was completed
  "metadata": {                   // Action-specific data (optional)
    "difficulty": "hard",
    "timeSpent": 120
  }
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "previousScore": 1500,
    "pointsAwarded": 100,
    "newScore": 1600,
    "newRank": 5,
    "timestamp": "2026-01-10T10:30:00.000Z"
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_ACTION` | Action payload validation failed |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `INVALID_SIGNATURE` | Action signature verification failed |
| 409 | `DUPLICATE_ACTION` | Action ID already processed (idempotency) |
| 429 | `RATE_LIMITED` | Too many requests from this user |

---

#### 2. Get Leaderboard

```
GET /api/v1/scores/leaderboard
```

**Description**: Retrieve the current top 10 scoreboard.

**Headers**:
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | No | Optional - include for personalized response |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 10 | Number of entries (max 100) |

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "user-456",
        "username": "TopPlayer",
        "score": 9500,
        "avatarUrl": "https://..."
      },
      {
        "rank": 2,
        "userId": "user-789",
        "username": "ProGamer",
        "score": 9200,
        "avatarUrl": "https://..."
      }
      // ... up to limit entries
    ],
    "currentUser": {           // Only if authenticated
      "rank": 42,
      "score": 3200
    },
    "lastUpdated": "2026-01-10T10:30:00.000Z"
  }
}
```

---

### WebSocket API

#### Connection

```
WS /api/v1/scores/live
```

**Authentication**: Pass JWT token as query parameter or in first message.

```
wss://api.example.com/api/v1/scores/live?token=<jwt>
```

#### Server → Client Messages

**Leaderboard Update Event**:
```json
{
  "event": "leaderboard:update",
  "data": {
    "leaderboard": [
      { "rank": 1, "userId": "user-456", "username": "TopPlayer", "score": 9500 },
      { "rank": 2, "userId": "user-789", "username": "ProGamer", "score": 9200 }
      // ... top 10
    ],
    "changedPositions": [
      { "userId": "user-123", "previousRank": 6, "newRank": 5, "score": 1600 }
    ],
    "timestamp": "2026-01-10T10:30:00.000Z"
  }
}
```

**User Score Update Event** (sent only to the user who scored):
```json
{
  "event": "score:personal",
  "data": {
    "previousScore": 1500,
    "newScore": 1600,
    "pointsAwarded": 100,
    "rank": 5,
    "timestamp": "2026-01-10T10:30:00.000Z"
  }
}
```

#### Client → Server Messages

**Subscribe to Updates**:
```json
{
  "action": "subscribe",
  "channel": "leaderboard"
}
```

**Heartbeat/Ping**:
```json
{
  "action": "ping"
}
```

---

## Execution Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SCORE UPDATE EXECUTION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────────┘

    USER                     FRONTEND                    API SERVER
     │                          │                            │
     │  1. Complete Action      │                            │
     ├─────────────────────────►│                            │
     │                          │                            │
     │                          │  2. Generate Action        │
     │                          │     Signature (HMAC)       │
     │                          │     with client secret     │
     │                          │                            │
     │                          │  3. POST /api/v1/scores/action
     │                          │     + JWT Token            │
     │                          │     + X-Action-Signature   │
     │                          ├───────────────────────────►│
     │                          │                            │
     │                          │                    ┌───────┴───────┐
     │                          │                    │ 4. VALIDATION │
     │                          │                    ├───────────────┤
     │                          │                    │ a. Verify JWT │
     │                          │                    │ b. Verify     │
     │                          │                    │    Signature  │
     │                          │                    │ c. Check      │
     │                          │                    │    Idempotency│
     │                          │                    │ d. Rate Limit │
     │                          │                    │ e. Validate   │
     │                          │                    │    Action     │
     │                          │                    └───────┬───────┘
     │                          │                            │
     │                          │                            ▼
     │                          │                    ┌───────────────┐
     │                          │                    │ 5. UPDATE     │
     │                          │                    │    SCORE      │
     │                          │                    ├───────────────┤
     │                          │                    │ - PostgreSQL  │
     │                          │                    │   (persist)   │
     │                          │                    │ - Redis ZADD  │
     │                          │                    │   (cache)     │
     │                          │                    └───────┬───────┘
     │                          │                            │
     │                          │  6. Response (200)         │
     │                          │◄───────────────────────────┤
     │                          │                            │
     │  7. Update UI            │                            │
     │◄─────────────────────────┤                            │
     │     (optimistic)         │                            │
     │                          │                            │
     │                          │                            ▼
     │                          │                    ┌───────────────┐
     │                          │                    │ 8. BROADCAST  │
     │                          │                    ├───────────────┤
     │                          │                    │ Redis Pub/Sub │
     │                          │                    │ → All Servers │
     │                          │                    └───────┬───────┘
     │                          │                            │
     │                          │                            ▼
     │                          │                    ┌───────────────────────┐
     │                          │                    │ 9. WEBSOCKET PUSH     │
     │                          │                    │    to ALL subscribers │
     │                          │                    └───────────────────────┘
     │                          │                            │
     │                          │  10. WebSocket Event       │
     │                          │      "leaderboard:update"  │
     │                          │◄───────────────────────────┤
     │                          │                            │
     │  11. Live Update         │                            │
     │◄─────────────────────────┤                            │
     │      (scoreboard)        │                            │
     │                          │                            │


┌─────────────────────────────────────────────────────────────────────────────────┐
│                              VALIDATION DETAIL                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  Incoming       │
                              │  Request        │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  1. JWT         │
                         ┌────┤  Verification   ├────┐
                         │    └─────────────────┘    │
                      VALID                       INVALID
                         │                           │
                         ▼                           ▼
                ┌─────────────────┐         ┌───────────────┐
                │  2. Action      │         │ 401           │
                │  Signature      │         │ UNAUTHORIZED  │
                │  Verification   │         └───────────────┘
                └────────┬────────┘
                         │
            ┌────────────┼────────────┐
         VALID           │         INVALID
            │            │            │
            ▼            │            ▼
   ┌─────────────────┐   │   ┌───────────────┐
   │  3. Idempotency │   │   │ 403           │
   │  Check          │   │   │ INVALID_SIG   │
   │  (actionId)     │   │   └───────────────┘
   └────────┬────────┘   │
            │            │
      ┌─────┴─────┐      │
   NEW        DUPLICATE  │
      │           │      │
      ▼           ▼      │
┌──────────┐ ┌─────────┐ │
│ 4. Rate  │ │ 409     │ │
│ Limit    │ │ CONFLICT│ │
│ Check    │ └─────────┘ │
└────┬─────┘             │
     │                   │
  ┌──┴──┐                │
PASS   FAIL              │
  │      │               │
  ▼      ▼               │
┌────┐ ┌─────┐           │
│ 5. │ │ 429 │           │
│ OK │ │ ERR │           │
└────┘ └─────┘           │
```

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA MODEL                                         │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
  │      users      │         │     scores      │         │  action_logs    │
  ├─────────────────┤         ├─────────────────┤         ├─────────────────┤
  │ id          PK  │◄───┐    │ id          PK  │    ┌───►│ id          PK  │
  │ username        │    │    │ user_id     FK  │────┤    │ user_id     FK  │
  │ email           │    └────│                 │    │    │ action_id   UQ  │
  │ avatar_url      │         │ total_score     │    │    │ action_type     │
  │ created_at      │         │ updated_at      │    │    │ points_awarded  │
  │ updated_at      │         └─────────────────┘    │    │ signature       │
  └─────────────────┘                                │    │ metadata   JSON │
                                                     │    │ processed_at    │
                                                     │    │ created_at      │
                                                     └────│                 │
                                                          └─────────────────┘

  Notes:
  ─────────────────────────────────────────────────────────────────────────────
  • scores.total_score: Current cumulative score (denormalized for fast reads)
  • action_logs.action_id: Unique identifier from client (idempotency key)
  • action_logs.signature: Stored for audit trail
  • action_logs.metadata: Flexible JSON for action-specific data
```

### Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    avatar_url      VARCHAR(500),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scores table (one-to-one with users)
CREATE TABLE scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_score     BIGINT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for leaderboard queries
CREATE INDEX idx_scores_total_score_desc ON scores(total_score DESC);

-- Action logs for idempotency and audit
CREATE TABLE action_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_id       VARCHAR(100) NOT NULL UNIQUE,  -- Client-provided, for idempotency
    action_type     VARCHAR(50) NOT NULL,
    points_awarded  INTEGER NOT NULL,
    signature       VARCHAR(500) NOT NULL,          -- For audit trail
    metadata        JSONB,
    processed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying user's action history
CREATE INDEX idx_action_logs_user_id ON action_logs(user_id);
CREATE INDEX idx_action_logs_action_id ON action_logs(action_id);
```

### Redis Data Structures

```
# Sorted Set for Leaderboard (O(log N) updates, O(log N + M) range queries)
ZADD leaderboard <score> <user_id>

# Get top 10:
ZREVRANGE leaderboard 0 9 WITHSCORES

# Get user rank:
ZREVRANK leaderboard <user_id>

# Update score atomically:
ZINCRBY leaderboard <points> <user_id>
```

---

## Security Design

### 1. Authentication Layer

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

  CLIENT                                                          SERVER
    │                                                               │
    │  Login with credentials                                       │
    ├──────────────────────────────────────────────────────────────►│
    │                                                               │
    │                                            ┌──────────────────┤
    │                                            │ Verify           │
    │                                            │ credentials      │
    │                                            │                  │
    │                                            │ Generate JWT:    │
    │                                            │ {                │
    │                                            │   sub: user_id,  │
    │                                            │   exp: timestamp,│
    │                                            │   iat: timestamp │
    │                                            │ }                │
    │                                            └──────────────────┤
    │                                                               │
    │  JWT Token + Action Secret (per-user or global)               │
    │◄──────────────────────────────────────────────────────────────┤
    │                                                               │
    │  Store securely                                               │
    │  (httpOnly cookie / secure storage)                           │
    │                                                               │
```

### 2. Action Signature Verification

**Purpose**: Ensure the action request originated from legitimate client code, not from a malicious script or modified client.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     ACTION SIGNATURE GENERATION & VERIFICATION                  │
└─────────────────────────────────────────────────────────────────────────────────┘

  CLIENT (FRONTEND)                                           SERVER
    │                                                           │
    │  User completes action                                    │
    │                                                           │
    │  Build payload:                                           │
    │  {                                                        │
    │    actionId: "unique-uuid",                               │
    │    actionType: "quiz_complete",                           │
    │    timestamp: "2026-01-10T10:30:00Z",                     │
    │    userId: "user-123"                                     │
    │  }                                                        │
    │                                                           │
    │  Generate signature:                                      │
    │  HMAC-SHA256(                                             │
    │    key = ACTION_SECRET,                                   │
    │    data = JSON.stringify(payload)                         │
    │  )                                                        │
    │                                                           │
    │  POST /api/v1/scores/action                               │
    │  Headers:                                                 │
    │    Authorization: Bearer <jwt>                            │
    │    X-Action-Signature: <hmac_signature>                   │
    │  Body: payload                                            │
    ├──────────────────────────────────────────────────────────►│
    │                                                           │
    │                                        ┌──────────────────┤
    │                                        │ Recalculate      │
    │                                        │ signature with   │
    │                                        │ same secret      │
    │                                        │                  │
    │                                        │ Compare:         │
    │                                        │ received ==      │
    │                                        │ calculated       │
    │                                        │                  │
    │                                        │ If match: VALID  │
    │                                        │ If not: REJECT   │
    │                                        └──────────────────┤
    │                                                           │
```

### 3. Anti-Cheat Mechanisms

| Mechanism | Purpose | Implementation |
|-----------|---------|----------------|
| **Idempotency Key** | Prevent replay attacks | `action_id` must be unique per user |
| **Timestamp Validation** | Prevent delayed submissions | Reject if `timestamp` > 5 minutes old |
| **Rate Limiting** | Prevent score flooding | Max 10 score updates per minute per user |
| **Action Signature** | Prevent forged requests | HMAC signature verification |
| **Server-Side Validation** | Validate action legitimacy | Cross-check with game state if applicable |
| **Anomaly Detection** | Flag suspicious patterns | Monitor for impossible score jumps |

### 4. Rate Limiting Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           RATE LIMITING LAYERS                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

  Layer 1: API Gateway (Global)
  ─────────────────────────────
  • 1000 requests/minute per IP
  • Protects against DDoS

  Layer 2: Application (Per-User)
  ───────────────────────────────
  • 10 score update requests/minute per user
  • Uses sliding window algorithm
  • Stored in Redis: rate_limit:user:<user_id>

  Layer 3: Action-Specific
  ────────────────────────
  • Cooldown periods per action type
  • e.g., "quiz_complete" max once per 30 seconds
```

---

## Scalability Considerations

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        MULTI-INSTANCE ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────┐
                         │   Load Balancer     │
                         │  (WebSocket-aware)  │
                         └──────────┬──────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │ API Server  │          │ API Server  │          │ API Server  │
   │ Instance 1  │          │ Instance 2  │          │ Instance N  │
   │             │          │             │          │             │
   │ WS Clients: │          │ WS Clients: │          │ WS Clients: │
   │ [A, B, C]   │          │ [D, E, F]   │          │ [G, H, I]   │
   └──────┬──────┘          └──────┬──────┘          └──────┬──────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │       Redis Pub/Sub      │
                    │  Channel: "scoreboard"   │
                    │                          │
                    │  When Server 1 updates   │
                    │  a score, it publishes   │
                    │  to this channel.        │
                    │                          │
                    │  All servers subscribe   │
                    │  and push to their       │
                    │  local WS clients.       │
                    └──────────────────────────┘
```

### Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|------|---------------|-----|--------------|
| Leaderboard (top 10) | Redis Sorted Set | Real-time | On score update |
| User profile data | Redis Hash | 5 minutes | On profile update |
| Rate limit counters | Redis | Sliding window | Auto-expire |

### Database Optimization

1. **Read Replicas**: Use PostgreSQL read replicas for leaderboard queries
2. **Connection Pooling**: Use PgBouncer for efficient connection management
3. **Indexes**: Composite indexes on frequently queried columns
4. **Partitioning**: Consider partitioning `action_logs` by date for archival

---

## Improvement Recommendations

### Critical Security Improvements

| Priority | Recommendation | Rationale |
|----------|---------------|-----------|
| **P0** | **Server-Side Action Validation** | Don't trust client-reported actions. If possible, validate against server-side game state. |
| **P0** | **Token Rotation** | Implement short-lived access tokens (15 min) with refresh tokens to minimize token theft impact. |
| **P1** | **Action Secret Rotation** | Rotate HMAC secrets periodically. Use key versioning to support graceful rotation. |
| **P1** | **Audit Logging** | Log all score-changing operations with full context for forensic analysis. |

### Performance Improvements

| Priority | Recommendation | Expected Impact |
|----------|---------------|-----------------|
| **P1** | **Batch WebSocket Updates** | Instead of pushing every score change, batch updates every 100ms. Reduces message volume by ~90%. |
| **P2** | **Delta Updates** | Send only changed leaderboard positions instead of full top 10. Reduces payload size. |
| **P2** | **Client-Side Caching** | Cache leaderboard on client with ETag/Last-Modified headers for REST fallback. |

### Reliability Improvements

| Priority | Recommendation | Rationale |
|----------|---------------|-----------|
| **P1** | **Circuit Breaker** | Implement circuit breaker for Redis/PostgreSQL to gracefully degrade. |
| **P1** | **Fallback to REST** | If WebSocket disconnects, fall back to polling REST endpoint. |
| **P2** | **Message Queue** | Use durable message queue (e.g., Kafka) instead of Redis Pub/Sub for guaranteed delivery. |

### Observability Improvements

| Priority | Recommendation | Implementation |
|----------|---------------|----------------|
| **P1** | **Correlation ID** | Trace requests from client → API → database with unique IDs. |
| **P1** | **Metrics Dashboard** | Track: score updates/sec, WebSocket connections, leaderboard query latency. |
| **P2** | **Anomaly Alerts** | Alert on: score jumps > 1000 points, users with > 100 actions/hour. |

### Alternative Real-Time Technologies

| Technology | Pros | Cons | Use When |
|------------|------|------|----------|
| **WebSocket** | Full duplex, low latency | Complex connection management | Need bidirectional communication |
| **Server-Sent Events (SSE)** | Simple, HTTP-based, auto-reconnect | Unidirectional only | Read-only updates (scoreboard) |
| **Long Polling** | Works everywhere, simple fallback | Higher latency, more requests | Legacy browser support needed |

**Recommendation**: Use **WebSocket** as primary with **SSE** or **long polling** as fallback for broader compatibility.

### Future Enhancements

1. **Historical Leaderboards**: Store daily/weekly/monthly leaderboard snapshots
2. **Friend Leaderboards**: Show user's rank among friends
3. **Achievement System**: Award badges for milestones
4. **Anti-Cheat ML Model**: Train model to detect suspicious scoring patterns
5. **Regional Leaderboards**: Partition by geography for localized competition

---

## Summary

This specification defines a secure, scalable real-time scoreboard system with:

- **REST API** for score updates with signature verification
- **WebSocket** for live leaderboard updates
- **Redis** for fast leaderboard queries and pub/sub broadcasting
- **PostgreSQL** for persistent storage and audit trails
- **Multi-layer security** including JWT auth, action signatures, rate limiting, and idempotency

The backend engineering team should prioritize the security mechanisms (P0 items) during implementation and consider the performance optimizations (P1/P2) based on actual load testing results.
