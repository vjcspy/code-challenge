#!/bin/bash
# =============================================================================
# Token Price API - Integration Test Script
# 
# Simulates frontend behavior:
# 1. Health check
# 2. List all token prices
# 3. Get specific currency price
# 4. Calculate exchange rate
# 5. Create new token price
# 6. Update token price
# 7. Delete token price
# =============================================================================

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
KONG_URL="${KONG_URL:-http://localhost:8000}"
CLIENT_ID="frontend-swap-app"

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
}

print_test() {
    echo -e "\n${CYAN}▶ TEST: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
}

print_error() {
    echo -e "${RED}✗ FAIL: $1${NC}"
}

print_response() {
    echo -e "${YELLOW}Response:${NC}"
    echo "$1" | jq '.' 2>/dev/null || echo "$1"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Warning: jq is not installed. JSON output will not be formatted."
fi

# Determine which URL to use (direct or Kong)
if curl -s "$KONG_URL/health" > /dev/null 2>&1; then
    BASE_URL="$KONG_URL"
    echo -e "${GREEN}Using Kong Gateway: $KONG_URL${NC}"
    USE_KONG=true
else
    BASE_URL="$API_BASE_URL"
    echo -e "${YELLOW}Kong not available, using direct API: $API_BASE_URL${NC}"
    USE_KONG=false
fi

# Headers for Kong authentication
if [ "$USE_KONG" = true ]; then
    AUTH_HEADERS="-H 'X-Client-ID: $CLIENT_ID' -H 'X-Scope: token-price-api'"
else
    AUTH_HEADERS=""
fi

print_header "Token Price API - Integration Tests"

# =============================================================================
# Test 1: Health Check
# =============================================================================
print_test "Health Check - Liveness Probe"

RESPONSE=$(curl -s "$BASE_URL/health")
CORRELATION_ID=$(curl -sI "$BASE_URL/health" | grep -i "x-correlation-id" | cut -d' ' -f2 | tr -d '\r')

if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    print_success "Liveness probe returned OK"
    print_response "$RESPONSE"
    if [ -n "$CORRELATION_ID" ]; then
        echo -e "${CYAN}Correlation-ID: $CORRELATION_ID${NC}"
    fi
else
    print_error "Liveness probe failed"
    print_response "$RESPONSE"
    exit 1
fi

# =============================================================================
# Test 2: Health Check - Readiness
# =============================================================================
print_test "Health Check - Readiness Probe"

RESPONSE=$(curl -s "$BASE_URL/health/ready")

if echo "$RESPONSE" | grep -q '"database":"connected"'; then
    print_success "Readiness probe - Database connected"
    print_response "$RESPONSE"
else
    print_error "Readiness probe failed"
    print_response "$RESPONSE"
    exit 1
fi

# =============================================================================
# Test 3: List All Token Prices
# =============================================================================
print_test "List All Token Prices (GET /api/token-prices)"

if [ "$USE_KONG" = true ]; then
    RESPONSE=$(curl -s "$BASE_URL/api/token-prices" \
        -H "X-Client-ID: $CLIENT_ID" \
        -H "X-Scope: token-price-api")
else
    RESPONSE=$(curl -s "$BASE_URL/api/token-prices")
fi

TOTAL=$(echo "$RESPONSE" | jq '.pagination.total' 2>/dev/null)

if [ -n "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
    print_success "Listed $TOTAL token prices"
    echo -e "${YELLOW}First 3 items:${NC}"
    echo "$RESPONSE" | jq '.data[:3]' 2>/dev/null || echo "$RESPONSE"
else
    print_error "No token prices returned"
    print_response "$RESPONSE"
fi

# =============================================================================
# Test 4: List with Pagination
# =============================================================================
print_test "List with Pagination (page=1, limit=5)"

if [ "$USE_KONG" = true ]; then
    RESPONSE=$(curl -s "$BASE_URL/api/token-prices?page=1&limit=5" \
        -H "X-Client-ID: $CLIENT_ID" \
        -H "X-Scope: token-price-api")
else
    RESPONSE=$(curl -s "$BASE_URL/api/token-prices?page=1&limit=5")
fi

PAGE_SIZE=$(echo "$RESPONSE" | jq '.data | length' 2>/dev/null)

if [ "$PAGE_SIZE" = "5" ]; then
    print_success "Pagination working - returned 5 items"
    echo "$RESPONSE" | jq '.pagination' 2>/dev/null
else
    print_error "Pagination issue - expected 5 items, got $PAGE_SIZE"
fi

# =============================================================================
# Test 5: Filter by Currency
# =============================================================================
print_test "Filter by Currency (currency=ETH)"

if [ "$USE_KONG" = true ]; then
    RESPONSE=$(curl -s "$BASE_URL/api/token-prices?currency=ETH" \
        -H "X-Client-ID: $CLIENT_ID" \
        -H "X-Scope: token-price-api")
else
    RESPONSE=$(curl -s "$BASE_URL/api/token-prices?currency=ETH")
fi

CURRENCY=$(echo "$RESPONSE" | jq -r '.data[0].currency' 2>/dev/null)

if [ "$CURRENCY" = "ETH" ]; then
    print_success "Filter working - found ETH"
    print_response "$RESPONSE"
else
    print_error "Filter issue - expected ETH"
    print_response "$RESPONSE"
fi

# =============================================================================
# Test 6: Get Token Price by Currency
# =============================================================================
print_test "Get Token Price by Currency (GET /api/token-prices/ETH)"

if [ "$USE_KONG" = true ]; then
    RESPONSE=$(curl -s "$BASE_URL/api/token-prices/ETH" \
        -H "X-Client-ID: $CLIENT_ID" \
        -H "X-Scope: token-price-api")
else
    RESPONSE=$(curl -s "$BASE_URL/api/token-prices/ETH")
fi

ETH_PRICE=$(echo "$RESPONSE" | jq -r '.price' 2>/dev/null)

if [ -n "$ETH_PRICE" ] && [ "$ETH_PRICE" != "null" ]; then
    print_success "Got ETH price: $ETH_PRICE"
    print_response "$RESPONSE"
else
    print_error "Failed to get ETH price"
    print_response "$RESPONSE"
fi

# =============================================================================
# Test 7: Calculate Exchange Rate (Frontend Swap Feature)
# =============================================================================
print_test "Calculate Exchange Rate - ETH to USDC (Frontend Swap)"

if [ "$USE_KONG" = true ]; then
    RESPONSE=$(curl -s "$BASE_URL/api/exchange-rate?from=ETH&to=USDC&amount=1.5" \
        -H "X-Client-ID: $CLIENT_ID" \
        -H "X-Scope: token-price-api")
else
    RESPONSE=$(curl -s "$BASE_URL/api/exchange-rate?from=ETH&to=USDC&amount=1.5")
fi

RESULT=$(echo "$RESPONSE" | jq -r '.result' 2>/dev/null)

if [ -n "$RESULT" ] && [ "$RESULT" != "null" ]; then
    FROM=$(echo "$RESPONSE" | jq -r '.from')
    TO=$(echo "$RESPONSE" | jq -r '.to')
    AMOUNT=$(echo "$RESPONSE" | jq -r '.amount')
    RATE=$(echo "$RESPONSE" | jq -r '.rate')
    print_success "Exchange rate calculated!"
    echo -e "  ${CYAN}$AMOUNT $FROM = $RESULT $TO${NC}"
    echo -e "  ${CYAN}Rate: 1 $FROM = $RATE $TO${NC}"
    print_response "$RESPONSE"
else
    print_error "Failed to calculate exchange rate"
    print_response "$RESPONSE"
fi

# =============================================================================
# Test 8: Calculate Exchange Rate - BTC to ETH
# =============================================================================
print_test "Calculate Exchange Rate - WBTC to ETH"

if [ "$USE_KONG" = true ]; then
    RESPONSE=$(curl -s "$BASE_URL/api/exchange-rate?from=WBTC&to=ETH&amount=0.1" \
        -H "X-Client-ID: $CLIENT_ID" \
        -H "X-Scope: token-price-api")
else
    RESPONSE=$(curl -s "$BASE_URL/api/exchange-rate?from=WBTC&to=ETH&amount=0.1")
fi

RESULT=$(echo "$RESPONSE" | jq -r '.result' 2>/dev/null)

if [ -n "$RESULT" ] && [ "$RESULT" != "null" ]; then
    print_success "0.1 WBTC = $RESULT ETH"
else
    print_error "Failed to calculate WBTC to ETH rate"
    print_response "$RESPONSE"
fi

# =============================================================================
# Test 9: Create New Token Price
# =============================================================================
print_test "Create New Token Price (POST /api/token-prices)"

if [ "$USE_KONG" = true ]; then
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/token-prices" \
        -H "Content-Type: application/json" \
        -H "X-Client-ID: $CLIENT_ID" \
        -H "X-Scope: token-price-api" \
        -d '{"currency": "TESTCOIN", "price": 123.456}')
else
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/token-prices" \
        -H "Content-Type: application/json" \
        -d '{"currency": "TESTCOIN", "price": 123.456}')
fi

CREATED_ID=$(echo "$RESPONSE" | jq -r '.id' 2>/dev/null)
CREATED_CURRENCY=$(echo "$RESPONSE" | jq -r '.currency' 2>/dev/null)

if [ -n "$CREATED_ID" ] && [ "$CREATED_ID" != "null" ]; then
    print_success "Created TESTCOIN with ID: $CREATED_ID"
    print_response "$RESPONSE"
else
    # Might already exist from previous test run
    if echo "$RESPONSE" | grep -q "already exists"; then
        print_success "TESTCOIN already exists (from previous test)"
        # Get existing ID for update/delete tests
        if [ "$USE_KONG" = true ]; then
            EXISTING=$(curl -s "$BASE_URL/api/token-prices/TESTCOIN" \
                -H "X-Client-ID: $CLIENT_ID" \
                -H "X-Scope: token-price-api")
        else
            EXISTING=$(curl -s "$BASE_URL/api/token-prices/TESTCOIN")
        fi
        CREATED_ID=$(echo "$EXISTING" | jq -r '.id' 2>/dev/null)
    else
        print_error "Failed to create token price"
        print_response "$RESPONSE"
    fi
fi

# =============================================================================
# Test 10: Update Token Price
# =============================================================================
if [ -n "$CREATED_ID" ] && [ "$CREATED_ID" != "null" ]; then
    print_test "Update Token Price (PUT /api/token-prices/$CREATED_ID)"

    if [ "$USE_KONG" = true ]; then
        RESPONSE=$(curl -s -X PUT "$BASE_URL/api/token-prices/$CREATED_ID" \
            -H "Content-Type: application/json" \
            -H "X-Client-ID: $CLIENT_ID" \
            -H "X-Scope: token-price-api" \
            -d '{"price": 999.999}')
    else
        RESPONSE=$(curl -s -X PUT "$BASE_URL/api/token-prices/$CREATED_ID" \
            -H "Content-Type: application/json" \
            -d '{"price": 999.999}')
    fi

    UPDATED_PRICE=$(echo "$RESPONSE" | jq -r '.price' 2>/dev/null)

    if echo "$UPDATED_PRICE" | grep -q "999"; then
        print_success "Updated price to $UPDATED_PRICE"
        print_response "$RESPONSE"
    else
        print_error "Failed to update token price"
        print_response "$RESPONSE"
    fi
fi

# =============================================================================
# Test 11: Delete Token Price
# =============================================================================
if [ -n "$CREATED_ID" ] && [ "$CREATED_ID" != "null" ]; then
    print_test "Delete Token Price (DELETE /api/token-prices/$CREATED_ID)"

    if [ "$USE_KONG" = true ]; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/token-prices/$CREATED_ID" \
            -H "X-Client-ID: $CLIENT_ID" \
            -H "X-Scope: token-price-api")
    else
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/token-prices/$CREATED_ID")
    fi

    if [ "$HTTP_CODE" = "204" ]; then
        print_success "Deleted token price (HTTP 204)"
    else
        print_error "Failed to delete - HTTP $HTTP_CODE"
    fi
fi

# =============================================================================
# Test 12: Verify Correlation ID in Response Headers
# =============================================================================
print_test "Verify Correlation ID Header"

HEADERS=$(curl -sI "$BASE_URL/api/token-prices?limit=1")
CORRELATION_ID=$(echo "$HEADERS" | grep -i "x-correlation-id" | cut -d' ' -f2 | tr -d '\r')

if [ -n "$CORRELATION_ID" ]; then
    print_success "Correlation ID present in response: $CORRELATION_ID"
else
    print_error "Correlation ID header missing"
fi

# =============================================================================
# Test 13: Error Handling - Not Found
# =============================================================================
print_test "Error Handling - Currency Not Found"

if [ "$USE_KONG" = true ]; then
    RESPONSE=$(curl -s "$BASE_URL/api/token-prices/NOTEXIST" \
        -H "X-Client-ID: $CLIENT_ID" \
        -H "X-Scope: token-price-api")
else
    RESPONSE=$(curl -s "$BASE_URL/api/token-prices/NOTEXIST")
fi

if echo "$RESPONSE" | grep -q "not found"; then
    print_success "Proper error handling for non-existent currency"
    print_response "$RESPONSE"
else
    print_error "Unexpected response for non-existent currency"
    print_response "$RESPONSE"
fi

# =============================================================================
# Test 14: Error Handling - Invalid Input
# =============================================================================
print_test "Error Handling - Invalid Input (negative price)"

if [ "$USE_KONG" = true ]; then
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/token-prices" \
        -H "Content-Type: application/json" \
        -H "X-Client-ID: $CLIENT_ID" \
        -H "X-Scope: token-price-api" \
        -d '{"currency": "BAD", "price": -100}')
else
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/token-prices" \
        -H "Content-Type: application/json" \
        -d '{"currency": "BAD", "price": -100}')
fi

if echo "$RESPONSE" | grep -qi "validation\|positive\|error"; then
    print_success "Proper validation error for negative price"
    print_response "$RESPONSE"
else
    print_error "Missing validation for negative price"
    print_response "$RESPONSE"
fi

# =============================================================================
# Summary
# =============================================================================
print_header "Test Summary"
echo -e "${GREEN}All tests completed!${NC}"
echo ""
echo "API Base URL: $BASE_URL"
echo "Kong Gateway: $([ "$USE_KONG" = true ] && echo "Enabled" || echo "Not used")"
echo ""
echo -e "${CYAN}Available Endpoints:${NC}"
echo "  GET    /health                    - Liveness probe"
echo "  GET    /health/ready              - Readiness probe"
echo "  GET    /api/token-prices          - List all prices"
echo "  GET    /api/token-prices/:currency - Get by currency"
echo "  POST   /api/token-prices          - Create price"
echo "  PUT    /api/token-prices/:id      - Update price"
echo "  DELETE /api/token-prices/:id      - Delete price"
echo "  GET    /api/exchange-rate         - Calculate exchange rate"
echo ""

