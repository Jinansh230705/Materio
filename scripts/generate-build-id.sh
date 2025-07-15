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

echo "Build ID file updated successfully!"
