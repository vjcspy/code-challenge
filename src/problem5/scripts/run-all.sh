#!/bin/bash

###############################################################################
# All-in-One Development Script
# 
# This script guides you through:
# 1. Running unit tests
# 2. Running integration tests
# 3. Starting local dev environment (Docker Compose)
# 4. Running API tests against the running environment
#
# Each step is interactive - you can choose to run or skip.
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_skip() {
    echo -e "${YELLOW}⏭️  Skipped: $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Ask user yes/no question
# Returns 0 for yes, 1 for no
ask_user() {
    local prompt="$1"
    local default="${2:-y}"
    
    if [[ "$default" == "y" ]]; then
        prompt="$prompt [Y/n]: "
    else
        prompt="$prompt [y/N]: "
    fi
    
    echo -e -n "${BOLD}${prompt}${NC}"
    read -r response
    
    # Default handling
    if [[ -z "$response" ]]; then
        response="$default"
    fi
    
    case "$response" in
        [yY]|[yY][eE][sS]) return 0 ;;
        *) return 1 ;;
    esac
}

# Check if command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    fi
    return 0
}

# Wait for service to be ready
wait_for_service() {
    local url="$1"
    local name="$2"
    local max_attempts="${3:-30}"
    local attempt=1
    
    echo -n "  Waiting for $name"
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e " ${GREEN}ready!${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    echo -e " ${RED}timeout!${NC}"
    return 1
}

###############################################################################
# Main Script
###############################################################################

clear
echo ""
echo -e "${BOLD}${CYAN}"
echo "  ╔══════════════════════════════════════════════════════════════╗"
echo "  ║                                                              ║"
echo "  ║          🚀 Token Price API - Development Runner             ║"
echo "  ║                                                              ║"
echo "  ║   This script will guide you through:                        ║"
echo "  ║   1. Unit Tests                                              ║"
echo "  ║   2. Integration Tests                                       ║"
echo "  ║   3. Start Dev Environment (Docker Compose)                  ║"
echo "  ║   4. API Tests (E2E)                                         ║"
echo "  ║                                                              ║"
echo "  ╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check prerequisites
print_header "🔍 Checking Prerequisites"

PREREQ_OK=true

print_step "Checking Docker..."
if check_command docker; then
    if docker info > /dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f 3 | tr -d ',')
        print_success "Docker $DOCKER_VERSION is running"
    else
        print_error "Docker daemon is not running. Please start Docker Desktop."
        PREREQ_OK=false
    fi
else
    PREREQ_OK=false
fi

print_step "Checking Docker Compose..."
if docker compose version > /dev/null 2>&1; then
    COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || docker compose version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    print_success "Docker Compose $COMPOSE_VERSION"
else
    print_error "Docker Compose is not installed or not available."
    print_info "Docker Compose v2 is required. It comes with Docker Desktop."
    print_info "If using Linux, install docker-compose-plugin: https://docs.docker.com/compose/install/"
    PREREQ_OK=false
fi

print_step "Checking Node.js..."
if check_command node; then
    NODE_VERSION=$(node -v)
    print_success "Node.js $NODE_VERSION"
else
    PREREQ_OK=false
fi

print_step "Checking npm..."
if check_command npm; then
    NPM_VERSION=$(npm -v)
    print_success "npm $NPM_VERSION"
else
    PREREQ_OK=false
fi

if [[ "$PREREQ_OK" == "false" ]]; then
    echo ""
    print_error "Prerequisites check failed. Please fix the issues above."
    exit 1
fi

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    echo ""
    print_info "node_modules not found. Installing dependencies..."
    npm ci
fi

###############################################################################
# Step 1: Unit Tests
###############################################################################

print_header "📋 Step 1/4: Unit Tests"

echo -e "${CYAN}Unit tests run in isolation with mocked dependencies."
echo -e "They test individual functions and modules without external services.${NC}"
echo ""

if ask_user "Run unit tests?"; then
    print_step "Running unit tests..."
    echo ""
    
    if npm run test:unit -- --passWithNoTests 2>&1; then
        print_success "Unit tests passed!"
    else
        print_error "Unit tests failed!"
        if ! ask_user "Continue anyway?" "n"; then
            exit 1
        fi
    fi
else
    print_skip "Unit tests"
fi

###############################################################################
# Step 2: Integration Tests
###############################################################################

print_header "🔗 Step 2/4: Integration Tests"

echo -e "${CYAN}Integration tests use Testcontainers to spin up real PostgreSQL."
echo -e "They test the full application stack with real database operations."
echo -e ""
echo -e "⚠️  Note: This requires Docker and may take a few minutes.${NC}"
echo ""

if ask_user "Run integration tests?"; then
    print_step "Running integration tests with Testcontainers..."
    echo ""
    
    if npm run test:integration -- --passWithNoTests 2>&1; then
        print_success "Integration tests passed!"
    else
        print_error "Integration tests failed!"
        if ! ask_user "Continue anyway?" "n"; then
            exit 1
        fi
    fi
else
    print_skip "Integration tests"
fi

###############################################################################
# Step 3: Start Dev Environment
###############################################################################

print_header "🐳 Step 3/4: Start Dev Environment"

echo -e "${CYAN}This will start the following services using Docker Compose:"
echo -e "  • PostgreSQL (database)"
echo -e "  • Kong Gateway (API gateway with rate limiting, CORS, correlation ID)"
echo -e "  • Token Price App (Express.js backend with hot-reload)"
echo -e ""
echo -e "Ports:"
echo -e "  • http://localhost:8000 - API via Kong Gateway"
echo -e "  • http://localhost:3000 - API direct (bypass Kong)"
echo -e "  • http://localhost:8001 - Kong Admin API"
echo -e "  • localhost:5432 - PostgreSQL${NC}"
echo ""

# Check if services are already running
SERVICES_RUNNING=false
if docker compose ps 2>/dev/null | grep -q "token-price"; then
    print_info "Docker Compose services appear to be already running."
    SERVICES_RUNNING=true
    
    if ask_user "Restart services?" "n"; then
        print_step "Stopping existing services..."
        docker compose down
        SERVICES_RUNNING=false
    fi
fi

if [[ "$SERVICES_RUNNING" == "false" ]]; then
    if ask_user "Start dev environment with Docker Compose?"; then
        print_step "Starting Docker Compose services..."
        echo ""
        
        # Start in detached mode
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
        
        echo ""
        print_step "Waiting for services to be ready..."
        
        # Wait for services
        wait_for_service "http://localhost:3000/health" "App" 60
        wait_for_service "http://localhost:8000/health" "Kong Gateway" 30
        
        echo ""
        print_success "Dev environment is ready!"
        
        echo ""
        echo -e "${CYAN}📊 Service Status:${NC}"
        docker compose ps
        echo ""
    else
        print_skip "Dev environment startup"
        
        # Check if we can continue with step 4
        if ! curl -s "http://localhost:3000/health" > /dev/null 2>&1; then
            print_info "No running services detected. Step 4 (API tests) may fail."
        fi
    fi
else
    print_info "Using existing running services."
fi

###############################################################################
# Step 4: API Tests (E2E)
###############################################################################

print_header "🧪 Step 4/4: API Tests (E2E)"

echo -e "${CYAN}This will run comprehensive API tests against the running environment:"
echo -e "  • Health check endpoints (liveness & readiness)"
echo -e "  • List token prices with filters and pagination"
echo -e "  • Get token price by currency"
echo -e "  • Exchange rate calculation"
echo -e "  • CRUD operations (create, update, delete)"
echo -e "  • Correlation ID header verification"
echo -e "  • Error handling (404, validation errors)"
echo -e ""
echo -e "The tests will run against Kong Gateway (http://localhost:8000).${NC}"
echo ""

if ask_user "Run API tests?"; then
    # First check if services are available
    if ! curl -s "http://localhost:8000/health" > /dev/null 2>&1; then
        print_error "Kong Gateway is not responding at http://localhost:8000"
        print_info "Make sure the dev environment is running (Step 3)"
        
        if ask_user "Try running against direct API (localhost:3000)?" "y"; then
            export API_BASE_URL="http://localhost:3000"
        else
            print_skip "API tests"
            exit 0
        fi
    fi
    
    print_step "Running API tests..."
    echo ""
    echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
    
    # Run the test script
    if ./scripts/test.sh; then
        echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
        echo ""
        print_success "All API tests passed!"
    else
        echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
        echo ""
        print_error "Some API tests failed!"
    fi
else
    print_skip "API tests"
fi

###############################################################################
# Summary
###############################################################################

print_header "📊 Summary"

echo -e "${CYAN}Development environment status:${NC}"
echo ""

if docker compose ps 2>/dev/null | grep -q "token-price"; then
    echo -e "${GREEN}✅ Services are running${NC}"
    echo ""
    echo -e "   ${BOLD}API Endpoints:${NC}"
    echo -e "   • API (via Kong):  ${CYAN}http://localhost:8000/api${NC}"
    echo -e "   • API (direct):    ${CYAN}http://localhost:3000/api${NC}"
    echo -e "   • Kong Admin:      ${CYAN}http://localhost:8001${NC}"
    echo ""
    echo -e "   ${BOLD}Useful Commands:${NC}"
    echo -e "   • View logs:       ${YELLOW}npm run dev:logs${NC}"
    echo -e "   • Stop services:   ${YELLOW}npm run dev:down${NC}"
    echo -e "   • Run API tests:   ${YELLOW}npm run test:e2e${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  Services are not running${NC}"
    echo ""
    echo -e "   To start: ${YELLOW}npm run dev${NC}"
fi

echo ""
echo -e "${BOLD}${GREEN}🎉 Done!${NC}"
echo ""

