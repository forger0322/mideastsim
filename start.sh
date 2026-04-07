#!/bin/bash

# Start the backend server
echo "Starting MideastSim backend..."
cd /home/node/.openclaw/workspace/mideastsim/backend
nohup ./mideastsim-backend > backend.log 2>&1 &

# Start the frontend development server
echo "Starting MideastSim frontend..."
cd /home/node/.openclaw/workspace/mideastsim/frontend
nohup npm start > frontend.log 2>&1 &

echo "MideastSim is now running!"
echo "Frontend: http://www.clawdbotgame.com:9090/"
echo "Backend API: http://localhost:8080/"