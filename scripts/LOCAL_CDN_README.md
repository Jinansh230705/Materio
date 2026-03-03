# Local CDN Server Setup

This directory contains tools to run your local CDN with CORS support for Materio development.

## Quick Start

### Option 1: Using the Batch File (Windows)
1. Copy `start-local-cdn.bat` to your CDN root directory (e.g., `E:\GitHub\cdn-materio\`)
2. Copy `cors-server.py` to the `scripts` subfolder
3. Double-click `start-local-cdn.bat`
4. Server will start on `http://localhost:8080`

### Option 2: Manual Start
In your CDN directory, run:
```powershell
python scripts/cors-server.py 8080
```

### Option 3: Different Port
```powershell
python scripts/cors-server.py 3000
```

## Configuration in Materio

1. Go to **Preferences** tab in Materio
2. Enable **Local CDN Path** toggle (Super users only)
3. Enter: `http://localhost:8080`
4. Click **Save Path**
5. Reload the page

## Why CORS?

Browsers block cross-origin requests for security. Since Materio runs on `localhost:8888` and your CDN runs on `localhost:8080`, these are considered different origins.

The `cors-server.py` script adds the necessary CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`

## Troubleshooting

### "No 'Access-Control-Allow-Origin' header"
- Make sure you're using `cors-server.py`, not `python -m http.server`

### "Connection refused"
- Verify the server is running
- Check the port number matches what you entered in Materio

### "404 Not Found"
- Verify your CDN directory structure matches:
  ```
  cdn-materio/
  ├── databases/
  │   └── beta/
  │       └── resource.lib.json
  ├── pdfs/
  │   └── [semesters]/
  ├── notifications.json
  └── scripts/
      └── cors-server.py
  ```

## Server Features

- ✅ CORS enabled for all origins
- ✅ Serves static files
- ✅ No caching (always fresh)
- ✅ Handles OPTIONS preflight requests
- ✅ Clean console output
- ✅ Easy to stop (Ctrl+C)
