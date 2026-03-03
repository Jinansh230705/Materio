#!/usr/bin/env python3
"""
Simple HTTP server with CORS enabled
For local CDN development
Usage: python cors-server.py [port]
"""

import http.server
import socketserver
import sys
import threading
import time
from functools import partial
from collections import deque

# Store recent logs in memory (thread-safe with lock)
recent_logs = deque(maxlen=200)
log_lock = threading.Lock()

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for all origins
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        # Handle /.logs endpoint
        if self.path.startswith('/.logs'):
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            
            # Get logs without logging this request
            with log_lock:
                # Return last 50 logs
                logs_to_send = list(recent_logs)[-50:]
                response = '\n'.join(logs_to_send)
            
            self.wfile.write(response.encode('utf-8'))
            return
        
        # Normal file serving
        super().do_GET()
    
    def log_message(self, format, *args):
        """Override to store logs in memory and skip /.logs requests"""
        # Don't log requests to /.logs endpoint
        if '/.logs' in self.path:
            return
        
        # Format log message
        log_line = "%s - - [%s] %s" % (
            self.address_string(),
            self.log_date_time_string(),
            format % args
        )
        
        # Store in memory
        with log_lock:
            recent_logs.append(log_line)
        
        # Print to console
        print(log_line)

def run_server(port=8080, directory='.'):
    """Run HTTP server with CORS enabled"""
    handler = partial(CORSRequestHandler, directory=directory)
    
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"╔════════════════════════════════════════════════════════╗")
        print(f"║  🚀 Local CDN Server with CORS Enabled                ║")
        print(f"╠════════════════════════════════════════════════════════╣")
        print(f"║    Serving: {directory:<40} ║")
        print(f"║    Address: http://localhost:{port:<26} ║")
        print(f"║    CORS: Enabled for all origins                     ║")
        print(f"╠════════════════════════════════════════════════════════╣")
        print(f"║  Press Ctrl+C to stop                                  ║")
        print(f"╚════════════════════════════════════════════════════════╝")
        print()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n🛑 Server stopped")
            return 0

if __name__ == "__main__":
    # Get port from command line argument, default to 8080
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    
    # Get directory from command line argument, default to current directory
    directory = sys.argv[2] if len(sys.argv) > 2 else '.'
    
    run_server(port, directory)
