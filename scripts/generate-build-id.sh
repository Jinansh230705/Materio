#!/bin/bash

# Generate unique build ID and update Jekyll data file
# This script is run during Netlify build process

echo "Generating build ID..."

# Generate UUID using node
BUILD_ID=$(node -e "console.log(require('crypto').randomUUID())")
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

echo "Build ID: $BUILD_ID"
echo "Timestamp: $BUILD_TIMESTAMP"

# Update the Jekyll data file
cat > _data/build_id.yml << EOF
# Build ID generated during Netlify build
# This file is automatically updated during deployment
build_id: "$BUILD_ID"
build_timestamp: "$BUILD_TIMESTAMP"
EOF

# Maintain build history in JSON format
HISTORY_FILE="_data/build_history.json"

# Check if history file exists and load it
if [ -f "$HISTORY_FILE" ]; then
    # Read existing history or create empty array if file is corrupted
    BUILD_HISTORY=$(cat "$HISTORY_FILE" 2>/dev/null || echo "[]")
else
    BUILD_HISTORY="[]"
fi

# Create new build entry
BUILD_ENTRY=$(cat << EOF
{
  "build_id": "$BUILD_ID",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "date": "$(date +"%m/%d/%Y")",
  "time": "$(date +"%H:%M:%S")",
  "build_number": $(echo "$BUILD_HISTORY" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')).length + 1)")
}
EOF
)

# Update history (add new entry to beginning, keep last 100)
echo "$BUILD_HISTORY" | node -e "
const history = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
const newEntry = $BUILD_ENTRY;
history.unshift(newEntry);
if (history.length > 100) history.splice(100);
console.log(JSON.stringify(history, null, 2));
" > "$HISTORY_FILE"

echo "Build ID file updated successfully!"
echo "Build history updated: $HISTORY_FILE"
