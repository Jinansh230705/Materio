# Local CDN Server Logs Integration

## Overview
The terminal window in the Local Resources tab displays real-time HTTP server logs from your local CORS server.

## Server Requirements

Your CORS server needs to support a special `/.logs` endpoint that returns recent server logs. Here's how to modify `scripts/cors-server.py`:

### Example Implementation

```python
import http.server
import socketserver
import sys
from datetime import datetime
import threading
import time

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

# Store recent logs in memory (last 200 entries)
recent_logs = []
max_logs = 200
log_lock = threading.Lock()

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        # Special endpoint for logs
        if self.path.startswith('/.logs'):
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            
            with log_lock:
                # Return last 50 logs
                logs_to_send = '\n'.join(recent_logs[-50:])
            
            self.wfile.write(logs_to_send.encode())
            return
        
        # Normal file serving
        super().do_GET()
    
    def do_HEAD(self):
        super().do_HEAD()
    
    def log_message(self, format, *args):
        # Custom log format matching Apache/Python server
        timestamp = datetime.now().strftime('%d/%b/%Y %H:%M:%S')
        log_entry = f"{self.client_address[0]} - - [{timestamp}] \"{format % args}\""
        
        # Store in memory
        with log_lock:
            recent_logs.append(log_entry)
            if len(recent_logs) > max_logs:
                recent_logs.pop(0)
        
        # Also print to console
        print(log_entry)

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}/")
        print(f"Logs endpoint: http://localhost:{PORT}/.logs")
        httpd.serve_forever()
```

## How It Works

1. **Log Collection**: Server stores the last 200 HTTP requests in memory
2. **Log Format**: Standard Apache/Python HTTP server format:
   ```
   127.0.0.1 - - [04/Nov/2025 14:09:22] "GET /databases/beta/resource.lib.json HTTP/1.1" 200 -
   ```
3. **Log Endpoint**: GET `/.logs` returns the most recent 50 log entries
4. **Polling**: Frontend polls `/.logs` every 2 seconds when Local CDN is enabled
5. **Color Coding**:
   - 🟢 **Green** (200) - Successful requests
   - 🔵 **Blue** (304) - Not Modified
   - 🔴 **Red** (404, 500, 503) - Errors

## Features

- **Real-time monitoring**: Logs appear as requests are made
- **Auto-scroll**: Terminal scrolls to show latest entries
- **Clear button**: Clear all displayed logs
- **Collapse/Expand**: Save screen space when not actively monitoring
- **Memory efficient**: Keeps only last 200 logs in browser
- **Automatic pause**: Stops polling when tab is hidden

## Log Examples

```
127.0.0.1 - - [04/Nov/2025 14:09:22] "GET /databases/beta/resource.lib.json HTTP/1.1" 200 -
127.0.0.1 - - [04/Nov/2025 14:09:22] "GET /notifications.json HTTP/1.1" 200 -
127.0.0.1 - - [04/Nov/2025 14:09:28] "HEAD /databases/beta/resource.lib.json HTTP/1.1" 200 -
127.0.0.1 - - [04/Nov/2025 14:14:08] "HEAD /databases/beta/resource.lib.json HTTP/1.1" 200 -
127.0.0.1 - - [04/Nov/2025 14:14:17] "GET /databases/beta/resource.lib.json HTTP/1.1" 200 -
127.0.0.1 - - [04/Nov/2025 14:14:29] "GET /pdfs/5/Data%20Analytics/Introduction.pdf HTTP/1.1" 200 -
```

## Troubleshooting

**Logs not appearing?**
- Ensure your CORS server has the `/.logs` endpoint implemented
- Check browser console for polling errors
- Verify Local CDN is enabled in settings
- Make sure server URL is set correctly

**Terminal not visible?**
- Terminal only shows for Super users on Windows
- Enable Local Resources toggle to show terminal
- Check if `#serverTerminal` element exists in DOM
