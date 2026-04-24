#!/bin/bash

# ============================================================
# AI Disaster Response Coordinator - Startup Script
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     AI Disaster Response Coordinator                    ║"
echo "║     Emergency Management Platform                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
  echo -e "${RED}✗ .env file not found! Please create one.${NC}"
  exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Function to clean up on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
  fi
  if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  # Kill any remaining processes on our ports
  lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
  lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
  echo -e "${GREEN}✓ All services stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ============================================================
# Step 1: Clean used ports
# ============================================================
echo -e "\n${YELLOW}[1/6] Cleaning used ports...${NC}"
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null && echo -e "  Killed process on port $BACKEND_PORT" || echo -e "  Port $BACKEND_PORT is free"
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null && echo -e "  Killed process on port $FRONTEND_PORT" || echo -e "  Port $FRONTEND_PORT is free"
echo -e "${GREEN}✓ Ports cleaned${NC}"

# ============================================================
# Step 2: Check PostgreSQL
# ============================================================
echo -e "\n${YELLOW}[2/6] Checking PostgreSQL...${NC}"
if command -v pg_isready &> /dev/null; then
  if pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
  else
    echo -e "${YELLOW}  Starting PostgreSQL...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      brew services start postgresql 2>/dev/null || brew services start postgresql@14 2>/dev/null || brew services start postgresql@15 2>/dev/null || true
    else
      sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || true
    fi
    sleep 2
    echo -e "${GREEN}✓ PostgreSQL started${NC}"
  fi
else
  echo -e "${YELLOW}  pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# Create database if it doesn't exist
echo -e "  Creating database '${DB_NAME:-disaster_response}' if not exists..."
createdb -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} ${DB_NAME:-disaster_response} 2>/dev/null || echo -e "  Database already exists"
echo -e "${GREEN}✓ Database ready${NC}"

# ============================================================
# Step 3: Install dependencies
# ============================================================
echo -e "\n${YELLOW}[3/6] Installing dependencies...${NC}"

if [ ! -d "backend/node_modules" ]; then
  echo -e "  Installing backend dependencies..."
  cd backend && npm install && cd ..
else
  echo -e "  Backend dependencies already installed"
fi

if [ ! -d "frontend/node_modules" ]; then
  echo -e "  Installing frontend dependencies..."
  cd frontend && npm install && cd ..
else
  echo -e "  Frontend dependencies already installed"
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ============================================================
# Step 4: Seed database
# ============================================================
echo -e "\n${YELLOW}[4/6] Seeding database...${NC}"
cd backend && node src/seeds/index.js && cd ..
echo -e "${GREEN}✓ Database seeded with sample data${NC}"

# ============================================================
# Step 5: Start Backend with hot reload (nodemon)
# ============================================================
echo -e "\n${YELLOW}[5/6] Starting backend server on port $BACKEND_PORT...${NC}"
cd backend && npx nodemon src/server.js &
BACKEND_PID=$!
cd "$PROJECT_DIR"
sleep 3
echo -e "${GREEN}✓ Backend server started (PID: $BACKEND_PID) with hot reload${NC}"

# ============================================================
# Step 6: Start Frontend with hot reload (react-scripts)
# ============================================================
echo -e "\n${YELLOW}[6/6] Starting frontend on port $FRONTEND_PORT...${NC}"
cd frontend && PORT=$FRONTEND_PORT BROWSER=none npm start &
FRONTEND_PID=$!
cd "$PROJECT_DIR"

echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}All services are starting up!${CYAN}                          ║"
echo -e "║                                                          ║"
echo -e "║  Frontend:  ${GREEN}http://localhost:$FRONTEND_PORT${CYAN}                     ║"
echo -e "║  Backend:   ${GREEN}http://localhost:$BACKEND_PORT${CYAN}                     ║"
echo -e "║                                                          ║"
echo -e "║  Login:     ${GREEN}admin@disaster-response.gov${CYAN}                  ║"
echo -e "║  Password:  ${GREEN}Admin123!${CYAN}                                   ║"
echo -e "║                                                          ║"
echo -e "║  ${YELLOW}Hot reload enabled - changes auto-refresh!${CYAN}              ║"
echo -e "║  Press Ctrl+C to stop all services                       ║"
echo -e "╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Wait for processes
wait
