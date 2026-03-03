#!/bin/bash

# Test script for the new invite sharelink feature
echo "Testing Materio Invite Sharelink Feature"
echo "========================================"

# Test 1: Create a sharelink (requires authentication)
echo "Test 1: Creating sharelink..."
echo "This requires admin authentication. Use the web interface to test."

# Test 2: Test dynamic invite route
echo ""
echo "Test 2: Testing dynamic invite route..."
echo "Visit: http://localhost:8888/invites/YOUR_INVITE_CODE"
echo "Replace YOUR_INVITE_CODE with an actual invite code"

# Test 3: Test static invite files (should still work)
echo ""
echo "Test 3: Testing static invite files..."
echo "Static invite files in plus_invites/ should still work normally"

echo ""
echo "Manual Testing Steps:"
echo "1. Start the development server: npm run dev"
echo "2. Login as admin user"
echo "3. Generate an invite code"
echo "4. Click the share button (should now show share icon instead of copy)"
echo "5. Fill in custom heading and click 'Update Share Link'"
echo "6. Test the generated URL"
echo "7. Test sharing via WhatsApp and X (Twitter)"

echo ""
echo "Database Setup:"
echo "Don't forget to run the migration: migrations/create_sharelinks_table.sql"