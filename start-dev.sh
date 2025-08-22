#!/bin/bash

# Start both frontend and backend in development mode
echo "Starting HookDebug development servers..."

# Kill any existing processes on ports 3001 and 5173
echo "Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start backend server in background
echo "Starting backend server on port 3001..."
npm run server:dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend server in background
echo "Starting frontend server on port 5173..."
npm run dev &
FRONTEND_PID=$!

# Function to cleanup processes on script exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit
}

# Trap cleanup function on script exit
trap cleanup EXIT INT TERM

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Servers starting up..."
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for processes to finish
wait