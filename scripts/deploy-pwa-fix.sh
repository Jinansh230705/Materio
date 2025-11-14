#!/bin/bash
# Quick deployment test script for PWA cache fixes

echo "🚀 Testing PWA Cache Fix Deployment"
echo "=================================="

# Update package version
echo "📦 Updating package version..."
npm version patch --no-git-tag-version

# Update manifest version to match
echo "📱 Updating manifest version..."
PACKAGE_VERSION=$(node -p "require('./package.json').version")
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$PACKAGE_VERSION\"/" manifest.json

# Update service worker cache names
echo "🔧 Updating service worker cache names..."
CACHE_VERSION="v$(echo $PACKAGE_VERSION | tr '.' '-')"
sed -i "s/materio-v[0-9-]*/materio-$CACHE_VERSION/g" sw.js

# Create version file for client-side version checking
echo "📝 Creating version file..."
echo "{\"version\":\"$PACKAGE_VERSION\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"cache\":\"materio-$CACHE_VERSION\"}" > version.json

echo "✅ Version updates complete!"
echo "📋 Summary:"
echo "   Package: $PACKAGE_VERSION"
echo "   Cache: materio-$CACHE_VERSION"
echo ""
echo "🌐 Ready for deployment!"
echo "💡 Users will see updates within 2-10 minutes after deployment."
echo ""
echo "🔍 Debug URL: Add ?debug=pwa to your URL to see debug panel"
