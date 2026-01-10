#!/bin/bash
# =============================================================================
# Token Price API - Development Setup Script
# 
# This script:
# 1. Checks and installs Tilt if not present
# 2. Verifies Docker and Kubernetes are running
# 3. Starts the Tilt development environment
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_status() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Header
echo ""
echo "=========================================="
echo "  Token Price API - Development Setup"
echo "=========================================="
echo ""

# -----------------------------------------------------------------------------
# Check Docker
# -----------------------------------------------------------------------------
print_status "Checking Docker..."

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

# -----------------------------------------------------------------------------
# Check Kubernetes
# -----------------------------------------------------------------------------
print_status "Checking Kubernetes..."

if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed."
    echo "Please enable Kubernetes in Docker Desktop settings."
    exit 1
fi

if ! kubectl cluster-info &> /dev/null; then
    print_error "Kubernetes cluster is not accessible."
    echo "Please enable Kubernetes in Docker Desktop settings and wait for it to start."
    exit 1
fi

print_success "Kubernetes is running"

# -----------------------------------------------------------------------------
# Check/Install Tilt
# -----------------------------------------------------------------------------
print_status "Checking Tilt..."

if ! command -v tilt &> /dev/null; then
    print_warning "Tilt is not installed. Installing..."
    
    # Detect OS
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    
    if [ "$OS" = "darwin" ]; then
        # macOS - use Homebrew if available
        if command -v brew &> /dev/null; then
            brew install tilt-dev/tap/tilt
        else
            curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash
        fi
    elif [ "$OS" = "linux" ]; then
        # Linux
        curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash
    else
        print_error "Unsupported OS: $OS"
        echo "Please install Tilt manually from: https://docs.tilt.dev/install.html"
        exit 1
    fi
    
    print_success "Tilt installed successfully"
else
    print_success "Tilt is already installed ($(tilt version 2>/dev/null | head -n1))"
fi

# -----------------------------------------------------------------------------
# Change to script directory
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"
print_status "Working directory: $PROJECT_DIR"

# -----------------------------------------------------------------------------
# Install npm dependencies (if needed)
# -----------------------------------------------------------------------------
if [ ! -d "node_modules" ]; then
    print_status "Installing npm dependencies..."
    npm install
    print_success "Dependencies installed"
fi

# -----------------------------------------------------------------------------
# Start Tilt
# -----------------------------------------------------------------------------
echo ""
print_status "Starting Tilt development environment..."
echo ""
echo "=========================================="
echo "  Press Ctrl+C to stop"
echo "=========================================="
echo ""

tilt up

