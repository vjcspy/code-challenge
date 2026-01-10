#!/bin/bash
# =============================================================================
# Wait for PostgreSQL to be ready
# Used in Kubernetes init containers
# =============================================================================

set -e

HOST="${POSTGRES_HOST:-postgres}"
PORT="${POSTGRES_PORT:-5432}"
USER="${POSTGRES_USER:-postgres}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_INTERVAL="${RETRY_INTERVAL:-2}"

echo "Waiting for PostgreSQL at $HOST:$PORT..."

retries=0
until pg_isready -h "$HOST" -p "$PORT" -U "$USER" > /dev/null 2>&1; do
    retries=$((retries + 1))
    
    if [ $retries -ge $MAX_RETRIES ]; then
        echo "Error: PostgreSQL did not become ready in time"
        exit 1
    fi
    
    echo "PostgreSQL is not ready yet... (attempt $retries/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
done

echo "PostgreSQL is ready!"

