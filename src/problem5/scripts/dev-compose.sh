#!/bin/bash
# =============================================================================
# Token Price API - Docker Compose Development Script
# 
# This script starts the development environment using Docker Compose.
# No Kubernetes required!
# 
# Usage:
#   ./scripts/dev-compose.sh           # Start all services
#   ./scripts/dev-compose.sh up --build # Start with rebuild
#   ./scripts/dev-compose.sh build     # Build images only
#   ./scripts/dev-compose.sh down      # Stop all services
#   ./scripts/dev-compose.sh logs      # View logs
#   ./scripts/dev-compose.sh clean     # Remove all containers and volumes
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

print_status() {
    echo -e "${CYAN}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Change to project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Check Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed."
        echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running."
        echo "Please start Docker Desktop and try again."
        exit 1
    fi

    print_success "Docker is running"
}

# Main command handler
case "${1:-up}" in
    up|start)
        # Check for --build flag
        BUILD_FLAG=""
        if [[ "$2" == "--build" || "$2" == "-b" ]]; then
            BUILD_FLAG="--build"
        fi
        
        print_header "Token Price API - Starting Dev Environment"
        
        check_docker
        
        # Check if containers are already running
        if docker compose ps -q 2>/dev/null | grep -q .; then
            print_status "Stopping existing containers..."
            docker compose down
            print_success "Existing containers stopped"
        fi
        
        # Check if port 3000 is in use (e.g., by dev:local)
        if lsof -i :3000 -t &>/dev/null; then
            print_status "Port 3000 is in use, killing process..."
            lsof -i :3000 -t | xargs kill -9 2>/dev/null || true
            sleep 1
            print_success "Port 3000 freed"
        fi
        
        # Check if port 8000 is in use
        if lsof -i :8000 -t &>/dev/null; then
            print_status "Port 8000 is in use, killing process..."
            lsof -i :8000 -t | xargs kill -9 2>/dev/null || true
            sleep 1
            print_success "Port 8000 freed"
        fi
        
        if [ -n "$BUILD_FLAG" ]; then
            print_status "Building and starting containers..."
        else
            print_status "Starting containers..."
        fi
        docker compose up -d $BUILD_FLAG
        
        print_status "Waiting for services to be healthy..."
        
        # Wait for services
        RETRIES=30
        while [ $RETRIES -gt 0 ]; do
            if curl -s http://localhost:3000/health > /dev/null 2>&1; then
                break
            fi
            echo -n "."
            sleep 2
            RETRIES=$((RETRIES - 1))
        done
        echo ""
        
        if [ $RETRIES -eq 0 ]; then
            print_error "Services did not become healthy in time"
            echo "Check logs with: npm run dev:logs"
            exit 1
        fi
        
        print_success "All services are running!"
        echo ""
        echo -e "${GREEN}============================================${NC}"
        echo -e "${GREEN} Development Environment Ready!${NC}"
        echo -e "${GREEN}============================================${NC}"
        echo ""
        echo -e "  ${CYAN}API (via Kong):${NC}  http://localhost:8000/api"
        echo -e "  ${CYAN}API (Direct):${NC}    http://localhost:3000/api"
        echo -e "  ${CYAN}Kong Admin:${NC}      http://localhost:8001"
        echo -e "  ${CYAN}PostgreSQL:${NC}      localhost:5432"
        echo ""
        echo -e "  ${YELLOW}Commands:${NC}"
        echo -e "    npm run dev:logs   - View logs"
        echo -e "    npm run dev:down   - Stop services"
        echo -e "    npm run test:e2e   - Run API tests"
        echo ""
        
        # Show logs
        print_status "Showing logs (Ctrl+C to exit, services keep running)..."
        docker compose logs -f app
        ;;
        
    build)
        print_header "Building Docker Images"
        check_docker
        print_status "Building images..."
        docker compose build
        print_success "Images built successfully"
        ;;
        
    down|stop)
        print_header "Stopping Dev Environment"
        docker compose down
        print_success "All services stopped"
        ;;
        
    logs)
        docker compose logs -f "${2:-app}"
        ;;
        
    restart)
        print_header "Restarting Dev Environment"
        docker compose restart
        print_success "Services restarted"
        ;;
        
    clean)
        print_header "Cleaning Dev Environment"
        print_status "Stopping and removing containers, networks, and volumes..."
        docker compose down -v --remove-orphans
        print_success "Environment cleaned"
        ;;
        
    status)
        print_header "Dev Environment Status"
        docker compose ps
        ;;
        
    shell)
        print_status "Opening shell in app container..."
        docker compose exec app sh
        ;;
        
    prisma)
        print_status "Running Prisma command..."
        shift
        docker compose exec app npx prisma "$@"
        ;;
        
    *)
        echo "Usage: $0 {up|build|down|logs|restart|clean|status|shell|prisma}"
        echo ""
        echo "Commands:"
        echo "  up, start     - Start all services (use --build to rebuild)"
        echo "  build         - Build images only"
        echo "  down, stop    - Stop all services"
        echo "  logs          - View logs (optionally specify service: logs kong)"
        echo "  restart       - Restart all services"
        echo "  clean         - Remove all containers and volumes"
        echo "  status        - Show container status"
        echo "  shell         - Open shell in app container"
        echo "  prisma        - Run prisma commands (e.g., prisma studio)"
        exit 1
        ;;
esac

