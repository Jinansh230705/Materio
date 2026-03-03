const {
  supabase,
  verifyToken,
  getTokenFromHeaders,
  corsHeaders
} = require('./_utils');
const formidable = require('formidable');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

module.exports = async (req, res) => {
  // Dynamic import for ES module
  const { Octokit } = await import('@octokit/rest');
  const origin = req.headers.origin || req.headers.Origin;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).set(corsHeaders(origin)).send('');
    return;
  }

  try {
    // Get token from headers
    const token = getTokenFromHeaders(req.headers);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user and check admin privileges
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, has_admin_privileges')
      .eq('id', decoded.id)
      .single();

    if (userError || !user || !user.has_admin_privileges) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    // Initialize GitHub client
    console.log('GitHub token available:', !!process.env.GITHUB_TOKEN);
    console.log('GitHub token length:', process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.length : 0);

    if (!process.env.GITHUB_TOKEN) {
      return res.status(500).json({ error: 'GitHub token not configured' });
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    const REPO_OWNER = 'Materioa';
    const REPO_NAME = 'cdn-materio';

    const method = req.method;

    switch (method) {
      case 'GET':
        // List files or get file info
        let queryPath = req.query.path || '';
        // Decode URL-encoded path (e.g., %2F -> /)
        queryPath = decodeURIComponent(queryPath);
        // Convert '/' to empty string for GitHub API root directory
        if (queryPath === '/') {
          queryPath = '';
        }
        return await listGitHubFiles(octokit, REPO_OWNER, REPO_NAME, queryPath, origin, res);

      case 'POST':
        // Check if this is a staged upload (creates blobs without committing)
        const isStageUpload = req.query.stage === 'true';
        // Check if this is a commit request (commits all staged blobs)
        const isCommitRequest = req.query.commit === 'true';
        // Legacy batch upload (single commit per request)
        const isBatchUpload = req.query.batch === 'true';

        if (isStageUpload) {
          return await stageUploadFiles(req, octokit, REPO_OWNER, REPO_NAME, origin, res);
        } else if (isCommitRequest) {
          return await commitStagedFiles(req, octokit, REPO_OWNER, REPO_NAME, origin, res);
        } else if (isBatchUpload) {
          return await batchUploadGitHubFiles(req, octokit, REPO_OWNER, REPO_NAME, origin, res);
        } else {
          // Regular single file upload
          return await uploadGitHubFile(req, octokit, REPO_OWNER, REPO_NAME, origin, res);
        }

      case 'DELETE':
        // Delete file
        let deletePath = req.query.path;
        if (!deletePath) {
          return res.status(400).json({ error: 'File path required' });
        }
        // Decode URL-encoded path (e.g., %2F -> /)
        deletePath = decodeURIComponent(deletePath);
        // Convert '/' to empty string for GitHub API root directory
        if (deletePath === '/') {
          deletePath = '';
        }
        return await deleteGitHubFile(octokit, REPO_OWNER, REPO_NAME, deletePath, origin, res);

      case 'PUT':
        // Rename file
        const body = req.body;
        const oldPath = body.oldPath;
        const newPath = body.newPath;
        if (!oldPath || !newPath) {
          return res.status(400).json({ error: 'Both oldPath and newPath required' });
        }
        return await renameGitHubFile(octokit, REPO_OWNER, REPO_NAME, oldPath, newPath, origin, res);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('CDN API Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message // Add error details for debugging
    });
  }
};

// Helper function to list GitHub files
async function listGitHubFiles(octokit, owner, repo, path, origin, res) {
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

      return res.status(200).json({
        type: 'directory',
        path: path || '',
        items: fileList.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
      });
    } else {
      // Single file
      return res.status(200).json({
        type: 'file',
        name: data.name,
        size: data.size,
        path: data.path,
        download_url: data.download_url,
        sha: data.sha
      });
    }

  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: 'File or directory not found' });
    }
    console.error('GitHub API Error:', error);
    return res.status(500).json({ error: 'Failed to list files' });
  }
}

// Helper function to upload file to GitHub
async function uploadGitHubFile(req, octokit, owner, repo, origin, res) {
  try {
    console.log('Upload request received');

    // Use formidable to parse the request
    const form = new formidable.IncomingForm({
      multiples: false, // Single file upload
      maxFileSize: 4 * 1024 * 1024, // 4MB - Vercel limit
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Helper to get single value from fields
    const getValue = (key) => {
      const val = fields[key];
      return Array.isArray(val) ? val[0] : val;
    };

    const targetPath = getValue('path') || '';
    const uploadedFile = files.file; // 'file' is the field name

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
    const fileName = file.originalFilename;

    // Read file content
    const fileContent = fs.readFileSync(file.filepath);

    // Additional file size validation for the actual file content
    const NETLIFY_LIMIT = 6 * 1024 * 1024; // 6MB actual Netlify limit
    if (fileContent.length > NETLIFY_LIMIT) {
      return res.status(413).json({
        error: `File "${fileName}" is too large for current hosting. Maximum size is ${Math.round(NETLIFY_LIMIT / 1024 / 1024)}MB due to Netlify Functions limitations. Your file is ${Math.round(fileContent.length / 1024 / 1024)}MB.`
      });
    }

    // Validate file type based on path
    // Allow JSON files for database updates, but restrict course materials to PDFs
    const isDataBaseFile = targetPath.includes('databases/') || fileName.toLowerCase().endsWith('.json');
    const isPdfCourseFile = targetPath.includes('pdfs/') || targetPath.startsWith('pdfs/');

    if (isPdfCourseFile && !fileName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Only PDF files are allowed for course material uploads (pdfs/ directory)' });
    }

    // Allow JSON files for database operations
    if (isDataBaseFile && !fileName.toLowerCase().endsWith('.json') && !fileName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Only JSON files are allowed for database operations' });
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

    return res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        name: fileName,
        path: filePath,
        size: fileContent.length,
        sha: data.content.sha,
        download_url: data.content.download_url
      }
    });

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

    return res.status(statusCode).json({ error: errorMessage });
  }
}

// Helper function to delete file from GitHub
async function deleteGitHubFile(octokit, owner, repo, path, origin, res) {
  try {
    const result = await deleteGitHubFileInternal(octokit, owner, repo, path, origin);
    return res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    console.error('Delete wrapper error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteGitHubFileInternal(octokit, owner, repo, path, origin) {
  try {
    // Get file info to get SHA
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path
    });

    if (Array.isArray(data)) {
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
          const result = await deleteGitHubFileInternal(octokit, owner, repo, item.path, origin);
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
async function renameGitHubFile(octokit, owner, repo, oldPath, newPath, origin, res) {
  try {
    // Get the current file content and SHA
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: oldPath
    });

    if (Array.isArray(fileData)) {
      return res.status(400).json({ error: 'Cannot rename directory' });
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

    return res.status(200).json({
      message: 'File renamed successfully',
      oldPath,
      newPath
    });

  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('GitHub rename error:', error);
    return res.status(500).json({ error: 'Rename failed: ' + error.message });
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
async function batchUploadGitHubFiles(req, octokit, owner, repo, origin, res) {
  try {
    console.log('Upload request received');

    // Use formidable to parse the request
    const form = new formidable.IncomingForm({
      multiples: true,
      maxFileSize: 4 * 1024 * 1024, // 4MB - Vercel limit
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Helper to get single value from fields (formidable v3 might return arrays)
    const getValue = (key) => {
      const val = fields[key];
      return Array.isArray(val) ? val[0] : val;
    };

    const semester = getValue('semester');
    const subject = getValue('subject');
    const category = getValue('category');
    const autoPushNotify = getValue('autoPushNotify') === 'true';
    const basePath = getValue('basePath') || `pdfs/${semester}/${subject}`;

    if (!semester || !subject || !category) {
      return res.status(400).json({ error: 'Missing required fields: semester, subject, category' });
    }

    const uploadedFilesList = files.files; // 'files' is the field name
    if (!uploadedFilesList) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const fileList = Array.isArray(uploadedFilesList) ? uploadedFilesList : [uploadedFilesList];

    // Validate all files are PDFs
    for (const file of fileList) {
      if (!file.originalFilename.toLowerCase().endsWith('.pdf')) {
        return res.status(400).json({ error: `Only PDF files are allowed. File "${file.originalFilename}" is not a PDF.` });
      }
    }

    console.log(`Starting upload: ${fileList.length} files for ${subject} - ${category}`);

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
    for (const file of fileList) {
      const filePath = `${basePath}/${file.originalFilename}`;

      // Read file content
      const content = fs.readFileSync(file.filepath);

      // Create blob for the file content (GitHub expects base64 for blob creation)
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: content.toString('base64'),
        encoding: 'base64'
      });

      treeItems.push({
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha // Reference the blob by SHA instead of including content
      });

      uploadedFiles.push({
        name: file.originalFilename.replace(/\.[^/.]+$/, ""), // Remove extension
        path: filePath,
        filename: file.originalFilename,
        size: file.size
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

    return res.status(200).json({
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      commit: newCommit.sha,
      files: uploadedFiles,
      updatedDatabase: true,
      notificationCreated: autoPushNotify
    });

  } catch (error) {
    console.error('Upload error:', error);

    return res.status(500).json({
      error: error.message || 'Failed to process upload'
    });
  }
}

// Stage upload function - creates blobs without committing
// Returns blob SHAs that can be used in a later commit
async function stageUploadFiles(req, octokit, owner, repo, origin, res) {
  try {
    console.log('Stage upload request received');

    const form = new formidable.IncomingForm({
      multiples: true,
      maxFileSize: 4 * 1024 * 1024, // 4MB - Vercel limit
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const getValue = (key) => {
      const val = fields[key];
      return Array.isArray(val) ? val[0] : val;
    };

    const semester = getValue('semester');
    const subject = getValue('subject');
    const category = getValue('category');
    const basePath = getValue('basePath') || `pdfs/${semester}/${subject}`;

    if (!semester || !subject || !category) {
      return res.status(400).json({ error: 'Missing required fields: semester, subject, category' });
    }

    const uploadedFilesList = files.files;
    if (!uploadedFilesList) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const fileList = Array.isArray(uploadedFilesList) ? uploadedFilesList : [uploadedFilesList];

    // Validate all files are PDFs
    for (const file of fileList) {
      if (!file.originalFilename.toLowerCase().endsWith('.pdf')) {
        return res.status(400).json({ error: `Only PDF files are allowed. File "${file.originalFilename}" is not a PDF.` });
      }
    }

    console.log(`Staging ${fileList.length} files for ${subject} - ${category}`);

    // Create blobs for all files
    const stagedFiles = [];
    for (const file of fileList) {
      const filePath = `${basePath}/${file.originalFilename}`;

      // Read file content
      const content = fs.readFileSync(file.filepath);

      // Create blob for the file content
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: content.toString('base64'),
        encoding: 'base64'
      });

      stagedFiles.push({
        path: filePath,
        sha: blob.sha,
        name: file.originalFilename.replace(/\.[^/.]+$/, ""),
        filename: file.originalFilename,
        size: file.size,
        semester,
        subject,
        category
      });
    }

    console.log(`Staged ${stagedFiles.length} files successfully`);

    return res.status(200).json({
      message: `Staged ${stagedFiles.length} files`,
      stagedFiles,
      semester,
      subject,
      category
    });

  } catch (error) {
    console.error('Stage upload error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to stage files'
    });
  }
}

// Commit staged files function - creates a single commit with all staged blobs
async function commitStagedFiles(req, octokit, owner, repo, origin, res) {
  try {
    console.log('Commit staged files request received');

    // Parse JSON body (not multipart for this request)
    let body = req.body;

    // If body wasn't parsed (e.g., when bodyParser is disabled), read it manually
    if (!body || Object.keys(body).length === 0) {
      body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON body'));
          }
        });
        req.on('error', reject);
      });
    }

    const { stagedFiles, stagedJsonFiles, autoPushNotify } = body;

    // Allow commit with just staged JSON files
    const hasFiles = stagedFiles && Array.isArray(stagedFiles) && stagedFiles.length > 0;
    const hasJsonEdits = stagedJsonFiles && Array.isArray(stagedJsonFiles) && stagedJsonFiles.length > 0;

    if (!hasFiles && !hasJsonEdits) {
      return res.status(400).json({ error: 'No staged files or JSON edits provided' });
    }

    const fileCount = hasFiles ? stagedFiles.length : 0;
    const jsonCount = hasJsonEdits ? stagedJsonFiles.length : 0;
    console.log(`Committing ${fileCount} staged files + ${jsonCount} JSON edits`);

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

    // Build tree items from staged files
    const treeItems = [];

    // Add staged PDF files
    if (hasFiles) {
      stagedFiles.forEach(file => {
        treeItems.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: file.sha
        });
      });
    }

    // Add staged JSON edits (these are content-based, not blob SHAs)
    if (hasJsonEdits) {
      stagedJsonFiles.forEach(jsonFile => {
        treeItems.push({
          path: jsonFile.path,
          mode: '100644',
          type: 'blob',
          content: jsonFile.content
        });
      });
    }

    // Group files by semester/subject for metadata updates (only for PDF uploads)
    const groupedFiles = {};
    if (hasFiles) {
      stagedFiles.forEach(file => {
        const key = `${file.semester}|${file.subject}|${file.category}`;
        if (!groupedFiles[key]) {
          groupedFiles[key] = {
            semester: file.semester,
            subject: file.subject,
            category: file.category,
            files: []
          };
        }
        groupedFiles[key].files.push(file);
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
      semesterSubjectMappings = {};
    }

    // Update semester-subject mappings for all groups
    let mappingsUpdated = false;
    Object.values(groupedFiles).forEach(group => {
      if (!semesterSubjectMappings[group.semester]) {
        semesterSubjectMappings[group.semester] = [];
      }
      if (!semesterSubjectMappings[group.semester].includes(group.subject)) {
        semesterSubjectMappings[group.semester].push(group.subject);
        mappingsUpdated = true;
      }
    });

    if (mappingsUpdated) {
      treeItems.push({
        path: 'databases/semester-subjects.json',
        mode: '100644',
        type: 'blob',
        content: JSON.stringify(semesterSubjectMappings, null, 2)
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
      resourceLib = {};
    }

    // Update resource library for all groups
    Object.values(groupedFiles).forEach(group => {
      if (!resourceLib[group.semester]) {
        resourceLib[group.semester] = {};
      }
      if (!resourceLib[group.semester][group.subject]) {
        resourceLib[group.semester][group.subject] = [];
      }

      let categoryIndex = resourceLib[group.semester][group.subject].findIndex(item => item.type === group.category);
      if (categoryIndex === -1) {
        resourceLib[group.semester][group.subject].push({
          type: group.category,
          content: []
        });
        categoryIndex = resourceLib[group.semester][group.subject].length - 1;
      }

      const fileNames = group.files.map(file => file.name);
      resourceLib[group.semester][group.subject][categoryIndex].content.push(...fileNames);
    });

    treeItems.push({
      path: 'databases/beta/resource.lib.json',
      mode: '100644',
      type: 'blob',
      content: JSON.stringify(resourceLib, null, 2)
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
        notifications = [];
      }

      // Create notification summarizing all uploads
      const groupCount = Object.keys(groupedFiles).length;
      const totalFiles = hasFiles ? stagedFiles.length : 0;

      // Helper function to format list with 'and' for last item
      const formatList = (items) => {
        if (items.length === 0) return '';
        if (items.length === 1) return items[0];
        if (items.length === 2) return `${items[0]} and ${items[1]}`;
        return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
      };

      let message;
      if (groupCount === 0) {
        // Only JSON edits, no file uploads
        message = 'Database files have been updated.';
      } else if (groupCount === 1) {
        const group = Object.values(groupedFiles)[0];
        message = `${totalFiles} new materials have been added in ${group.category} category of ${group.subject}.`;
      } else {
        // Strategy 1: Group by Category (Best for: "Syllabus of A, B, C")
        const categoryGroups = {};
        Object.values(groupedFiles).forEach(g => {
          if (!categoryGroups[g.category]) {
            categoryGroups[g.category] = { count: 0, subjects: [] };
          }
          categoryGroups[g.category].count += g.files.length;
          if (!categoryGroups[g.category].subjects.includes(g.subject)) {
            categoryGroups[g.category].subjects.push(g.subject);
          }
        });

        // Strategy 2: Group by Subject (Best for: "Paper 1 and Paper 2 of Math")
        const subjectGroups = {};
        Object.values(groupedFiles).forEach(g => {
          if (!subjectGroups[g.subject]) {
            subjectGroups[g.subject] = {};
          }
          if (!subjectGroups[g.subject][g.category]) {
            subjectGroups[g.subject][g.category] = 0;
          }
          subjectGroups[g.subject][g.category] += g.files.length;
        });

        const numCategories = Object.keys(categoryGroups).length;
        const numSubjects = Object.keys(subjectGroups).length;

        // Choose the strategy with fewer top-level groups
        if (numSubjects < numCategories) {
          // Use Subject grouping
          const subjectParts = Object.entries(subjectGroups).map(([subject, cats]) => {
            const catList = Object.entries(cats).map(([cat, count]) => `${count} in ${cat}`);
            const categoryWord = catList.length > 1 ? 'categories' : 'category';
            return `${formatList(catList)} ${categoryWord} of ${subject}`;
          });
          message = `New materials uploaded: ${formatList(subjectParts)}.`;
        } else {
          // Use Category grouping (default)
          const categoryParts = Object.entries(categoryGroups).map(([cat, data]) => {
            const subjectCount = data.subjects.length;
            const categoryWord = subjectCount > 1 ? 'categories' : 'category';
            const subjectList = formatList(data.subjects);
            return `${data.count} in ${cat} ${categoryWord} of ${subjectList}`;
          });
          message = `New materials uploaded: ${formatList(categoryParts)}.`;
        }
      }


      const notification = {
        title: "New Materials Uploaded!",
        message,
        date: new Date().toISOString(),
        links: []
      };

      notifications.unshift(notification);

      treeItems.push({
        path: 'notifications.json',
        mode: '100644',
        type: 'blob',
        content: JSON.stringify(notifications, null, 2)
      });
    }

    // Create new tree with all changes
    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      tree: treeItems,
      base_tree: baseTreeSha
    });

    // Create single commit with all changes
    let commitMessage = '';

    if (hasFiles) {
      const groupSummaries = Object.values(groupedFiles).map(g => `${g.files.length} in ${g.subject}/${g.category}`).join(', ');
      commitMessage = `Uploaded ${fileCount} files: ${groupSummaries}`;
    }

    if (hasJsonEdits) {
      const jsonFileNames = stagedJsonFiles.map(f => f.path.split('/').pop()).join(', ');
      if (commitMessage) {
        commitMessage += ` + Edited ${jsonCount} JSON: ${jsonFileNames}`;
      } else {
        commitMessage = `Edited ${jsonCount} JSON files: ${jsonFileNames}`;
      }
    }

    commitMessage += `${autoPushNotify ? ' (with notification)' : ''} via Materio CMS`;

    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.sha,
      parents: [latestCommitSha]
    });

    // Update the reference
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: newCommit.sha
    });

    console.log('All files committed successfully:', newCommit.sha);

    const totalItems = fileCount + jsonCount;
    return res.status(200).json({
      message: `Successfully committed ${totalItems} item(s) (${fileCount} files, ${jsonCount} JSON edits)`,
      commit: newCommit.sha,
      files: hasFiles ? stagedFiles : [],
      jsonEdits: hasJsonEdits ? stagedJsonFiles.map(f => f.path) : [],
      updatedDatabase: hasFiles,
      notificationCreated: autoPushNotify
    });

  } catch (error) {
    console.error('Commit error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to commit staged files'
    });
  }
}

// Disable body parser for this function to allow formidable to handle multipart data
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

