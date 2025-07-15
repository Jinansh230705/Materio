# Build System Documentation

This directory contains scripts for managing build IDs and deployment history for the Materio project.

## Files

### Build ID Generation
- `generate-build-id.js` - Main Node.js script for generating build IDs (used by Netlify)
- `generate-build-id.sh` - Shell script version for Unix-like systems
- `generate-build-id.bat` - Batch script version for Windows

### Build History
- `view-build-history.js` - Utility to view build deployment history
- `../data/build_history.json` - JSON file containing build history (automatically maintained)

## How It Works

### During Build Process
1. Netlify runs `node scripts/generate-build-id.js` as part of the build command
2. The script generates a unique UUID and timestamp
3. It updates `_data/build_id.yml` (used by Jekyll for current build info)
4. It maintains a history in `_data/build_history.json` (up to 100 recent builds)

### Build History Features
- **Automatic tracking**: Every build is automatically recorded
- **Limited storage**: Only keeps last 100 builds to prevent file growth
- **Rich metadata**: Includes build ID, timestamp, formatted date/time, and build number
- **Easy viewing**: Use the viewer script to see recent deployments

## Usage

### View Build History
```bash
node scripts/view-build-history.js
```

### Manual Build ID Generation (for testing)
```bash
node scripts/generate-build-id.js
```

### Help
```bash
node scripts/view-build-history.js --help
```

## File Structure

### `_data/build_id.yml` (Jekyll Data File)
```yaml
# Build ID generated during Netlify build
# This file is automatically updated during deployment
build_id: "uuid-here"
build_timestamp: "2025-07-08T13:42:41.412Z"
```

### `_data/build_history.json` (Build History)
```json
[
  {
    "build_id": "uuid-here",
    "timestamp": "2025-07-08T13:42:41.412Z",
    "date": "7/8/2025",
    "time": "1:42:41 PM",
    "build_number": 1
  }
]
```

## Important Notes

1. **Git Tracking**: The `build_history.json` file should be tracked in git to maintain history across deployments
2. **Build Numbers**: Build numbers are sequential and reset if history is cleared
3. **Cross-Platform**: All three script versions maintain the same JSON format
4. **Automated**: No manual intervention required - history is maintained automatically

## Integration

The build history system is integrated with:
- Netlify build process (via `netlify.toml`)
- Jekyll data system (for accessing current build info in templates)
- Materio CMS (build info can be displayed in admin interfaces)

## Accessing Build Info in Jekyll

Current build information is available in Jekyll templates:
```liquid
{{ site.data.build_id.build_id }}
{{ site.data.build_id.build_timestamp }}
```

For build history, you can parse the JSON file or create a Jekyll plugin to expose it as data.
