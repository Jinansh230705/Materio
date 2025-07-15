#!/usr/bin/env ruby

# This is a script that adds URL rewriting functionality to the Jekyll development server
# It intercepts requests to /account/@username and redirects them to /account/profile.html

require 'webrick'

# Create a custom WEBrick HTTP server with URL rewriting
class CustomHTTPServer < WEBrick::HTTPServer
  def service(req, res)
    # Check if the request is for a username profile URL
    if req.path =~ /^\/account\/@/
      # Rewrite the URL to point to the profile page
      req.path = '/account/profile.html'
    end
    
    # Call the standard service method with the possibly modified request
    super
  end
end

# This script is run before starting the Jekyll server, but doesn't modify Jekyll's internals
# It just adds URL rewriting capability to WEBrick for the specific URLs we care about
