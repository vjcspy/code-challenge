# 📋 [PROBLEM6: 2026-01-11] - Real-Time Scoreboard Module

## References

- Specification Document: `src/problem6/README.md`
- Similar Implementation Reference: `src/problem5/` (Token Price API with similar tech stack)
- Plan Reference: `plans/260110-problem5-expressjs-crud-backend.md`

## User Requirements

> Original task requirements:

1. Website with a score board showing **top 10 user's scores**
2. **Live update** of the score board
3. User completes an action → score increases
4. Action completion dispatches an **API call** to update the score
5. **Prevent malicious users** from increasing scores without authorization

## 🎯 Objective

Build a production-ready real-time scoreboard backend module that:

- Displays top 10 users with live score updates via WebSocket
- Processes score increases when users complete actions
- Implements defense-in-depth security using server-issued score tokens
- Uses Redis Sorted Set for O(log N) leaderboard operations
- Broadcasts updates across multiple server instances via Redis Pub/Sub

### ⚠️ Key Considerations

1. **Architectural Trade-off Acknowledged**:
   - The requirement specifies **client-initiated score updates** (client calls API after action)
   - This is inherently less secure than **server-authoritative scoring**
   - We mitigate risks through multiple defense layers (documented in spec)

2. **Security**:
   - **Server-Issued Score Tokens**: Client cannot forge tokens (signed with server secret)
   - **Single-Use Tokens**: Stored in Redis with TTL, marked as used after redemption
   - **Token Expiration**: 60-second TTL limits attack window
   - **User Binding**: Token tied to authenticated user
   - **Rate Limiting**: Multi-layer (API Gateway, per-user actions, score updates)

3. **Performance**:
   - Redis Sorted Set for O(log N) leaderboard updates
   - Redis Pub/Sub for cross-instance broadcasts
   - Batched WebSocket updates (every 100ms) to reduce message volume
   - Connection pooling for PostgreSQL

4. **Scalability**:
   - Stateless API servers (horizontal scaling ready)
   - WebSocket-aware load balancer with sticky sessions
   - Redis Cluster for distributed state
   - PostgreSQL read replicas for leaderboard queries

5. **Observability**:
   - Correlation ID tracing (Kong → Backend → Database)
   - Structured logging with Pino
   - Metrics dashboard (score updates/sec, WebSocket connections)
   - Anomaly alerts (score jumps, abnormal action rates)

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                       │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐     │
│  │   Web Browser #1    │  │   Web Browser #2    │  │   Web Browser #N    │     │
│  │  (Scoreboard View)  │  │  (Scoreboard View)  │  │  (Scoreboard View)  │     │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘     │
│             │ WebSocket              │ WebSocket              │ WebSocket      │
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
              ▼                        ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   API Server #1     │  │   API Server #2     │  │   API Server #N     │
│  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │
│  │  REST API     │  │  │  │  REST API     │  │  │  │  REST API     │  │
│  │  WebSocket    │  │  │  │  WebSocket    │  │  │  │  WebSocket    │  │
│  └───────────────┘  │  │  └───────────────┘  │  │  └───────────────┘  │
└──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘
           │                        │                        │
           └────────────────────────┼────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   Redis Cache       │  │   PostgreSQL        │  │   Action Token      │
│  ┌───────────────┐  │  │  ┌───────────────┐  │  │   Store (Redis)     │
│  │ Sorted Set    │  │  │  │ users         │  │  │  ┌───────────────┐  │
│  │ "leaderboard" │  │  │  │ scores        │  │  │  │ Pending       │  │
│  │ + Pub/Sub     │  │  │  │ action_logs   │  │  │  │ action tokens │  │
│  └───────────────┘  │  │  └───────────────┘  │  │  │ (TTL: 60s)    │  │
│                     │  │                     │  │  └───────────────┘  │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

## 🔄 Implementation Plan

### Phase 1: Analysis & Preparation ✅

- [x] Review specification document (`src/problem6/README.md`)
  - **Outcome**: Comprehensive spec with API design, data model, security mechanisms
- [x] Define scope and edge cases
  - **Edge Cases**:
    - Token replay attacks (mitigated: single-use)
    - Token theft between users (mitigated: user binding)
    - Network latency causing token expiration (mitigated: 60s is generous)
    - Concurrent score updates (mitigated: Redis atomic operations)
    - WebSocket reconnection (fallback to REST polling)

### Phase 2: Implementation (File/Code Structure)

```
src/problem6/
├── .env.example                    # 🚧 Environment variables template
├── .gitignore                      # 🚧 Node + Prisma ignores
├── Dockerfile                      # 🚧 Multi-stage build for production
├── Dockerfile.dev                  # 🚧 Dev container with hot-reload
├── docker-compose.yml              # ⭐ PRIMARY: Docker Compose for local dev
├── docker-compose.dev.yml          # ⭐ Dev overrides (hot-reload, volumes)
├── kong/
│   └── kong.yml                    # 🚧 Kong declarative config
├── scripts/
│   ├── dev-compose.sh              # ⭐ Docker Compose helper script
│   ├── test.sh                     # 🚧 API integration test script
│   └── wait-for-db.sh              # 🚧 DB readiness check script
├── package.json                    # 🚧 Dependencies + scripts
├── tsconfig.json                   # 🚧 TypeScript configuration
├── README.md                       # ✅ Specification document (already exists)
├── jest.config.js                  # 🚧 Jest configuration
├── prisma/
│   ├── schema.prisma               # 🚧 Database schema
│   └── migrations/                 # 🚧 Auto-generated migrations
├── tests/
│   ├── unit/                       # 🚧 Unit tests
│   │   ├── services/
│   │   │   ├── action.service.test.ts
│   │   │   ├── score.service.test.ts
│   │   │   └── leaderboard.service.test.ts
│   │   ├── middleware/
│   │   │   ├── auth.test.ts
│   │   │   └── scoreToken.test.ts
│   │   └── websocket/
│   │       └── broadcast.test.ts
│   └── integration/                # 🚧 Integration tests (Testcontainers)
│       ├── setup/
│       │   └── testcontainers.setup.ts
│       └── api/
│           ├── action.api.test.ts
│           ├── score.api.test.ts
│           └── leaderboard.api.test.ts
└── src/
    ├── index.ts                    # 🚧 Application entry point
    ├── app.ts                      # 🚧 Express + WebSocket setup
    ├── config/
    │   └── index.ts                # 🚧 Environment configuration
    ├── middleware/
    │   ├── errorHandler.ts         # 🚧 Global error handling
    │   ├── correlationId.ts        # 🚧 Extract/propagate X-Correlation-ID
    │   ├── requestLogger.ts        # 🚧 Pino request logging
    │   ├── auth.ts                 # 🚧 JWT authentication
    │   ├── rateLimiter.ts          # 🚧 Per-user rate limiting
    │   └── scoreToken.ts           # 🚧 Score token validation middleware
    ├── routes/
    │   ├── index.ts                # 🚧 Route aggregator
    │   ├── health.routes.ts        # 🚧 Health check routes
    │   ├── action.routes.ts        # 🚧 POST /actions/complete
    │   ├── score.routes.ts         # 🚧 POST /scores/update, GET /scores/leaderboard
    │   └── websocket.routes.ts     # 🚧 WS /scores/live
    ├── controllers/
    │   ├── action.controller.ts    # 🚧 Action completion handler
    │   ├── score.controller.ts     # 🚧 Score update handler
    │   └── leaderboard.controller.ts # 🚧 Leaderboard handler
    ├── services/
    │   ├── action.service.ts       # 🚧 Action validation & token generation
    │   ├── score.service.ts        # 🚧 Score update logic
    │   ├── leaderboard.service.ts  # 🚧 Leaderboard operations
    │   ├── scoreToken.service.ts   # 🚧 Token generation & validation
    │   └── broadcast.service.ts    # 🚧 WebSocket + Pub/Sub broadcasting
    ├── repositories/
    │   ├── user.repository.ts      # 🚧 User data access
    │   ├── score.repository.ts     # 🚧 Score data access
    │   └── actionLog.repository.ts # 🚧 Action log data access
    ├── websocket/
    │   ├── handler.ts              # 🚧 WebSocket connection handler
    │   ├── broadcaster.ts          # 🚧 Redis Pub/Sub → WebSocket
    │   └── types.ts                # 🚧 WebSocket message types
    ├── schemas/
    │   ├── action.schema.ts        # 🚧 Action request validation
    │   ├── score.schema.ts         # 🚧 Score request validation
    │   └── leaderboard.schema.ts   # 🚧 Leaderboard query validation
    ├── types/
    │   └── index.ts                # 🚧 Shared TypeScript types
    ├── utils/
    │   ├── prisma.ts               # 🚧 Prisma client singleton
    │   ├── redis.ts                # 🚧 Redis client singleton
    │   ├── logger.ts               # 🚧 Pino logger with context
    │   ├── context.ts              # 🚧 AsyncLocalStorage for request context
    │   └── jwt.ts                  # 🚧 JWT utilities
    └── errors/
        ├── AppError.ts             # 🚧 Base error class
        ├── AuthError.ts            # 🚧 Authentication errors
        └── TokenError.ts           # 🚧 Score token errors
```

### Phase 3: Detailed Implementation Steps

#### Step 1: Project Initialization

- [ ] Create `package.json` with dependencies:
  - **Runtime**: express, @prisma/client, ioredis, ws, zod, jsonwebtoken, helmet, cors, express-rate-limit, pino, pino-http, uuid
  - **DevDependencies**: typescript, ts-node-dev, @types/*, prisma, tsx, pino-pretty
  - **Testing**: jest, ts-jest, supertest, @testcontainers/postgresql, testcontainers, nock
- [ ] Create `tsconfig.json` with strict mode
- [ ] Create `.env.example` and `.gitignore`

#### Step 2: Database Schema (Prisma)

- [ ] Create `prisma/schema.prisma`:
  ```prisma
  model User {
    id        String   @id @default(uuid())
    username  String   @unique
    email     String   @unique
    avatarUrl String?
    score     Score?
    actionLogs ActionLog[]
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }

  model Score {
    id         String   @id @default(uuid())
    userId     String   @unique
    user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    totalScore BigInt   @default(0)
    updatedAt  DateTime @updatedAt

    @@index([totalScore(sort: Desc)])
  }

  model ActionLog {
    id            String   @id @default(uuid())
    userId        String
    user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    actionId      String   @unique  // Server-generated
    actionType    String
    pointsAwarded Int
    tokenId       String   @unique  // Score token ID
    metadata      Json?
    processedAt   DateTime @default(now())
    createdAt     DateTime @default(now())

    @@index([userId])
    @@index([tokenId])
  }
  ```

#### Step 3: Redis Setup

- [ ] Create `src/utils/redis.ts`:
  ```typescript
  import Redis from 'ioredis';
  import { config } from '../config';

  // Main Redis client for data operations
  export const redis = new Redis(config.redisUrl);

  // Separate client for Pub/Sub (required by ioredis)
  export const redisSub = new Redis(config.redisUrl);
  export const redisPub = new Redis(config.redisUrl);

  // Leaderboard operations
  export const leaderboard = {
    // Add/update score: O(log N)
    updateScore: (userId: string, score: number) =>
      redis.zadd('leaderboard', score, userId),

    // Increment score atomically: O(log N)
    incrementScore: (userId: string, points: number) =>
      redis.zincrby('leaderboard', points, userId),

    // Get top N: O(log N + M)
    getTopN: (n: number) =>
      redis.zrevrange('leaderboard', 0, n - 1, 'WITHSCORES'),

    // Get user rank: O(log N)
    getRank: (userId: string) =>
      redis.zrevrank('leaderboard', userId),

    // Get user score: O(1)
    getScore: (userId: string) =>
      redis.zscore('leaderboard', userId),
  };

  // Score token operations
  export const scoreTokenStore = {
    // Store token with TTL
    create: (tokenId: string, data: object, ttlSeconds: number = 60) =>
      redis.setex(`score_token:${tokenId}`, ttlSeconds, JSON.stringify(data)),

    // Get token data
    get: async (tokenId: string) => {
      const data = await redis.get(`score_token:${tokenId}`);
      return data ? JSON.parse(data) : null;
    },

    // Mark as used (atomic)
    markUsed: async (tokenId: string) => {
      const key = `score_token:${tokenId}`;
      // Lua script for atomic get-and-mark
      const script = `
        local data = redis.call('GET', KEYS[1])
        if not data then return nil end
        local parsed = cjson.decode(data)
        if parsed.used then return 'ALREADY_USED' end
        parsed.used = true
        redis.call('SETEX', KEYS[1], 60, cjson.encode(parsed))
        return cjson.encode(parsed)
      `;
      return redis.eval(script, 1, key);
    },
  };
  ```

#### Step 4: Score Token Service

- [ ] Create `src/services/scoreToken.service.ts`:
  ```typescript
  import jwt from 'jsonwebtoken';
  import { v4 as uuidv4 } from 'uuid';
  import { scoreTokenStore } from '../utils/redis';
  import { config } from '../config';

  interface ScoreTokenPayload {
    actionId: string;
    userId: string;
    points: number;
    tokenId: string;
  }

  export class ScoreTokenService {
    // Generate server-signed score token
    async generateToken(userId: string, actionId: string, points: number): Promise<{
      token: string;
      tokenId: string;
      expiresAt: Date;
    }> {
      const tokenId = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds

      const payload: ScoreTokenPayload = {
        actionId,
        userId,
        points,
        tokenId,
      };

      // Sign with server secret
      const token = jwt.sign(payload, config.scoreTokenSecret, {
        expiresIn: '60s',
      });

      // Store in Redis for single-use tracking
      await scoreTokenStore.create(tokenId, {
        userId,
        points,
        actionId,
        used: false,
      });

      return { token, tokenId, expiresAt };
    }

    // Validate and consume token (single-use)
    async validateAndConsume(token: string, requestUserId: string): Promise<ScoreTokenPayload> {
      // Verify JWT signature and expiration
      let payload: ScoreTokenPayload;
      try {
        payload = jwt.verify(token, config.scoreTokenSecret) as ScoreTokenPayload;
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
          throw new TokenError('TOKEN_EXPIRED', 'Score token has expired');
        }
        throw new TokenError('INVALID_TOKEN', 'Invalid score token');
      }

      // Verify user binding
      if (payload.userId !== requestUserId) {
        throw new TokenError('TOKEN_USER_MISMATCH', 'Token was issued to different user');
      }

      // Atomic check-and-mark-used
      const result = await scoreTokenStore.markUsed(payload.tokenId);
      if (result === null) {
        throw new TokenError('TOKEN_EXPIRED', 'Score token not found or expired');
      }
      if (result === 'ALREADY_USED') {
        throw new TokenError('TOKEN_ALREADY_USED', 'Score token has already been redeemed');
      }

      return payload;
    }
  }
  ```

#### Step 5: Action Service

- [ ] Create `src/services/action.service.ts`:
  ```typescript
  import { v4 as uuidv4 } from 'uuid';
  import { ScoreTokenService } from './scoreToken.service';
  import { ActionLogRepository } from '../repositories/actionLog.repository';

  interface ActionData {
    actionType: string;
    actionData: Record<string, unknown>;
    clientTimestamp: string;
  }

  interface ActionResult {
    scoreToken: string;
    pointsEarned: number;
    tokenExpiresAt: Date;
    actionId: string;
  }

  export class ActionService {
    constructor(
      private scoreTokenService: ScoreTokenService,
      private actionLogRepository: ActionLogRepository,
    ) {}

    async completeAction(userId: string, data: ActionData): Promise<ActionResult> {
      // 1. Validate action data (business logic)
      const points = this.calculatePoints(data.actionType, data.actionData);

      // 2. Generate action ID
      const actionId = uuidv4();

      // 3. Generate server-signed score token
      const { token, tokenId, expiresAt } = await this.scoreTokenService.generateToken(
        userId,
        actionId,
        points,
      );

      return {
        scoreToken: token,
        pointsEarned: points,
        tokenExpiresAt: expiresAt,
        actionId,
      };
    }

    private calculatePoints(actionType: string, actionData: Record<string, unknown>): number {
      // Business logic for point calculation
      // This is where server decides points - client cannot influence this
      switch (actionType) {
        case 'quiz_complete':
          return 100;
        case 'task_finish':
          return 50;
        case 'daily_login':
          return 10;
        default:
          return 0;
      }
    }
  }
  ```

#### Step 6: Score Service

- [ ] Create `src/services/score.service.ts`:
  ```typescript
  import { ScoreTokenService } from './scoreToken.service';
  import { ScoreRepository } from '../repositories/score.repository';
  import { ActionLogRepository } from '../repositories/actionLog.repository';
  import { BroadcastService } from './broadcast.service';
  import { leaderboard } from '../utils/redis';

  export class ScoreService {
    constructor(
      private scoreTokenService: ScoreTokenService,
      private scoreRepository: ScoreRepository,
      private actionLogRepository: ActionLogRepository,
      private broadcastService: BroadcastService,
    ) {}

    async updateScore(userId: string, scoreToken: string): Promise<{
      previousScore: number;
      pointsAwarded: number;
      newScore: number;
      newRank: number;
    }> {
      // 1. Validate and consume token (atomic, single-use)
      const tokenPayload = await this.scoreTokenService.validateAndConsume(scoreToken, userId);

      // 2. Get previous score
      const previousScore = parseInt(await leaderboard.getScore(userId) || '0', 10);

      // 3. Update score in Redis (atomic increment)
      const newScoreStr = await leaderboard.incrementScore(userId, tokenPayload.points);
      const newScore = parseInt(newScoreStr, 10);

      // 4. Persist to PostgreSQL (async, non-blocking)
      this.scoreRepository.updateScore(userId, newScore).catch(err => {
        // Log error but don't fail the request
        logger.error({ err, userId, newScore }, 'Failed to persist score to PostgreSQL');
      });

      // 5. Log action for audit trail
      await this.actionLogRepository.create({
        userId,
        actionId: tokenPayload.actionId,
        actionType: 'score_update', // Could be more specific
        pointsAwarded: tokenPayload.points,
        tokenId: tokenPayload.tokenId,
      });

      // 6. Get new rank
      const newRank = await leaderboard.getRank(userId);

      // 7. Broadcast update via Redis Pub/Sub
      await this.broadcastService.broadcastScoreUpdate({
        userId,
        previousScore,
        newScore,
        newRank: newRank !== null ? newRank + 1 : null, // Convert 0-indexed to 1-indexed
        pointsAwarded: tokenPayload.points,
      });

      return {
        previousScore,
        pointsAwarded: tokenPayload.points,
        newScore,
        newRank: newRank !== null ? newRank + 1 : 0,
      };
    }
  }
  ```

#### Step 7: Leaderboard Service

- [ ] Create `src/services/leaderboard.service.ts`:
  ```typescript
  import { leaderboard } from '../utils/redis';
  import { UserRepository } from '../repositories/user.repository';

  interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    score: number;
    avatarUrl: string | null;
  }

  export class LeaderboardService {
    constructor(private userRepository: UserRepository) {}

    async getTopN(n: number = 10): Promise<LeaderboardEntry[]> {
      // Get top N from Redis sorted set: O(log N + M)
      const results = await leaderboard.getTopN(n);

      // Results format: [userId1, score1, userId2, score2, ...]
      const userIds: string[] = [];
      const scores: Map<string, number> = new Map();

      for (let i = 0; i < results.length; i += 2) {
        const userId = results[i];
        const score = parseInt(results[i + 1], 10);
        userIds.push(userId);
        scores.set(userId, score);
      }

      // Batch fetch user details
      const users = await this.userRepository.findByIds(userIds);
      const userMap = new Map(users.map(u => [u.id, u]));

      // Build leaderboard entries
      return userIds.map((userId, index) => ({
        rank: index + 1,
        userId,
        username: userMap.get(userId)?.username || 'Unknown',
        score: scores.get(userId) || 0,
        avatarUrl: userMap.get(userId)?.avatarUrl || null,
      }));
    }

    async getUserRankAndScore(userId: string): Promise<{ rank: number; score: number } | null> {
      const [rank, score] = await Promise.all([
        leaderboard.getRank(userId),
        leaderboard.getScore(userId),
      ]);

      if (rank === null || score === null) {
        return null;
      }

      return {
        rank: rank + 1, // Convert 0-indexed to 1-indexed
        score: parseInt(score, 10),
      };
    }
  }
  ```

#### Step 8: WebSocket & Broadcasting

- [ ] Create `src/services/broadcast.service.ts`:
  ```typescript
  import { redisPub, redisSub } from '../utils/redis';
  import { WebSocketServer, WebSocket } from 'ws';

  const CHANNEL = 'scoreboard:updates';

  interface ScoreUpdateEvent {
    type: 'score_update';
    data: {
      userId: string;
      previousScore: number;
      newScore: number;
      newRank: number | null;
      pointsAwarded: number;
    };
  }

  interface LeaderboardUpdateEvent {
    type: 'leaderboard_update';
    data: {
      leaderboard: LeaderboardEntry[];
      changedPositions: Array<{
        userId: string;
        previousRank: number;
        newRank: number;
      }>;
    };
  }

  export class BroadcastService {
    private wss: WebSocketServer;
    private userConnections: Map<string, Set<WebSocket>> = new Map();

    constructor(wss: WebSocketServer) {
      this.wss = wss;
      this.setupPubSub();
    }

    private setupPubSub() {
      // Subscribe to Redis channel
      redisSub.subscribe(CHANNEL);

      redisSub.on('message', (channel, message) => {
        if (channel === CHANNEL) {
          const event = JSON.parse(message);
          this.broadcastToClients(event);
        }
      });
    }

    // Publish score update to Redis (for multi-instance support)
    async broadcastScoreUpdate(data: ScoreUpdateEvent['data']) {
      const event: ScoreUpdateEvent = { type: 'score_update', data };
      await redisPub.publish(CHANNEL, JSON.stringify(event));
    }

    // Broadcast to all WebSocket clients
    private broadcastToClients(event: ScoreUpdateEvent | LeaderboardUpdateEvent) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            event: event.type === 'score_update' ? 'leaderboard:update' : 'leaderboard:update',
            data: event.data,
            timestamp: new Date().toISOString(),
          }));
        }
      });
    }

    // Register user connection for personal updates
    registerConnection(userId: string, ws: WebSocket) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(ws);

      ws.on('close', () => {
        this.userConnections.get(userId)?.delete(ws);
      });
    }

    // Send personal score update to specific user
    sendPersonalUpdate(userId: string, data: object) {
      const connections = this.userConnections.get(userId);
      if (connections) {
        connections.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              event: 'score:personal',
              data,
              timestamp: new Date().toISOString(),
            }));
          }
        });
      }
    }
  }
  ```

- [ ] Create `src/websocket/handler.ts`:
  ```typescript
  import { WebSocket, WebSocketServer } from 'ws';
  import { Server } from 'http';
  import { URL } from 'url';
  import { verifyJwt } from '../utils/jwt';
  import { BroadcastService } from '../services/broadcast.service';
  import { logger } from '../utils/logger';

  export function setupWebSocket(server: Server, broadcastService: BroadcastService) {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async (request, socket, head) => {
      try {
        // Parse URL to get token
        const url = new URL(request.url!, `http://${request.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Verify JWT
        const user = await verifyJwt(token);

        wss.handleUpgrade(request, socket, head, (ws) => {
          // Attach user to WebSocket
          (ws as any).userId = user.id;

          // Register for personal updates
          broadcastService.registerConnection(user.id, ws);

          wss.emit('connection', ws, request);
        });
      } catch (err) {
        logger.error({ err }, 'WebSocket upgrade failed');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      }
    });

    wss.on('connection', (ws, request) => {
      const userId = (ws as any).userId;
      logger.info({ userId }, 'WebSocket connected');

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          handleMessage(ws, userId, message);
        } catch (err) {
          logger.error({ err }, 'Invalid WebSocket message');
        }
      });

      ws.on('close', () => {
        logger.info({ userId }, 'WebSocket disconnected');
      });

      // Send initial leaderboard
      sendInitialLeaderboard(ws);
    });

    return wss;
  }

  function handleMessage(ws: WebSocket, userId: string, message: any) {
    switch (message.action) {
      case 'subscribe':
        // Already subscribed by default
        break;
      case 'ping':
        ws.send(JSON.stringify({ action: 'pong' }));
        break;
      default:
        logger.warn({ action: message.action }, 'Unknown WebSocket action');
    }
  }

  async function sendInitialLeaderboard(ws: WebSocket) {
    // Inject leaderboard service or call directly
    // This is simplified - should use proper DI
    const leaderboard = await getLeaderboardService().getTopN(10);
    ws.send(JSON.stringify({
      event: 'leaderboard:initial',
      data: { leaderboard },
      timestamp: new Date().toISOString(),
    }));
  }
  ```

#### Step 9: API Routes & Controllers

- [ ] Create `src/routes/action.routes.ts`:
  ```typescript
  import { Router } from 'express';
  import { ActionController } from '../controllers/action.controller';
  import { validateRequest } from '../middleware/validateRequest';
  import { auth } from '../middleware/auth';
  import { rateLimiter } from '../middleware/rateLimiter';
  import { completeActionSchema } from '../schemas/action.schema';

  export function createActionRoutes(controller: ActionController): Router {
    const router = Router();

    // POST /api/v1/actions/complete
    router.post(
      '/complete',
      auth,                           // JWT authentication
      rateLimiter.actions,            // 10 req/min per user
      validateRequest(completeActionSchema),
      controller.complete.bind(controller),
    );

    return router;
  }
  ```

- [ ] Create `src/routes/score.routes.ts`:
  ```typescript
  import { Router } from 'express';
  import { ScoreController } from '../controllers/score.controller';
  import { LeaderboardController } from '../controllers/leaderboard.controller';
  import { validateRequest } from '../middleware/validateRequest';
  import { auth } from '../middleware/auth';
  import { rateLimiter } from '../middleware/rateLimiter';
  import { updateScoreSchema, leaderboardQuerySchema } from '../schemas/score.schema';

  export function createScoreRoutes(
    scoreController: ScoreController,
    leaderboardController: LeaderboardController,
  ): Router {
    const router = Router();

    // POST /api/v1/scores/update
    router.post(
      '/update',
      auth,
      rateLimiter.scores,              // 10 req/min per user
      validateRequest(updateScoreSchema),
      scoreController.update.bind(scoreController),
    );

    // GET /api/v1/scores/leaderboard
    router.get(
      '/leaderboard',
      validateRequest(leaderboardQuerySchema, 'query'),
      leaderboardController.getLeaderboard.bind(leaderboardController),
    );

    return router;
  }
  ```

#### Step 10: Docker Compose Setup

- [ ] Create `docker-compose.yml`:
  ```yaml
  version: '3.8'

  services:
    postgres:
      image: postgres:15-alpine
      environment:
        POSTGRES_USER: scoreboard
        POSTGRES_PASSWORD: scoreboard
        POSTGRES_DB: scoreboard
      ports:
        - "5432:5432"
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U scoreboard"]
        interval: 5s
        timeout: 5s
        retries: 5

    redis:
      image: redis:7-alpine
      ports:
        - "6379:6379"
      healthcheck:
        test: ["CMD", "redis-cli", "ping"]
        interval: 5s
        timeout: 5s
        retries: 5

    kong:
      image: kong:3.4-alpine
      environment:
        KONG_DATABASE: "off"
        KONG_DECLARATIVE_CONFIG: /kong/kong.yml
        KONG_PROXY_ACCESS_LOG: /dev/stdout
        KONG_ADMIN_ACCESS_LOG: /dev/stdout
        KONG_PROXY_ERROR_LOG: /dev/stderr
        KONG_ADMIN_ERROR_LOG: /dev/stderr
        KONG_ADMIN_LISTEN: 0.0.0.0:8001
      ports:
        - "8000:8000"   # Proxy
        - "8001:8001"   # Admin API
      volumes:
        - ./kong/kong.yml:/kong/kong.yml:ro
      depends_on:
        - app

    app:
      build:
        context: .
        dockerfile: Dockerfile.dev
      environment:
        DATABASE_URL: postgresql://scoreboard:scoreboard@postgres:5432/scoreboard
        REDIS_URL: redis://redis:6379
        PORT: 3000
        JWT_SECRET: dev-jwt-secret-change-in-production
        SCORE_TOKEN_SECRET: dev-score-token-secret-change-in-production
        NODE_ENV: development
      ports:
        - "3000:3000"
      volumes:
        - ./src:/app/src
        - ./prisma:/app/prisma
      depends_on:
        postgres:
          condition: service_healthy
        redis:
          condition: service_healthy
      command: >
        sh -c "npx prisma migrate deploy && npm run dev:local"

  networks:
    default:
      name: scoreboard-network
  ```

#### Step 11: Testing

- [ ] Create unit tests for:
  - `ScoreTokenService` (token generation, validation, single-use)
  - `ActionService` (point calculation, token generation)
  - `ScoreService` (score update, ranking)
  - `LeaderboardService` (top N, user rank)
  - Middleware tests (auth, rate limiter, score token validation)

- [ ] Create integration tests with Testcontainers:
  - Full action → token → score update flow
  - Token expiration handling
  - Token replay prevention
  - Concurrent score updates
  - WebSocket broadcast verification

#### Step 12: Documentation

- [ ] Update `src/problem6/README.md` with:
  - Quick start guide
  - API examples
  - Development setup
  - Link to this implementation plan

## 📊 Summary of Results

> Do not summarize until implementation is complete

### ✅ Completed Achievements
- [To be filled after implementation]

## 🚧 Outstanding Issues & Follow-up

### ⚠️ Pre-Implementation Clarifications

| Question | Default Answer | Notes |
|----------|----------------|-------|
| **User Registration** | Out of scope | Assume users already exist in database |
| **Action Types** | Generic implementation | Specific action validation logic TBD |
| **Token Secret Rotation** | Single secret | Production should use rotation |
| **WebSocket Scaling** | Redis Pub/Sub | Sufficient for demo; production may need dedicated message broker |

### 🔮 Future Enhancements (Out of Scope)

| Enhancement | Priority | Description |
|-------------|----------|-------------|
| Server-Authoritative Scoring | P0 | Ideal architecture but requires action-specific server logic |
| Bot Detection | P1 | CAPTCHA, behavioral analysis |
| Device Fingerprinting | P1 | Multi-accounting prevention |
| Historical Leaderboards | P2 | Daily/weekly/monthly snapshots |
| Friend Leaderboards | P3 | Social features |
