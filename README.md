# Code Challenge

> Hello Reviewer! I'm Kai, and this document serves as both an instruction guide and a space to share my thoughts on this code challenge. I'll walk you through each problem, present my perspective, and provide step-by-step guidance so you can review and run the applications smoothly.

---

## 📋 Table of Contents

- [My Approach](#-my-approach)
- [Problem 4: Sum to N](#-problem-4-sum-to-n)
- [Problem 5: Token Price API](#-problem-5-token-price-api)
  - [Key Architectural Decisions](#key-architectural-decisions)
  - [Why Observability Matters](#-deep-dive-why-observability-matters)
  - [Running the Application](#-running-problem-5)
- [Problem 6: Scoreboard Module](#-problem-6-scoreboard-module)
- [Quick Reference](#-quick-reference)

---

## 💡 My Approach

As mentioned in the challenge, AI has become a powerful tool in software development. I don't deny using AI to assist with this code challenge—but I believe **the most important thing is truly knowing what you're doing**, understanding the "why" behind every decision, not just the "how."

This mindset shapes how I approached each problem:

| Problem       | Key Principle            | Demonstration                                            |
|---------------|--------------------------|----------------------------------------------------------|
| **Problem 4** | Simplify before solving  | Using mathematical formulas over brute-force algorithms  |
| **Problem 5** | Production-grade thinking| Security, performance, observability, and maintainability|
| **Problem 6** | Architectural awareness  | Understanding trade-offs and security implications       |

---

## 🧮 Problem 4: Sum to N

**Location**: `src/problem4/`

### The Approach

When facing any problem—whether complex or simple—my first question is always:

> *"Can I reduce this problem to something simpler?"*

Instead of following conventional thinking patterns, I try to think broader to find more elegant and efficient solutions.

### The Solution

For this problem, the simplest approach is using **Gauss's Formula** from secondary school mathematics to calculate the sum of a sequence:

```text
sum = n × (n + 1) / 2
```

This transforms an O(n) iterative solution into an O(1) constant-time calculation.

### Quick Check

```bash
cd src/problem4
npm install
npm run start
```

📖 **Detailed documentation**: [`src/problem4/README.md`](src/problem4/README.md)

---

## 🔧 Problem 5: Token Price API

**Location**: `src/problem5/`

This is an open-ended problem. As a senior engineer, I understand that solving a problem isn't just about making it work. When building this solution, I focused on multiple production-grade aspects:

### Key Architectural Decisions

| Aspect                         | Implementation                                                              | Purpose                                 |
|--------------------------------|-----------------------------------------------------------------------------|-----------------------------------------|
| **Security**                   | Kong Gateway + Helmet + Zod validation + Rate limiting                      | Defense in depth at multiple layers     |
| **Performance**                | Connection pooling + Proper indexing + Pagination + Efficient batch upserts | Optimized data access and API responses |
| **Extendability**              | Layered architecture (Controller → Service → Repository) + DI pattern       | Clean separation of concerns            |
| **Availability & Scalability** | Health checks + Graceful shutdown + Stateless design + Fallback mechanism   | Production-ready resilience             |
| **Observability**              | Correlation ID tracing + Structured logging + Centralized error handling    | End-to-end request traceability         |
| **Testability**                | Unit tests + Integration tests (Testcontainers) + E2E API tests             | Comprehensive test coverage             |
| **Developer Experience**       | Docker Compose (one command) + Hot-reload + All-in-one script               | Minimal friction to get started         |

> **Note on Kubernetes**: Initially, I planned to use [Tilt](https://tilt.dev/) for local K8s development since production would run on Kubernetes. However, this would require reviewers to have Kubernetes running locally, creating unnecessary friction. Docker Compose provides a simpler, more accessible solution while still demonstrating the same architectural patterns.

**I know exactly what I'm doing.** When issues arise, I understand the root cause and know where to improve and which layer to fix. Instead of just making things work, I focus on understanding the fundamentals. To achieve this, I've continuously invested in learning—not just at the application layer, but at deeper levels:

- **Languages**: Deep understanding of JavaScript, Java, Python, C# and their underlying principles
- **Frameworks**: Knowing the strengths of different frameworks and applying them appropriately
- **Infrastructure**: I have some devops certifications like: `AWS`, `Harness`, `Kubernetes`, `Terraform`... certifications to gain a comprehensive view across the stack

This breadth of knowledge enables me to have a holistic perspective when developing solutions.

---

### 🔍 Deep Dive: Why Observability Matters

While all the criteria above are important, I'd like to highlight **Observability**, an aspect that's often overlooked or undervalued.

> People often think "the application has logs, that's enough." But imagine building a backend application serving tens of millions of users with hundreds of transactions per second. Suddenly, one request among those millions doesn't behave as expected. Moreover, in reality, the development team isn't the one supporting customers or monitoring the system.

Having proper rules and strategies for observability becomes invaluable in these situations.

#### Key Observability Patterns Implemented

**1. End-to-End Trace ID (Correlation ID)**

```text
┌──────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────────┐
│  Client  │───▶│ Kong Gateway│───▶│ Express API │───▶│ PostgreSQL │
└──────────┘    └─────────────┘    └─────────────┘    └────────────┘
                      │                   │
                      │ Generate          │ Extract & propagate
                      │ X-Correlation-ID  │ in all logs
                      ▼                   ▼
              ┌─────────────────────────────────────────────────────┐
              │ All logs contain: correlationId, method, path       │
              │ Response includes: X-Correlation-ID header          │
              └─────────────────────────────────────────────────────┘
```

Using `X-Correlation-ID` from the Kong layer as a context field in every log enables precise log querying in systems like Splunk or OpenSearch.

**2. Single Point of Error Logging**

In the codebase, each request's error is handled at **exactly ONE place** (the global error handler). Layers like Service, Repository, and Controller only throw errors, they don't log them. This ensures:

- **Consistency**: One error = One log entry
- **Clarity**: No duplicate error logs flooding the system
- **Traceability**: Every error includes the correlation ID
- **Clean stack traces**: Full context without noise

**3. Layer-Specific Error Classes**

```typescript
// Repository layer
throw new DataAccessError('Failed to fetch token price', { cause: dbError });

// Service layer  
throw new BusinessError('Currency not found', { currency, internalMessage: 'Price lookup failed' });
```

Clear error classification helps BAU/SRE teams quickly understand application behavior and identify the failure layer.

#### The Future: AI-Powered Debugging

When we have solid observability foundations, leveraging AI for system analysis becomes trivial. Imagine an LLM that can:

1. Query logs using correlation ID
2. Read error context and stack traces
3. Cross-reference with source code
4. **Identify root cause in seconds**

This is only possible when the logging infrastructure is consistent and well-structured.

---

### 🚀 Running Problem 5

I've prepared an **all-in-one script** that guides you through the entire process interactively.

#### Prerequisites

- **Docker Desktop** (with Docker Compose v2)
- **Node.js 20+**

#### Quick Start

```bash
cd src/problem5

# Install dependencies
npm install

# Interactive guide: unit tests → integration tests → dev environment → API tests
./scripts/run-all.sh
```

#### What the Script Does

The `run-all.sh` script provides an interactive experience:

| Step                     | Description                              | What It Tests                           |
|--------------------------|------------------------------------------|-----------------------------------------|
| **1. Unit Tests**        | Isolated tests with mocked dependencies  | Business logic, middleware, services    |
| **2. Integration Tests** | Uses Testcontainers (real PostgreSQL)    | Full API flow with real database        |
| **3. Dev Environment**   | Starts Docker Compose services           | PostgreSQL + Kong Gateway + Express App |
| **4. API Tests (E2E)**   | Tests against running environment        | All endpoints via Kong Gateway          |

Each step is **optional**—you can choose to run or skip any step.

#### Service Endpoints (After Step 3)

| Service        | URL                                   | Description                               |
|----------------|---------------------------------------|-------------------------------------------|
| API (via Kong) | `http://localhost:8000/api`           | Production-like access with rate limiting |
| API (Direct)   | `http://localhost:3000/api`           | Direct access for debugging               |
| Kong Admin     | `http://localhost:8001`               | Gateway administration                    |
| PostgreSQL     | `localhost:5432`                      | Database (user: postgres, pass: postgres) |

#### Manual Commands

```bash
# Start dev environment
npm run dev

# Stop services
npm run dev:down

# View logs
npm run dev:logs

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

📖 **Detailed documentation**: [`src/problem5/README.md`](src/problem5/README.md)  
📋 **Implementation plan**: [`plans/260110-problem5-expressjs-crud-backend.md`](plans/260110-problem5-expressjs-crud-backend.md)

---

## 🏆 Problem 6: Scoreboard Module

**Location**: `src/problem6/`

This problem involves designing a real-time scoreboard system with significant architectural considerations. Rather than just providing a simple solution, I've documented a comprehensive analysis including:

### Key Topics Covered

| Topic                                        | Description                                                       |
|----------------------------------------------|-------------------------------------------------------------------|
| **Critical Security Analysis**               | Why client-initiated score updates are fundamentally problematic  |
| **Server-Authoritative vs Client-Initiated** | Architectural trade-offs with detailed diagrams                   |
| **System Architecture**                      | Multi-instance design with Redis Pub/Sub for horizontal scaling   |
| **API Specification**                        | REST + WebSocket endpoints with full request/response schemas     |
| **Data Model**                               | PostgreSQL schema + Redis data structures (Sorted Sets, Hash)     |
| **Security Design**                          | Server-issued score tokens, anti-cheat mechanisms, rate limiting  |
| **Execution Flow Diagrams**                  | Step-by-step request flows with ASCII diagrams                    |
| **Expert Recommendations**                   | Prioritized improvements for production systems                   |

### Architectural Highlight

The specification explicitly acknowledges the inherent security weakness of client-initiated score updates (as per requirements) while implementing **defense-in-depth** strategies:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    DEFENSE LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│  Authentication     │ JWT tokens for user identity              │
│  Authorization      │ Server-issued score tokens (single-use)   │
│  Validation         │ Server validates action before scoring    │
│  Rate Limiting      │ Multi-layer throttling (IP, user, action) │
│  Audit Trail        │ All score changes logged with context     │
│  Real-time Updates  │ WebSocket + Redis Pub/Sub                 │
└─────────────────────────────────────────────────────────────────┘
```

📖 **Full specification**: [`src/problem6/README.md`](src/problem6/README.md)  
📋 **Implementation plan**: [`plans/260111-problem6-scoreboard-module.md`](plans/260111-problem6-scoreboard-module.md)

---

## 📚 Quick Reference

### Repository Structure

```text
code-challenge/
├── README.md                 # This file
├── plans/                    # Detailed implementation plans
│   ├── 260110-problem5-*.md  # Problem 5 plan
│   └── 260111-problem6-*.md  # Problem 6 plan
└── src/
    ├── problem4/             # Sum to N (TypeScript)
    ├── problem5/             # Token Price API (Express + Prisma + Kong)
    └── problem6/             # Scoreboard Module (Specification)
```

### Quick Commands

| Problem     | Directory      | Command                                      |
|-------------|----------------|----------------------------------------------|
| Problem 4   | `src/problem4` | `npm install && npm run start`               |
| Problem 5   | `src/problem5` | `npm install && ./scripts/run-all.sh`        |
| Problem 6   | `src/problem6` | Read [`README.md`](src/problem6/README.md)   |

---

## 🙏 Final Thoughts

There's much more I'd love to discuss—from architectural patterns to infrastructure decisions, from testing strategies to monitoring approaches. However, to keep this document focused and respect your time, I've tried to highlight the most important aspects while providing detailed documentation in the respective folders.

Thank you for taking the time to review my work. I look forward to any feedback or questions you might have!

---

**Kai | 2026**
