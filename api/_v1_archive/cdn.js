const { 
  supabase, 
  verifyToken, 
  getTokenFromHeaders,
  corsHeaders
} = require('./utils');

// Load environment variables
require('dotenv').config();

exports.handler = async (event, context) => {
  // Dynamic import for ES module
  const { Octokit } = await import('@octokit/rest');
  const origin = event.headers.origin || event.headers.Origin;
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: ''
    };
  }

  try {
    // Get token from headers
    const token = getTokenFromHeaders(event.headers);
    
    if (!token) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid token' })
      };    }

    // Get user and check admin privileges
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, has_admin_privileges')
      .eq('id', decoded.id)
      .single();

    if (userError || !user || !user.has_admin_privileges) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Admin privileges required' })
      };
    }

    // Initialize GitHub client
    console.log('GitHub token available:', !!process.env.GITHUB_TOKEN);
    console.log('GitHub token length:', process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.length : 0);
    
    if (!process.env.GITHUB_TOKEN) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'GitHub token not configured' })
      };
    }
    
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    const REPO_OWNER = 'Materioa';
    const REPO_NAME = 'cdn-materio';

    const method = event.httpMethod;    switch (method) {
      case 'GET':
        // List files or get file info
        let queryPath = event.queryStringParameters?.path || '';
        // Decode URL-encoded path (e.g., %2F -> /)
        queryPath = decodeURIComponent(queryPath);
        // Convert '/' to empty string for GitHub API root directory
        if (queryPath === '/') {
          queryPath = '';
        }
        return await listGitHubFiles(octokit, REPO_OWNER, REPO_NAME, queryPath, origin);

      case 'POST':
        // Check if this is a batch upload request
        const isBatchUpload = event.queryStringParameters?.batch === 'true';
        if (isBatchUpload) {
          return await batchUploadGitHubFiles(event, octokit, REPO_OWNER, REPO_NAME, origin);
        } else {
          // Regular single file upload
          return await uploadGitHubFile(event, octokit, REPO_OWNER, REPO_NAME, origin);
        }

      case 'DELETE':
        // Delete file
        let deletePath = event.queryStringParameters?.path;
        if (!deletePath) {          return {
            statusCode: 400,
            headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'File path required' })
          };
        }
        // Decode URL-encoded path (e.g., %2F -> /)
        deletePath = decodeURIComponent(deletePath);
        // Convert '/' to empty string for GitHub API root directory
        if (deletePath === '/') {
          deletePath = '';
        }
        return await deleteGitHubFile(octokit, REPO_OWNER, REPO_NAME, deletePath, origin);

      case 'PUT':
        // Rename file
        const body = JSON.parse(event.body);
        const oldPath = body.oldPath;
        const newPath = body.newPath;
        if (!oldPath || !newPath) {
          return {
            statusCode: 400,
            headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Both oldPath and newPath required' })
          };
        }
        return await renameGitHubFile(octokit, REPO_OWNER, REPO_NAME, oldPath, newPath, origin);

      default:
        return {
          statusCode: 405,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('CDN API Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return {
      statusCode: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message // Add error details for debugging
      })
    };
  }
};

// Helper function to list GitHub files
async function listGitHubFiles(octokit, owner, repo, path, origin) {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: path || ''
    });

    if (Array.isArray(data)) {
      // Directory listing
      const fileList = data.map(item => ({
        name: item.name,
        type: item.type === 'dir' ? 'directory' : 'file',
        size: item.type === 'file' ? item.size : null,
        path: item.path,
        download_url: item.download_url,
        sha: item.sha
      }));

      return {
        statusCode: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'directory',
          path: path || '',
          items: fileList.sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          })
        })
      };
    } else {
      // Single file
      return {
        statusCode: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'file',
          name: data.name,
          size: data.size,
          path: data.path,
          download_url: data.download_url,
          sha: data.sha
        })
      };
    }

  } catch (error) {
    if (error.status === 404) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'File or directory not found' })
      };
    }
    console.error('GitHub API Error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to list files' })
    };
  }
}

// Helper function to upload file to GitHub
async function uploadGitHubFile(event, octokit, owner, repo, origin) {
  try {
    console.log('Upload request received');
    console.log('Content-Type:', event.headers['content-type']);
    console.log('Body length:', event.body ? event.body.length : 0);
    
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No body provided' })
      };
    }

    // Parse multipart form data manually for serverless
    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);
    
    // Check request size limit (Netlify Functions have a 6MB limit for synchronous functions)
    // Note: 50MB is the desired limit but Netlify Functions are limited to 6MB
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB desired limit
    const NETLIFY_LIMIT = 6 * 1024 * 1024; // 6MB actual Netlify limit
    
    if (body.length > NETLIFY_LIMIT) {
      return {
        statusCode: 413,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: `File too large for current hosting. Maximum size is ${Math.round(NETLIFY_LIMIT / 1024 / 1024)}MB due to Netlify Functions limitations. Your file is ${Math.round(body.length / 1024 / 1024)}MB. Consider using a different upload method for larger files.` 
        })
      };
    }
    
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid content type. Expected multipart/form-data' })
      };
    }

    // Extract boundary
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No boundary found in content-type' })
      };
    }

    // Parse multipart data while preserving binary content
    let fileContent = null;
    let fileName = null;
    let targetPath = '';
    
    try {
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      const parts = [];
      let startIndex = 0;
      
      while (true) {
        const boundaryIndex = body.indexOf(boundaryBuffer, startIndex);
        if (boundaryIndex === -1) break;
        
        if (startIndex !== 0) {
          parts.push(body.slice(startIndex, boundaryIndex));
        }
        startIndex = boundaryIndex + boundaryBuffer.length;
      }

      for (const part of parts) {
        const partStr = part.toString('utf8', 0, Math.min(part.length, 1000)); // Only convert headers to string
        if (partStr.includes('Content-Disposition: form-data')) {
          const lines = partStr.split('\r\n');
          const disposition = lines.find(line => line.includes('Content-Disposition'));
          
          if (disposition && disposition.includes('name="file"')) {
            // Extract filename
            const filenameMatch = disposition.match(/filename="([^"]+)"/);
            if (filenameMatch) {
              fileName = filenameMatch[1];
            }
            
            // Find content (after double CRLF) - preserve binary data
            const headerEndPattern = Buffer.from('\r\n\r\n');
            const contentStart = part.indexOf(headerEndPattern) + 4;
            const contentEndPattern = Buffer.from('\r\n');
            const contentEnd = part.lastIndexOf(contentEndPattern);
            
            if (contentStart < contentEnd) {
              fileContent = part.slice(contentStart, contentEnd);
            }
          } else if (disposition && disposition.includes('name="path"')) {
            // Extract path
            const headerEndPattern = Buffer.from('\r\n\r\n');
            const contentStart = part.indexOf(headerEndPattern) + 4;
            const contentEndPattern = Buffer.from('\r\n');
            const contentEnd = part.lastIndexOf(contentEndPattern);
            
            if (contentStart < contentEnd) {
              targetPath = part.slice(contentStart, contentEnd).toString('utf8').trim();
            }
          }
        }
      }
    } catch (parseError) {
      console.error('Multipart parsing error:', parseError);
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to parse multipart data. File may be too large or corrupted.' })
      };
    }

    if (!fileContent || !fileName) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No file provided or file parsing failed' })
      };
    }

    // Additional file size validation for the actual file content
    if (fileContent.length > NETLIFY_LIMIT) {
      return {
        statusCode: 413,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: `File "${fileName}" is too large for current hosting. Maximum size is ${Math.round(NETLIFY_LIMIT / 1024 / 1024)}MB due to Netlify Functions limitations. Your file is ${Math.round(fileContent.length / 1024 / 1024)}MB.` 
        })
      };
    }

    // Validate file type based on path
    // Allow JSON files for database updates, but restrict course materials to PDFs
    const isDataBaseFile = targetPath.includes('databases/') || fileName.toLowerCase().endsWith('.json');
    const isPdfCourseFile = targetPath.includes('pdfs/') || targetPath.startsWith('pdfs/');
    
    if (isPdfCourseFile && !fileName.toLowerCase().endsWith('.pdf')) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Only PDF files are allowed for course material uploads (pdfs/ directory)' })
      };
    }
    
    // Allow JSON files for database operations
    if (isDataBaseFile && !fileName.toLowerCase().endsWith('.json') && !fileName.toLowerCase().endsWith('.pdf')) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Only JSON files are allowed for database operations' })
      };
    }

    // Convert '/' to empty string for GitHub API root directory
    if (targetPath === '/') {
      targetPath = '';
    }

    const filePath = targetPath ? `${targetPath}/${fileName}` : fileName;
    
    // Convert file content to base64 - fileContent is now a Buffer
    const content = fileContent.toString('base64');

    console.log('Uploading file:', fileName, 'to path:', filePath);

    // Check if file already exists to get SHA for update
    let sha = null;
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath
      });
      sha = existingFile.sha;
      console.log('File exists, updating with SHA:', sha);
    } catch (error) {
      // File doesn't exist, which is fine for new uploads
      if (error.status !== 404) {
        throw error;
      }
      console.log('New file upload');
    }

    // Upload/update file
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Upload ${fileName}`,
      content,
      sha // Include SHA if updating existing file
    });

    console.log('File uploaded successfully');

    return {
      statusCode: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'File uploaded successfully',
        file: {
          name: fileName,
          path: filePath,
          size: fileContent.length,
          sha: data.content.sha,
          download_url: data.content.download_url
        }
      })
    };

  } catch (error) {
    console.error('Upload error:', error);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Upload failed';
    let statusCode = 500;
    
    if (error.status === 413 || error.message?.includes('too large')) {
      errorMessage = 'File too large for upload';
      statusCode = 413;
    } else if (error.status === 403) {
      errorMessage = 'Permission denied - check GitHub token permissions';
      statusCode = 403;
    } else if (error.status === 422) {
      errorMessage = 'Invalid file content or repository configuration';
      statusCode = 422;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Upload timeout - file may be too large';
      statusCode = 408;
    } else if (error.message) {
      errorMessage = `Upload failed: ${error.message}`;
    }
    
    return {
      statusCode,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: errorMessage })
    };
  }
}

// Helper function to delete file from GitHub
async function deleteGitHubFile(octokit, owner, repo, path, origin) {
  try {
    // Get file info to get SHA
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path
    });    if (Array.isArray(data)) {
      // This is a directory - perform recursive deletion
      console.log(`Deleting directory: ${path} with ${data.length} items`);
      
      // Delete all files in the directory first
      const deletePromises = data.map(async (item) => {
        if (item.type === 'file') {
          console.log(`Deleting file: ${item.path}`);
          return await octokit.rest.repos.deleteFile({
            owner,
            repo,
            path: item.path,
            message: `Delete ${item.name} from ${path}`,
            sha: item.sha
          });
        } else if (item.type === 'dir') {
          // Recursively delete subdirectory
          console.log(`Recursively deleting subdirectory: ${item.path}`);
          const result = await deleteGitHubFile(octokit, owner, repo, item.path, origin);
          if (result.statusCode !== 200) {
            throw new Error(`Failed to delete subdirectory: ${item.path}`);
          }
          return result;
        }
      });

      // Wait for all deletions to complete
      await Promise.all(deletePromises);

      // Cleanup metadata after successful deletion
      await cleanupMetadataOnDeletion(octokit, owner, repo, path, origin);

      return {
        statusCode: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `Directory '${path}' and all its contents deleted successfully`,
          deletedItems: data.length
        })
      };
    } else {
      // This is a single file
      console.log(`Deleting file: ${path}`);
      
      // Delete the file
      await octokit.rest.repos.deleteFile({
        owner,
        repo,
        path,
        message: `Delete ${data.name}`,
        sha: data.sha
      });

      // Cleanup metadata after successful deletion
      await cleanupMetadataOnDeletion(octokit, owner, repo, path, origin);

      return {
        statusCode: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'File deleted successfully' })
      };
    }

  } catch (error) {
    if (error.status === 404) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'File not found' })
      };
    }
    console.error('GitHub delete error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Delete failed: ' + error.message })
    };
  }
}

// Helper function to rename file in GitHub
async function renameGitHubFile(octokit, owner, repo, oldPath, newPath, origin) {
  try {
    // Get the current file content and SHA
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: oldPath
    });

    if (Array.isArray(fileData)) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Cannot rename directory' })
      };
    }

    // Create new file with same content
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: newPath,
      message: `Rename ${oldPath} to ${newPath}`,
      content: fileData.content
    });

    // Delete old file
    await octokit.rest.repos.deleteFile({
      owner,
      repo,
      path: oldPath,
      message: `Remove old file ${oldPath} after rename`,
      sha: fileData.sha
    });

    return {
      statusCode: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'File renamed successfully',
        oldPath,
        newPath 
      })
    };

  } catch (error) {
    if (error.status === 404) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'File not found' })
      };
    }
    console.error('GitHub rename error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Rename failed: ' + error.message })
    };
  }
}

// Helper function to clean up metadata files when files are deleted
async function cleanupMetadataOnDeletion(octokit, owner, repo, deletedPath, origin) {
  try {
    console.log(`Cleaning up metadata for deleted path: ${deletedPath}`);
    
    // Clean up resource library
    await cleanupResourceLibrary(octokit, owner, repo, deletedPath, origin);
    
    // Clean up notifications (optional - could add deletion notification)
    await createDeletionNotification(octokit, owner, repo, deletedPath, origin);
    
  } catch (error) {
    console.error('Error cleaning up metadata:', error);
    // Don't fail the deletion if metadata cleanup fails
  }
}

// Helper function to clean up resource library
async function cleanupResourceLibrary(octokit, owner, repo, deletedPath, origin) {
  try {
    // Get the resource library file
    const { data: resourceLibData } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'databases/beta/resource.lib.json'
    });
    
    const content = Buffer.from(resourceLibData.content, 'base64').toString('utf8');
    let resourceLib = JSON.parse(content);
    
    // Extract filename from path for cleanup
    const fileName = deletedPath.split('/').pop();
    let updated = false;
    
    // Search through all semesters, subjects, and categories to remove the file
    for (const semester in resourceLib) {
      if (typeof resourceLib[semester] === 'object') {
        for (const subject in resourceLib[semester]) {
          if (Array.isArray(resourceLib[semester][subject])) {
            for (const category of resourceLib[semester][subject]) {
              if (category.content && Array.isArray(category.content)) {
                const initialLength = category.content.length;
                category.content = category.content.filter(file => file !== fileName);
                if (category.content.length !== initialLength) {
                  updated = true;
                  console.log(`Removed ${fileName} from ${semester}/${subject}/${category.type}`);
                }
              }
            }
          }
        }
      }
    }
    
    // Update the resource library file if changes were made
    if (updated) {
      const updatedContent = Buffer.from(JSON.stringify(resourceLib, null, 2)).toString('base64');
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'databases/beta/resource.lib.json',
        message: `Remove ${fileName} from resource library`,
        content: updatedContent,
        sha: resourceLibData.sha
      });
      console.log('Resource library updated successfully');
    }
    
  } catch (error) {
    if (error.status === 404) {
      console.log('Resource library file not found, skipping cleanup');
    } else {
      console.error('Error cleaning up resource library:', error);
    }
  }
}

// Helper function to create deletion notification
async function createDeletionNotification(octokit, owner, repo, deletedPath, origin) {
  try {
    // Get existing notifications
    let notifications = [];
    let notificationsSha = null;
    
    try {
      const { data: notificationsData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'notifications.json'
      });
      
      const content = Buffer.from(notificationsData.content, 'base64').toString('utf8');
      notifications = JSON.parse(content);
      notificationsSha = notificationsData.sha;
    } catch (error) {
      console.log('No existing notifications file, creating new one');
    }
    
    // Create deletion notification
    const fileName = deletedPath.split('/').pop();
    const notification = {
      title: "File Deleted",
      message: `File "${fileName}" has been removed from the system.`,
      date: new Date().toISOString(),
      type: "deletion",
      links: []
    };
    
    // Add notification to the top
    notifications.unshift(notification);
    
    // Keep only last 100 notifications
    if (notifications.length > 100) {
      notifications = notifications.slice(0, 100);
    }
    
    // Update notifications file
    const updatedContent = Buffer.from(JSON.stringify(notifications, null, 2)).toString('base64');
    
    if (notificationsSha) {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'notifications.json',
        message: `Add deletion notification for ${fileName}`,
        content: updatedContent,
        sha: notificationsSha
      });
    } else {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'notifications.json',
        message: `Create notifications file with deletion of ${fileName}`,
        content: updatedContent
      });
    }
    
    console.log('Deletion notification created successfully');
    
  } catch (error) {
    console.error('Error creating deletion notification:', error);
  }
}

// Batch upload function following the same pattern as single upload
async function batchUploadGitHubFiles(event, octokit, owner, repo, origin) {
  try {
    console.log('Upload request received');
    console.log('Content-Type:', event.headers['content-type']);
    console.log('Body length:', event.body ? event.body.length : 0);
    
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No body provided' })
      };
    }

    // Parse multipart form data manually for serverless
    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);
    
    // Check request size limit (Netlify Functions have a 6MB limit for synchronous functions)
    const NETLIFY_LIMIT = 6 * 1024 * 1024; // 6MB actual Netlify limit
    
    if (body.length > NETLIFY_LIMIT) {
      return {
        statusCode: 413,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: `Request too large for current hosting. Maximum size is ${Math.round(NETLIFY_LIMIT / 1024 / 1024)}MB due to Netlify Functions limitations.` 
        })
      };
    }
    
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid content type. Expected multipart/form-data' })
      };
    }

    // Extract boundary
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No boundary found in content-type' })
      };
    }

    // Parse multipart data
    const parsedData = await parseBatchMultipartData(body, boundary);
    
    if (!parsedData.files || parsedData.files.length === 0) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No files provided' })
      };
    }

    // Extract form data
    const semester = parsedData.fields.semester;
    const subject = parsedData.fields.subject;
    const category = parsedData.fields.category;
    const autoPushNotify = parsedData.fields.autoPushNotify === 'true';
    const basePath = parsedData.fields.basePath || `pdfs/${semester}/${subject}`;

    if (!semester || !subject || !category) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: semester, subject, category' })
      };
    }

    // Validate all files are PDFs
    for (const file of parsedData.files) {
      if (!file.filename.toLowerCase().endsWith('.pdf')) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Only PDF files are allowed. File "${file.filename}" is not a PDF.` })
        };
      }
    }

    console.log(`Starting upload: ${parsedData.files.length} files for ${subject} - ${category}`);

    // Get current repository state
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: 'heads/main'
    });
    
    const latestCommitSha = ref.object.sha;
    const { data: latestCommit } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha
    });
    
    const baseTreeSha = latestCommit.tree.sha;

    // Prepare all files and database updates for upload in a single tree
    const treeItems = [];
    const uploadedFiles = [];

    // Add course files to tree by creating blobs first
    for (const file of parsedData.files) {
      const filePath = `${basePath}/${file.filename}`;
      
      // Create blob for the file content (GitHub expects base64 for blob creation)
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: file.content.toString('base64'),
        encoding: 'base64'
      });
      
      treeItems.push({
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha // Reference the blob by SHA instead of including content
      });

      uploadedFiles.push({
        name: file.filename.replace(/\.[^/.]+$/, ""), // Remove extension
        path: filePath,
        filename: file.filename,
        size: file.content.length
      });
    }

    // Load and update semester-subject mappings
    let semesterSubjectMappings = {};
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'databases/semester-subjects.json'
      });
      
      const content = Buffer.from(existingFile.content, 'base64').toString('utf8');
      semesterSubjectMappings = JSON.parse(content);
    } catch (error) {
      // File doesn't exist, use default structure
      semesterSubjectMappings = {};
    }

    // Update semester-subject mappings
    if (!semesterSubjectMappings[semester]) {
      semesterSubjectMappings[semester] = [];
    }
    
    if (!semesterSubjectMappings[semester].includes(subject)) {
      semesterSubjectMappings[semester].push(subject);
      
      // Add to tree - JSON content should be stored directly, not base64 encoded
      const jsonContent = JSON.stringify(semesterSubjectMappings, null, 2);
      treeItems.push({
        path: 'databases/semester-subjects.json',
        mode: '100644',
        type: 'blob',
        content: jsonContent
      });
    }

    // Load and update resource library
    let resourceLib = {};
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'databases/beta/resource.lib.json'
      });
      
      const content = Buffer.from(existingFile.content, 'base64').toString('utf8');
      resourceLib = JSON.parse(content);
    } catch (error) {
      // File doesn't exist, create new structure
      resourceLib = {};
    }

    // Update resource library
    if (!resourceLib[semester]) {
      resourceLib[semester] = {};
    }
    if (!resourceLib[semester][subject]) {
      resourceLib[semester][subject] = [];
    }
    
    // Find existing category or create new one
    let categoryIndex = resourceLib[semester][subject].findIndex(item => item.type === category);
    if (categoryIndex === -1) {
      resourceLib[semester][subject].push({
        type: category,
        content: []
      });
      categoryIndex = resourceLib[semester][subject].length - 1;
    }
    
    // Add uploaded file names to content
    const fileNames = uploadedFiles.map(file => file.name);
    resourceLib[semester][subject][categoryIndex].content.push(...fileNames);
    
    // Add to tree - JSON content should be stored directly, not base64 encoded
    const resourceLibContent = JSON.stringify(resourceLib, null, 2);
    treeItems.push({
      path: 'databases/beta/resource.lib.json',
      mode: '100644',
      type: 'blob',
      content: resourceLibContent
    });

    // Create notification if enabled
    if (autoPushNotify) {
      let notifications = [];
      try {
        const { data: existingFile } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: 'notifications.json'
        });
        
        const content = Buffer.from(existingFile.content, 'base64').toString('utf8');
        notifications = JSON.parse(content);
      } catch (error) {
        // File doesn't exist, create new array
        notifications = [];
      }

      // Add new notification to the top
      const notification = {
        title: "New Materials Uploaded!",
        message: `New materials have been added in ${category} category of ${subject}.`,
        date: new Date().toISOString(),
        links: []
      };
      
      notifications.unshift(notification);
      
      // Add to tree - JSON content should be stored directly, not base64 encoded
      const notificationsContent = JSON.stringify(notifications, null, 2);
      treeItems.push({
        path: 'notifications.json',
        mode: '100644',
        type: 'blob',
        content: notificationsContent
      });
    }

    // Create new tree with all changes at once
    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      tree: treeItems,
      base_tree: baseTreeSha
    });

    // Create single commit with all changes
    const commitMessage = `Uploaded: ${uploadedFiles.length} files for ${subject} - ${category}${autoPushNotify ? ' (with notification)' : ''} via Materio CMS`;
    
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.sha,
      parents: [latestCommitSha]
    });

    // Update the reference to point to the new commit
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: newCommit.sha
    });

    console.log('All files uploaded successfully:', newCommit.sha);

    return {
      statusCode: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Successfully uploaded ${uploadedFiles.length} files`,
        commit: newCommit.sha,
        files: uploadedFiles,
        updatedDatabase: true,
        notificationCreated: autoPushNotify
      })
    };

  } catch (error) {
    console.error('Upload error:', error);
    
    return {
      statusCode: 500,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: error.message || 'Failed to process upload'
      })
    };
  }
}

// Helper function to parse multipart data for batch upload
async function parseBatchMultipartData(body, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];
  let startIndex = 0;
  
  while (true) {
    const boundaryIndex = body.indexOf(boundaryBuffer, startIndex);
    if (boundaryIndex === -1) break;
    
    if (startIndex !== 0) {
      parts.push(body.slice(startIndex, boundaryIndex));
    }
    startIndex = boundaryIndex + boundaryBuffer.length;
  }

  const parsedData = {
    fields: {},
    files: []
  };

  for (const part of parts) {
    if (part.length === 0) continue;
    
    const partStr = part.toString('utf8', 0, Math.min(part.length, 1000));
    if (!partStr.includes('Content-Disposition: form-data')) continue;
    
    const lines = partStr.split('\r\n');
    const disposition = lines.find(line => line.includes('Content-Disposition'));
    
    if (!disposition) continue;
    
    // Extract name attribute
    const nameMatch = disposition.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    
    const fieldName = nameMatch[1];
    
    // Find content start (after double CRLF)
    const headerEndPattern = Buffer.from('\r\n\r\n');
    const contentStart = part.indexOf(headerEndPattern) + 4;
    const contentEndPattern = Buffer.from('\r\n');
    const contentEnd = part.lastIndexOf(contentEndPattern);
    
    if (contentStart >= contentEnd) continue;
    
    const content = part.slice(contentStart, contentEnd);
    
    // Check if this is a file field
    const filenameMatch = disposition.match(/filename="([^"]+)"/);
    if (filenameMatch && fieldName === 'files') {
      // This is a file
      const filename = filenameMatch[1];
      if (filename && content.length > 0) {
        parsedData.files.push({
          filename: filename,
          content: content
        });
      }
    } else {
      // This is a regular form field
      parsedData.fields[fieldName] = content.toString('utf8').trim();
    }
  }

  return parsedData;
}
