#!/bin/bash

echo "=== AI Image Generation App ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Function to clean up ports
cleanup_ports() {
  echo "Cleaning up used ports..."
  for port in 3001 5050 3000; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
      echo "  Killing process on port $port (PID: $pid)"
      kill -9 $pid 2>/dev/null
    fi
  done
  sleep 1
}

# Initial cleanup
cleanup_ports

# Trap to cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  cleanup_ports
  exit 0
}
trap cleanup SIGINT SIGTERM

# Check if PostgreSQL is running
echo "Checking PostgreSQL..."
if ! pg_isready -q 2>/dev/null; then
  echo "Starting PostgreSQL..."
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
    echo "Trying to start postgres directly..."
    pg_ctl -D /usr/local/var/postgres start 2>/dev/null || pg_ctl -D /opt/homebrew/var/postgres start 2>/dev/null
  }
  sleep 2
fi

# Create database if not exists
echo "Setting up database..."
createdb ai_image_gen 2>/dev/null || true

# --- Stable Diffusion Server (Optional) ---
echo ""
echo "Checking Stable Diffusion server setup..."
cd "$SCRIPT_DIR/sd_server"

if [ -f "server.py" ]; then
  if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
  fi

  echo "Installing Python dependencies..."
  source venv/bin/activate
  pip install -r requirements.txt --quiet 2>/dev/null

  echo "Starting SD server on port 5050 (background)..."
  python server.py &
  SD_PID=$!
  deactivate 2>/dev/null

  # Wait for SD server briefly
  echo "Waiting for SD server..."
  for i in $(seq 1 30); do
    if curl -s http://127.0.0.1:5050/health > /dev/null 2>&1; then
      echo "  SD server responding!"
      break
    fi
    sleep 1
  done
else
  echo "SD server not found, skipping..."
  SD_PID=""
fi

# --- Node Backend with Hot Reload ---
echo ""
echo "Setting up backend..."
cd "$SCRIPT_DIR/backend"
npm install --silent

# Run database seed
echo "Seeding database..."
node seed.js --force

# Check if nodemon is installed globally or locally
if command -v nodemon &> /dev/null || [ -f "node_modules/.bin/nodemon" ]; then
  echo "Starting backend with hot reload on port 3001..."
  npx nodemon server.js &
else
  # Install nodemon locally if not present
  echo "Installing nodemon for hot reload..."
  npm install --save-dev nodemon --silent
  echo "Starting backend with hot reload on port 3001..."
  npx nodemon server.js &
fi
BACKEND_PID=$!

# Wait for backend to be ready
sleep 2
for i in $(seq 1 10); do
  if curl -s http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    echo "  Backend is ready!"
    break
  fi
  sleep 1
done

# --- Frontend with Hot Reload (Vite) ---
echo ""
echo "Setting up frontend..."
cd "$SCRIPT_DIR/frontend"
npm install --silent

echo "Starting frontend with hot reload on port 3000..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend
sleep 3

echo ""
echo "=========================================="
echo "       App is running!"
echo "=========================================="
echo ""
echo "  Frontend:   http://localhost:3000"
echo "  Backend:    http://localhost:3001"
echo "  SD Server:  http://localhost:5050"
echo ""
echo "  Login: demo@example.com / password123"
echo ""
echo "  Hot reload enabled for both frontend and backend!"
echo "  Edit code and changes will reload automatically."
echo ""
echo "  Press Ctrl+C to stop all services"
echo "=========================================="
echo ""

# Wait for all processes
if [ -n "$SD_PID" ]; then
  wait $SD_PID $BACKEND_PID $FRONTEND_PID
else
  wait $BACKEND_PID $FRONTEND_PID
fi
