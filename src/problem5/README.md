# Token Price API

A production-ready CRUD backend service for token price management, built with ExpressJS, TypeScript, Prisma, and Kong Gateway.

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Client      │────▶│  Kong Gateway   │────▶│  Token Price    │
│   (Frontend)    │     │  (Auth, CORS,   │     │     API         │
│                 │◀────│   Rate Limit)   │◀────│  (ExpressJS)    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │   PostgreSQL    │
                                                │   (Prisma ORM)  │
                                                └─────────────────┘
```

## ✨ Features

- **CRUD Operations**: Create, Read, Update, Delete token prices
- **Exchange Rate Calculation**: Calculate exchange rates between currencies
- **Background Sync**: Automatic price sync from external API every 30 seconds
- **Fallback Data**: Local JSON fallback when external API is unavailable
- **Kong Gateway**: Authentication, rate limiting, CORS, correlation ID
- **Observability**: Structured logging with correlation ID for request tracing
- **Health Checks**: Kubernetes-compatible liveness and readiness probes

## 🚀 Quick Start

### Prerequisites

- Docker Desktop
- Node.js 20+

### Development

```bash
# Install dependencies
npm install

# Interactive guide: tests → dev environment → API tests
./scripts/run-all.sh

# Or start dev environment directly
npm run dev
```

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| API (via Kong) | http://localhost:8000/api | Production-like access with auth |
| API (Direct) | http://localhost:3000/api | Direct access for debugging |
| Kong Admin | http://localhost:8001 | Kong Gateway admin API |
| PostgreSQL | localhost:5432 | Database (user: postgres, pass: postgres) |

### Testing

```bash
npm run test              # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests (uses Testcontainers)
npm run test:e2e          # API tests against running environment
```

## 📚 API Documentation

### Authentication

All requests through Kong Gateway require the `X-Client-ID` header:

```bash
curl http://localhost:8000/api/token-prices \
  -H "X-Client-ID: frontend-swap-app"
```

### Endpoints

#### List Token Prices
```bash
GET /api/token-prices
GET /api/token-prices?currency=ETH
GET /api/token-prices?minPrice=100&maxPrice=2000
GET /api/token-prices?page=1&limit=20
```

#### Get Token Price by Currency
```bash
GET /api/token-prices/:currency

# Example
GET /api/token-prices/ETH
```

#### Get Token Price by ID
```bash
GET /api/token-prices/id/:id
```

#### Create Token Price
```bash
POST /api/token-prices
Content-Type: application/json

{
  "currency": "NEW",
  "price": 100.50,
  "date": "2026-01-10T10:00:00Z"  // optional
}
```

#### Update Token Price
```bash
PUT /api/token-prices/:id
Content-Type: application/json

{
  "price": 105.00
}
```

#### Delete Token Price
```bash
DELETE /api/token-prices/:id
```

#### Calculate Exchange Rate
```bash
GET /api/exchange-rate?from=ETH&to=USDC&amount=1.5

# Response
{
  "from": "ETH",
  "to": "USDC",
  "amount": 1.5,
  "rate": 1645.93,
  "result": 2468.90,
  "timestamp": "2026-01-10T10:30:00.000Z"
}
```

#### Health Checks
```bash
# Liveness probe
GET /health

# Readiness probe
GET /health/ready
```

### Response Headers

All responses include:
- `X-Correlation-ID`: Unique request ID for tracing

### Error Responses

```json
{
  "error": "Not Found",
  "message": "Token price for currency 'INVALID' not found",
  "statusCode": 404,
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## 🔧 Project Structure

```
src/problem5/
├── src/
│   ├── config/         # Configuration
│   ├── controllers/    # Request handlers
│   ├── errors/         # Custom error classes
│   ├── jobs/           # Background jobs
│   ├── middleware/     # Express middleware
│   ├── repositories/   # Data access layer
│   ├── routes/         # API routes
│   ├── schemas/        # Zod validation schemas
│   ├── services/       # Business logic
│   ├── types/          # TypeScript types
│   ├── utils/          # Utilities
│   ├── app.ts          # Express app setup
│   └── index.ts        # Entry point
├── prisma/
│   └── schema.prisma   # Database schema
├── k8s/                # Kubernetes manifests
├── kong/               # Kong configuration
├── scripts/            # Setup scripts
└── data/               # Fallback data
```

## 🔒 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DATABASE_URL` | PostgreSQL connection URL | - |
| `PRICE_API_URL` | External price API URL | https://interview.switcheo.com/prices.json |
| `PRICE_SYNC_INTERVAL_MS` | Sync interval in ms | 30000 |
| `LOG_LEVEL` | Log level | info |

## 📊 Observability

### Correlation ID

Every request is assigned a unique correlation ID:
1. Kong Gateway generates `X-Correlation-ID`
2. Backend includes it in all logs
3. Response includes the header for frontend debugging

### Log Format

```json
{
  "level": "info",
  "time": "2026-01-10T10:30:00.000Z",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "path": "/api/token-prices",
  "statusCode": 200,
  "duration": 45
}
```

## 📝 License

MIT

