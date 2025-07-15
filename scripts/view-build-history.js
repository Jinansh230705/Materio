#!/usr/bin/env node
// Build History Viewer
// View build history for Materio deployment

const fs = require('fs');
const path = require('path');

const historyPath = path.join(process.cwd(), '_data', 'build_history.json');

function displayBuildHistory() {
    if (!fs.existsSync(historyPath)) {
        console.log('❌ No build history found. Run a build first.');
        return;
    }

    try {
        const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        
        if (history.length === 0) {
            console.log('📭 Build history is empty.');
            return;
        }

        console.log('📊 Materio Build History');
        console.log('=' .repeat(80));
        console.log(`Total builds: ${history.length}`);
        console.log('');

        // Show last 10 builds
        const recentBuilds = history.slice(0, 10);
        
        console.log('🔍 Recent Builds (Last 10):');
        console.log('-'.repeat(80));
        
        recentBuilds.forEach((build, index) => {
            const buildDate = new Date(build.timestamp);
            const timeAgo = getTimeAgo(buildDate);
            
            console.log(`${index + 1}. Build #${build.build_number}`);
            console.log(`   ID: ${build.build_id}`);
            console.log(`   Date: ${build.date} ${build.time}`);
            console.log(`   Time ago: ${timeAgo}`);
            console.log('');
        });

        if (history.length > 10) {
            console.log(`... and ${history.length - 10} more builds`);
        }

        // Show current build info
        const currentBuild = history[0];
        console.log('🔴 Current Build:');
        console.log(`   ID: ${currentBuild.build_id}`);
        console.log(`   Deployed: ${getTimeAgo(new Date(currentBuild.timestamp))} ago`);

    } catch (error) {
        console.error('❌ Error reading build history:', error.message);
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
}

// Command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log('Build History Viewer for Materio');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/view-build-history.js     Show recent builds');
    console.log('  node scripts/view-build-history.js -h  Show this help');
    console.log('');
} else {
    displayBuildHistory();
}
