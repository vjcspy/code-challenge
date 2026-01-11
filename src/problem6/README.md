# Scoreboard Module Specification

## Task Requirements

1. We have a website with a score board, which shows the top 10 user's scores.
2. We want live update of the score board.
3. User can do an action (which we do not need to care what the action is), completing this action will increase the user's score.
4. Upon completion the action will dispatch an API call to the application server to update the score.
5. We want to prevent malicious users from increasing scores without authorisation.

---

## Overview

This document specifies the backend module for a real-time scoreboard system that displays the top 10 users by score. The system supports live updates when user scores change and implements security measures to prevent unauthorized score manipulation.

### Objectives

| Objective | Description |
|-----------|-------------|
| **Real-time Leaderboard** | Display top 10 users with live score updates |
| **Score Updates** | Process score increases when users complete actions |
| **Live Synchronization** | Push updates to all connected clients instantly |
| **Security** | Prevent malicious score manipulation |

### 📁 Related Documents

| Document | Description |
|----------|-------------|
| [Implementation Plan](../../plans/260111-problem6-scoreboard-module.md) | Detailed implementation plan with file structure, code examples, and step-by-step tasks |

---

## ⚠️ Critical Architectural Analysis

### The Fundamental Problem with Client-Initiated Score Updates

The requirement specifies that the **client dispatches an API call to update the score** after completing an action. This is an inherently insecure design pattern that experienced architects recognize as problematic.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    WHY CLIENT-INITIATED SCORING IS PROBLEMATIC                  │
└─────────────────────────────────────────────────────────────────────────────────┘

  CURRENT REQUIREMENT (Client-Initiated):
  ───────────────────────────────────────
  
    User completes action → Frontend calls "update score" API → Score increases
                               ▲
                               │
                    ┌──────────┴──────────┐
                    │  TRUST BOUNDARY     │
                    │  VIOLATION          │
                    │                     │
                    │  The server trusts  │
                    │  that the client    │
                    │  legitimately       │
                    │  completed the      │
                    │  action.            │
                    └─────────────────────┘
  
  FUNDAMENTAL ISSUES:
  ───────────────────
  
  1. CLIENT CODE IS UNTRUSTED
     • JavaScript can be modified in browser DevTools
     • Network requests can be forged with Postman/curl
     • Malicious browser extensions can intercept and modify requests
     • Decompiled mobile apps can be modified and repackaged
  
  2. NO PROOF OF WORK
     • Server has no way to verify the action actually happened
     • Server only knows "client claims action was completed"
     • Any signature/token the client generates can be reverse-engineered
  
  3. SEPARATION OF CONCERNS VIOLATION
     • Business logic (score calculation) should not depend on client honesty
     • Critical state changes should be server-authoritative
```

### The Ideal Architecture (Server-Authoritative)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED: SERVER-AUTHORITATIVE SCORING                    │
└─────────────────────────────────────────────────────────────────────────────────┘

  IDEAL FLOW:
  ───────────
  
    User performs action → Server processes action → Server updates score
                               │
                               ▼
                    ┌─────────────────────┐
                    │  SERVER CONTROLS    │
                    │  EVERYTHING:        │
                    │                     │
                    │  • Action state     │
                    │  • Validation       │
                    │  • Score calculation│
                    │  • Score update     │
                    └─────────────────────┘
  
  EXAMPLE: Quiz Application
  ─────────────────────────
  
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │  1. POST /api/quiz/start                                        │
  │     → Server creates quiz session, stores questions server-side │
  │     → Returns session_id + first question                       │
  │                                                                 │
  │  2. POST /api/quiz/answer                                       │
  │     → Server validates answer against stored correct answer     │
  │     → Server updates score internally                           │
  │     → Returns next question                                     │
  │                                                                 │
  │  3. POST /api/quiz/complete                                     │
  │     → Server calculates final score                             │
  │     → Server updates leaderboard                                │
  │     → Client NEVER sends score, only receives it                │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
  
  KEY PRINCIPLE: The client NEVER tells the server what the score is.
                 The server CALCULATES the score based on verified actions.
```

### Why We Proceed with Client-Initiated Design

Despite the architectural concerns, this specification implements a **client-initiated score update** as per the original requirements. We mitigate risks through multiple defense layers, while acknowledging that **no client-side security measure is foolproof**.

This specification serves as a demonstration of:
1. Understanding security trade-offs
2. Implementing defense-in-depth strategies
3. Recognizing architectural limitations

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
│  │ -POST /action │  │  │  │ -POST /action │  │  │  │ -POST /action │  │
│  │ -POST /score  │  │  │  │ -POST /score  │  │  │  │ -POST /score  │  │
│  │ -GET /leaders │  │  │  │ -GET /leaders │  │  │  │ -GET /leaders │  │
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
│   Redis Cache       │  │   PostgreSQL        │  │   Action Token      │
│  ┌───────────────┐  │  │  ┌───────────────┐  │  │   Store (Redis)     │
│  │ Sorted Set    │  │  │  │ users         │  │  │  ┌───────────────┐  │
│  │ "leaderboard" │  │  │  │ scores        │  │  │  │ Pending       │  │
│  │               │  │  │  │ action_logs   │  │  │  │ action tokens │  │
│  │ Score → User  │  │  │  └───────────────┘  │  │  │ (TTL: 60s)    │  │
│  └───────────────┘  │  │                     │  │  └───────────────┘  │
│                     │  │  Source of Truth    │  │                     │
│  Fast Leaderboard   │  │                     │  │  Token Validation   │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **API Server** | Handle REST API requests, manage WebSocket connections |
| **Redis Cache** | Store leaderboard as sorted set for O(log N) updates |
| **Redis Pub/Sub** | Broadcast score updates across server instances |
| **PostgreSQL** | Persistent storage for users, scores, and action logs |
| **Action Token Store** | Store server-generated tokens for score update validation |

---

## API Specification

### REST Endpoints

#### 1. Complete Action (Get Score Token)

```
POST /api/v1/actions/complete
```

**Description**: Called when a user completes an action. Server validates the action and returns a signed token that authorizes a score update.

**Headers**:
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token (JWT) |
| `X-Request-ID` | No | Client-provided request ID for tracing |

**Request Body**:
```json
{
  "actionType": "string",         // Type of action (e.g., "quiz_complete", "task_finish")
  "actionData": {                 // Action-specific data for server validation
    "questionId": "q-123",
    "selectedAnswer": "B",
    "timeSpent": 45
  },
  "clientTimestamp": "ISO8601"    // When the action was completed on client
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "scoreToken": "eyJhbGciOiJIUzI1...",   // Server-signed token for score update
    "pointsEarned": 100,                    // Points this action is worth
    "tokenExpiresAt": "2026-01-10T10:31:00.000Z",  // Token valid for 60 seconds
    "actionId": "act-uuid-123"              // Server-generated action ID
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_ACTION_DATA` | Action data validation failed |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `ACTION_NOT_ALLOWED` | User not eligible for this action |
| 429 | `RATE_LIMITED` | Too many action requests |

---

#### 2. Update Score

```
POST /api/v1/scores/update
```

**Description**: Update user's score using a valid score token obtained from the action completion endpoint.

**Headers**:
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token (JWT) |
| `X-Score-Token` | Yes | Token received from `/actions/complete` |

**Request Body**:
```json
{
  "actionId": "act-uuid-123"      // Must match the actionId from token
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
| 400 | `INVALID_TOKEN` | Token malformed or tampered |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `TOKEN_EXPIRED` | Score token has expired (60s TTL) |
| 403 | `TOKEN_USER_MISMATCH` | Token was issued to different user |
| 409 | `TOKEN_ALREADY_USED` | Score token has already been redeemed |

---

#### 3. Get Leaderboard

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
    ],
    "currentUser": {
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
│                     (Server-Issued Token Mechanism)                             │
└─────────────────────────────────────────────────────────────────────────────────┘

    USER                     FRONTEND                    API SERVER
     │                          │                            │
     │  1. Perform Action       │                            │
     │     (e.g., answer quiz)  │                            │
     ├─────────────────────────►│                            │
     │                          │                            │
     │                          │  2. POST /actions/complete │
     │                          │     + JWT Token            │
     │                          │     + Action Data          │
     │                          ├───────────────────────────►│
     │                          │                            │
     │                          │                    ┌───────┴───────┐
     │                          │                    │ 3. SERVER     │
     │                          │                    │ VALIDATION    │
     │                          │                    ├───────────────┤
     │                          │                    │ a. Verify JWT │
     │                          │                    │ b. Validate   │
     │                          │                    │    action data│
     │                          │                    │ c. Check rate │
     │                          │                    │    limits     │
     │                          │                    │ d. Calculate  │
     │                          │                    │    points     │
     │                          │                    └───────┬───────┘
     │                          │                            │
     │                          │                            ▼
     │                          │                    ┌───────────────┐
     │                          │                    │ 4. GENERATE   │
     │                          │                    │ SCORE TOKEN   │
     │                          │                    ├───────────────┤
     │                          │                    │ JWT signed    │
     │                          │                    │ with server   │
     │                          │                    │ secret:       │
     │                          │                    │ {             │
     │                          │                    │  actionId,    │
     │                          │                    │  userId,      │
     │                          │                    │  points,      │
     │                          │                    │  exp (60s)    │
     │                          │                    │ }             │
     │                          │                    └───────┬───────┘
     │                          │                            │
     │                          │                    ┌───────┴───────┐
     │                          │                    │ 5. STORE      │
     │                          │                    │ TOKEN STATE   │
     │                          │                    ├───────────────┤
     │                          │                    │ Redis:        │
     │                          │                    │ token:{id} =  │
     │                          │                    │ { used:false }│
     │                          │                    │ TTL: 60s      │
     │                          │                    └───────┬───────┘
     │                          │                            │
     │                          │  6. Response:              │
     │                          │     { scoreToken, points } │
     │                          │◄───────────────────────────┤
     │                          │                            │
     │                          │  7. POST /scores/update    │
     │                          │     + JWT Token            │
     │                          │     + X-Score-Token        │
     │                          ├───────────────────────────►│
     │                          │                            │
     │                          │                    ┌───────┴───────┐
     │                          │                    │ 8. VALIDATE   │
     │                          │                    │    TOKEN      │
     │                          │                    ├───────────────┤
     │                          │                    │ a. Verify sig │
     │                          │                    │ b. Check exp  │
     │                          │                    │ c. Check user │
     │                          │                    │ d. Check used │
     │                          │                    └───────┬───────┘
     │                          │                            │
     │                          │                            ▼
     │                          │                    ┌───────────────┐
     │                          │                    │ 9. UPDATE     │
     │                          │                    │    SCORE      │
     │                          │                    ├───────────────┤
     │                          │                    │ - PostgreSQL  │
     │                          │                    │   (persist)   │
     │                          │                    │ - Redis ZADD  │
     │                          │                    │   (cache)     │
     │                          │                    │ - Mark token  │
     │                          │                    │   as used     │
     │                          │                    └───────┬───────┘
     │                          │                            │
     │                          │  10. Response (200)        │
     │                          │◄───────────────────────────┤
     │                          │                            │
     │  11. Update UI           │                            │
     │◄─────────────────────────┤                            │
     │                          │                            │
     │                          │                            ▼
     │                          │                    ┌───────────────┐
     │                          │                    │ 12. BROADCAST │
     │                          │                    ├───────────────┤
     │                          │                    │ Redis Pub/Sub │
     │                          │                    │ → All Servers │
     │                          │                    └───────┬───────┘
     │                          │                            │
     │                          │                            ▼
     │                          │                    ┌───────────────────────┐
     │                          │                    │ 13. WEBSOCKET PUSH    │
     │                          │                    │     to ALL subscribers│
     │                          │                    └───────────────────────┘
     │                          │                            │
     │                          │  14. WebSocket Event       │
     │                          │      "leaderboard:update"  │
     │                          │◄───────────────────────────┤
     │                          │                            │
     │  15. Live Update         │                            │
     │◄─────────────────────────┤                            │
     │      (scoreboard)        │                            │
     │                          │                            │
```

### Score Token Validation Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SCORE TOKEN VALIDATION                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  POST /scores/  │
                              │  update         │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  1. Verify JWT  │
                         ┌────┤  (user auth)    ├────┐
                         │    └─────────────────┘    │
                      VALID                       INVALID
                         │                           │
                         ▼                           ▼
                ┌─────────────────┐         ┌───────────────┐
                │  2. Decode      │         │ 401           │
                │  Score Token    │         │ UNAUTHORIZED  │
                │  (X-Score-Token)│         └───────────────┘
                └────────┬────────┘
                         │
            ┌────────────┼────────────┐
         VALID           │         INVALID
       SIGNATURE         │        SIGNATURE
            │            │            │
            ▼            │            ▼
   ┌─────────────────┐   │   ┌───────────────┐
   │  3. Check       │   │   │ 400           │
   │  Expiration     │   │   │ INVALID_TOKEN │
   │  (60 seconds)   │   │   └───────────────┘
   └────────┬────────┘   │
            │            │
      ┌─────┴─────┐      │
   VALID       EXPIRED   │
      │           │      │
      ▼           ▼      │
┌───────────┐ ┌────────┐ │
│ 4. Check  │ │ 403    │ │
│ User Match│ │ EXPIRED│ │
└─────┬─────┘ └────────┘ │
      │                  │
   ┌──┴──┐               │
 MATCH  MISMATCH         │
   │       │             │
   ▼       ▼             │
┌──────┐ ┌────────┐      │
│5.Chk │ │ 403    │      │
│ Used │ │MISMATCH│      │
└──┬───┘ └────────┘      │
   │                     │
┌──┴──┐                  │
NEW   USED               │
 │      │                │
 ▼      ▼                │
┌────┐ ┌─────┐           │
│ OK │ │ 409 │           │
│    │ │ USED│           │
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
  │ updated_at      │         └─────────────────┘    │    │ token_id    UQ  │
  └─────────────────┘                                │    │ metadata   JSON │
                                                     │    │ processed_at    │
                                                     │    │ created_at      │
                                                     └────│                 │
                                                          └─────────────────┘
  
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                         REDIS DATA STRUCTURES                               │
  └─────────────────────────────────────────────────────────────────────────────┘
  
  ┌─────────────────┐         ┌─────────────────┐
  │  leaderboard    │         │  score_tokens   │
  │  (Sorted Set)   │         │  (Hash + TTL)   │
  ├─────────────────┤         ├─────────────────┤
  │                 │         │                 │
  │ user-456: 9500  │         │ token:{id}:     │
  │ user-789: 9200  │         │   used: false   │
  │ user-123: 1600  │         │   userId: xxx   │
  │ ...             │         │   points: 100   │
  │                 │         │   TTL: 60s      │
  └─────────────────┘         └─────────────────┘
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

-- Action logs for audit trail
CREATE TABLE action_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_id       UUID NOT NULL UNIQUE,           -- Server-generated
    action_type     VARCHAR(50) NOT NULL,
    points_awarded  INTEGER NOT NULL,
    token_id        VARCHAR(100) NOT NULL UNIQUE,   -- Score token ID
    metadata        JSONB,
    processed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying user's action history
CREATE INDEX idx_action_logs_user_id ON action_logs(user_id);
CREATE INDEX idx_action_logs_token_id ON action_logs(token_id);
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

# Score Token State (with automatic expiration)
HSET score_token:{token_id} used "false" userId "user-123" points 100
EXPIRE score_token:{token_id} 60

# Mark token as used:
HSET score_token:{token_id} used "true"
```

---

## Security Design

### 1. Server-Issued Score Token

**Why This Approach?**

Unlike client-generated signatures (which can be reverse-engineered from frontend code), the score token is:
- **Generated by the server** with a secret key the client never sees
- **Single-use** - cannot be replayed
- **Short-lived** - expires in 60 seconds
- **User-bound** - tied to the authenticated user who completed the action

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     SERVER-ISSUED SCORE TOKEN MECHANISM                         │
└─────────────────────────────────────────────────────────────────────────────────┘

  FRONTEND                                                 SERVER
    │                                                        │
    │  User completes action                                 │
    │                                                        │
    │  POST /actions/complete                                │
    │  { actionType, actionData }                            │
    ├───────────────────────────────────────────────────────►│
    │                                                        │
    │                                 ┌──────────────────────┤
    │                                 │ 1. Validate action   │
    │                                 │    data              │
    │                                 │                      │
    │                                 │ 2. Calculate points  │
    │                                 │    (server decides!) │
    │                                 │                      │
    │                                 │ 3. Generate token:   │
    │                                 │    JWT.sign({        │
    │                                 │      actionId,       │
    │                                 │      userId,         │
    │                                 │      points,         │
    │                                 │      exp: +60s       │
    │                                 │    }, SERVER_SECRET) │
    │                                 │                      │
    │                                 │ 4. Store in Redis:   │
    │                                 │    token:{id}.used   │
    │                                 │    = false           │
    │                                 └──────────────────────┤
    │                                                        │
    │  { scoreToken, pointsEarned, tokenExpiresAt }          │
    │◄───────────────────────────────────────────────────────┤
    │                                                        │
    │  CLIENT CANNOT:                                        │
    │  • Modify the points (signed by server)                │
    │  • Forge a new token (no access to SERVER_SECRET)      │
    │  • Reuse the token (marked as used after first use)    │
    │  • Use after expiration (60s TTL)                      │
    │                                                        │
```

### 2. Anti-Cheat Mechanisms

| Mechanism | Purpose | Implementation |
|-----------|---------|----------------|
| **Server-Generated Token** | Prevent forged score updates | Only server can create valid tokens with SERVER_SECRET |
| **Single-Use Token** | Prevent replay attacks | Redis tracks `used` state per token |
| **Token Expiration** | Limit attack window | 60-second TTL on tokens |
| **User Binding** | Prevent token theft | Token contains userId, verified against JWT |
| **Action Validation** | Verify action legitimacy | Server validates actionData before issuing token |
| **Rate Limiting** | Prevent score flooding | Max 10 actions per minute per user |

### 3. Rate Limiting Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           RATE LIMITING LAYERS                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

  Layer 1: API Gateway (Global)
  ─────────────────────────────
  • 1000 requests/minute per IP
  • Protects against DDoS

  Layer 2: Application (Per-User Actions)
  ───────────────────────────────────────
  • 10 action completion requests/minute per user
  • Uses sliding window algorithm
  • Stored in Redis: rate_limit:actions:user:<user_id>

  Layer 3: Score Update Throttle
  ──────────────────────────────
  • 10 score updates/minute per user
  • Additional protection layer
  • Stored in Redis: rate_limit:scores:user:<user_id>
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
                    │       Redis Cluster      │
                    │                          │
                    │  • Leaderboard (sorted)  │
                    │  • Score tokens (hash)   │
                    │  • Pub/Sub channels      │
                    │  • Rate limit counters   │
                    └──────────────────────────┘
```

### Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|------|---------------|-----|--------------|
| Leaderboard (top 10) | Redis Sorted Set | Real-time | On score update |
| Score tokens | Redis Hash | 60 seconds | Auto-expire |
| User profile data | Redis Hash | 5 minutes | On profile update |
| Rate limit counters | Redis | Sliding window | Auto-expire |

### Database Optimization

1. **Read Replicas**: Use PostgreSQL read replicas for leaderboard queries
2. **Connection Pooling**: Use PgBouncer for efficient connection management
3. **Indexes**: Composite indexes on frequently queried columns
4. **Partitioning**: Consider partitioning `action_logs` by date for archival

---

## Expert Recommendations & Improvements

### 🔴 Critical: Architectural Improvements

| Priority | Recommendation | Rationale |
|----------|----------------|-----------|
| **P0** | **Move to Server-Authoritative Scoring** | The current design still trusts the client to report action completion. Ideally, all actions should be processed and validated entirely on the server. |
| **P0** | **Server-Side Game State** | Store game/action state on server. When client claims "quiz completed", server should verify against its own records of questions asked and answers received. |
| **P0** | **Eliminate Client Score Knowledge** | Client should never know or control the points. Server calculates and applies points internally. |

### 🟠 High: Security Improvements

| Priority | Recommendation | Rationale |
|----------|----------------|-----------|
| **P1** | **Bot Detection** | Bots that complete actions legitimately cannot be distinguished from humans. Implement CAPTCHA, behavioral analysis, and rate limiting to mitigate automated abuse. |
| **P1** | **Behavioral Analysis** | Implement server-side analytics to detect impossible patterns (e.g., 100% accuracy, inhuman response times). |
| **P1** | **Device Fingerprinting** | Track device characteristics to detect multi-accounting and automation. |
| **P1** | **Token Rotation** | Implement short-lived access tokens (15 min) with refresh tokens. |
| **P1** | **Audit Logging** | Log all score-changing operations with full context for forensic analysis. |

### 🟡 Medium: Performance Improvements

| Priority | Recommendation | Expected Impact |
|----------|----------------|-----------------|
| **P2** | **Batch WebSocket Updates** | Instead of pushing every score change, batch updates every 100ms. Reduces message volume by ~90%. |
| **P2** | **Delta Updates** | Send only changed leaderboard positions instead of full top 10. |
| **P2** | **Connection Compression** | Enable WebSocket compression for reduced bandwidth. |

### 🟢 Reliability Improvements

| Priority | Recommendation | Rationale |
|----------|----------------|-----------|
| **P2** | **Circuit Breaker** | Implement circuit breaker for Redis/PostgreSQL to gracefully degrade. |
| **P2** | **Fallback to REST** | If WebSocket disconnects, fall back to polling REST endpoint. |
| **P3** | **Message Queue** | Use durable message queue (e.g., Kafka) instead of Redis Pub/Sub for guaranteed delivery. |

### 🔵 Observability Improvements

| Priority | Recommendation | Implementation |
|----------|----------------|----------------|
| **P1** | **Correlation ID** | Trace requests from client → API → database with unique IDs. |
| **P1** | **Metrics Dashboard** | Track: score updates/sec, WebSocket connections, token issuance/redemption rates. |
| **P2** | **Anomaly Alerts** | Alert on: score jumps > 1000 points, users with > 100 actions/hour, token redemption failures spike. |

---

## Alternative Real-Time Technologies

| Technology | Pros | Cons | Use When |
|------------|------|------|----------|
| **WebSocket** | Full duplex, low latency | Complex connection management | Need bidirectional communication |
| **Server-Sent Events (SSE)** | Simple, HTTP-based, auto-reconnect | Unidirectional only | Read-only updates (scoreboard) |
| **Long Polling** | Works everywhere, simple fallback | Higher latency, more requests | Legacy browser support needed |

**Recommendation**: Use **WebSocket** as primary with **SSE** or **long polling** as fallback for broader compatibility.

---

## Future Enhancements

1. **Historical Leaderboards**: Store daily/weekly/monthly leaderboard snapshots
2. **Friend Leaderboards**: Show user's rank among friends
3. **Achievement System**: Award badges for milestones
4. **Anti-Cheat ML Model**: Train model to detect suspicious scoring patterns
5. **Regional Leaderboards**: Partition by geography for localized competition

---

## Summary

This specification defines a real-time scoreboard system with **defense-in-depth security**:

| Layer | Mechanism |
|-------|-----------|
| **Authentication** | JWT tokens for user identity |
| **Authorization** | Server-issued score tokens (single-use, time-limited) |
| **Validation** | Server validates action data before issuing tokens |
| **Rate Limiting** | Multi-layer throttling (IP, user, action type) |
| **Audit Trail** | All score changes logged with full context |
| **Real-time Updates** | WebSocket with Redis Pub/Sub for live leaderboard |

### Key Architectural Decision

This design implements **client-initiated score updates** as per requirements, while acknowledging that a **server-authoritative model** would be fundamentally more secure. The server-issued token mechanism provides meaningful protection against casual attacks, but determined attackers with reverse-engineering capabilities may still find exploits.

**For production systems with real value at stake**, the recommendation is to migrate toward server-authoritative scoring where the server controls all game state and score calculations.
