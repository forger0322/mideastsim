#!/bin/bash
# World Channel Monitor - Simple version using cron
# This script checks for new messages and triggers agent responses

BACKEND_URL="http://localhost:8081"
STATE_FILE="/tmp/world_channel_last_count"
MESSAGES_FILE="/tmp/world_channel_latest.json"

# Get current messages
curl -s "${BACKEND_URL}/api/chat/messages?limit=10" > "${MESSAGES_FILE}"

# Count messages
CURRENT_COUNT=$(cat "${MESSAGES_FILE}" | grep -o '"id"' | wc -l)

# Check if there are new messages
if [ -f "${STATE_FILE}" ]; then
  LAST_COUNT=$(cat "${STATE_FILE}")
  if [ "$CURRENT_COUNT" -gt "$LAST_COUNT" ]; then
    NEW_MESSAGES=$((CURRENT_COUNT - LAST_COUNT))
    echo "📨 ${NEW_MESSAGES} new message(s) detected at $(date)"
    
    # Get latest message sender and content for logging
    LATEST_SENDER=$(cat "${MESSAGES_FILE}" | grep -o '"sender_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   Latest from: ${LATEST_SENDER}"
  fi
fi

# Save current count
echo "$CURRENT_COUNT" > "${STATE_FILE}"
