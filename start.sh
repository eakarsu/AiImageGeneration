#!/bin/bash

echo "=== AI Image Generation App (with Stable Diffusion) ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Kill processes on ports 3001, 5050, and 5173
echo "Cleaning up ports..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5050 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1

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

# --- Stable Diffusion Server ---
echo ""
echo "Setting up Stable Diffusion server..."
cd "$SCRIPT_DIR/sd_server"

if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
fi

echo "Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt --quiet

echo "Starting SD server on port 5050..."
python server.py &
SD_PID=$!
deactivate 2>/dev/null

# Wait for SD server to respond (model loading takes time on first run)
echo "Waiting for SD server to start (model download may take a while on first run)..."
for i in $(seq 1 120); do
  if curl -s http://127.0.0.1:5050/health > /dev/null 2>&1; then
    SD_STATUS=$(curl -s http://127.0.0.1:5050/health | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
    if [ "$SD_STATUS" = "ready" ]; then
      echo "SD server is ready!"
      break
    elif [ "$SD_STATUS" = "error" ]; then
      echo "SD server encountered an error. Check logs above."
      break
    else
      echo "  SD server status: loading model... ($i)"
    fi
  fi
  sleep 3
done

# --- Node Backend ---
echo ""
echo "Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
npm install

echo "Seeding database..."
node seed.js

echo "Starting backend on port 3001..."
node server.js &
BACKEND_PID=$!

# --- Frontend ---
echo "Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install

echo "Starting frontend on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=== App is running! ==="
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:3001"
echo "SD Server: http://localhost:5050"
echo "Login:    demo@example.com / password123"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $SD_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
