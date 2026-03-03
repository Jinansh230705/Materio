const os = require('os');
const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = require('../_config_shared/supabase');
const { getMongoDb } = require('../_config_shared/mongodb');
const { logError, getErrorsLastHour } = require('../_utils_shared/error-tracker');
const { sendIncidentEmail, sendAlertEmail, ALERT_EMAIL } = require('../_utils_shared/mailer');
const { getBugReportTemplate, getAlertTemplate } = require('../_utils_shared/email-templates');
const fs = require('fs');
const path = require('path');

// For AI summaries via OpenRouter
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.NETLIFY_OPENROUTER_API_KEY;
// Lightest/fastest free models for incident summaries (tried in order)
const SUMMARY_MODELS = [
  'openai/gpt-oss-20b:free',
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

// --- Incident.io Status Page (public, free — kept for status checks) ---
const INCIDENT_IO_SUMMARY_URL = 'https://statuspage.incident.io/materio/api/v1/summary';

// --- Spam Prevention Config ---
const SPAM_CONFIG = {
  maxReportsPerIP: 10,         // Max reports per IP within the window
  ipWindowMinutes: 60,         // IP rate limit window (1 hour)
  minDescriptionLength: 20,    // Minimum description length
  maxReportsPerSession: 6,     // Max reports per browser session in window
  sessionWindowMinutes: 30,    // Session rate limit window
  duplicateWindowMinutes: 60,  // Window to check for duplicate content
  similarityThreshold: 0.8,    // Text similarity threshold for duplicate detection
  bannedPatterns: [            // Patterns that indicate spam
    /(.)\1{10,}/,              // Repeated characters (10+)
    /^[a-z]{1,3}$/i,           // Too-short gibberish
    /https?:\/\/[^\s]+/gi,     // URLs in description (potential spam)
    /buy|sell|cheap|discount|click here|subscribe|winner/gi, // Spam keywords
  ],
};

// --- Incident Automation Config ---
const INCIDENT_AUTO_CONFIG = {
  clusterThreshold: 2,         // Number of reports to trigger incident
  clusterWindowHours: 3,       // Time window for clustering (3 hours)
  cooldownMinutes: 30,         // Cooldown before creating another incident
};

// --- Read version from releases.json ---
let VERSION = '4.6.0.1';
try {
  const possiblePaths = [
    path.join(__dirname, '../../assets/data/releases.json'),
    path.join(__dirname, '../../../assets/data/releases.json'),
  ];

  for (const releasesPath of possiblePaths) {
    if (fs.existsSync(releasesPath)) {
      const releases = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));
      if (releases && releases.length > 0) {
        VERSION = releases[0].version;
      }
      break;
    }
  }
} catch (err) {
  console.error('Failed to read releases.json:', err.message);
}

// --- Configurable constants ---
const BUILD_COMMIT = process.env.BUILD_COMMIT || process.env.COMMIT_REF || 'Production';
const REGION = process.env.AWS_REGION || process.env.AWS_LAMBDA_FUNCTION_REGION || process.env.NETLIFY_REGION || 'unknown';

// --- Read build_id from build_history.json ---
let BUILD_ID = 'unknown';
let BUILD_TIME = 'unknown';

try {
  const historyPath = path.join(__dirname, '../../_data/build_history.json');
  if (fs.existsSync(historyPath)) {
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    if (history && history.length > 0) {
      BUILD_ID = history[0].build_id;
      BUILD_TIME = history[0].timestamp;
    }
  }
} catch (err) {
  console.error('Failed to read build_history.json:', err.message);
}

// --- Initialize Supabase client ---
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// --- CORS Headers ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

// --- Helper: Check Supabase connectivity ---
async function checkSupabase() {
  if (!supabase) return { status: 'skipped', message: 'Supabase not configured' };

  const startTime = Date.now();
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error && error.message !== 'Auth session missing!') throw error;
    const latency = Date.now() - startTime;
    return { status: 'connected', latencyMs: latency };
  } catch (err) {
    const latency = Date.now() - startTime;
    logError('supabase', err.message);
    return { status: 'error', message: err.message, latencyMs: latency };
  }
}

// --- Helper: Check external CDN API ---
async function checkCdnAPI() {
  const startTime = Date.now();
  try {
    const res = await fetch('https://cdn-materioa.vercel.app/api/health', {
      method: 'GET',
      headers: { 'User-Agent': 'Materio-Health-Check' }
    });
    const latency = Date.now() - startTime;

    if (!res.ok) throw new Error(`Status ${res.status}`);

    // Try to parse response to ensure it's valid
    const data = await res.json();

    return {
      status: 'ok',
      message: 'CDN is healthy',
      responseStatus: res.status,
      latencyMs: latency
    };
  } catch (err) {
    const latency = Date.now() - startTime;
    logError('cdn_api', err.message);
    return {
      status: 'error',
      message: err.message,
      latencyMs: latency
    };
  }
}

// --- Helper: Check for general internet connectivity ---
async function checkInternetConnection() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(timeout);
    return !!res;
  } catch (err) {
    return false;
  }
}

// --- Helper: Check incident.io for active incidents (public widgets API) ---
async function checkIncidentIO() {
  try {
    const res = await fetch(INCIDENT_IO_SUMMARY_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      return { hasIncident: false, incident: null };
    }

    const data = await res.json();
    const ongoingIncidents = data.ongoing_incidents || [];
    const inProgressMaintenances = data.in_progress_maintenances || [];

    if (ongoingIncidents.length > 0) {
      const incident = ongoingIncidents[0];
      return {
        hasIncident: true,
        incident: {
          id: incident.id,
          name: incident.name,
          impact: incident.current_worst_impact || 'partial_outage',
          status: incident.status,
          url: incident.url
        }
      };
    }

    if (inProgressMaintenances.length > 0) {
      const maintenance = inProgressMaintenances[0];
      return {
        hasIncident: true,
        incident: {
          id: maintenance.id,
          name: maintenance.name,
          impact: 'maintenance',
          status: 'in_progress',
          url: maintenance.url
        }
      };
    }

    return { hasIncident: false, incident: null };
  } catch (err) {
    return { hasIncident: false, incident: null };
  }
}

// =============================================
// --- Spam Prevention Helpers ---
// =============================================

/**
 * Compute simple text similarity (Jaccard on word sets)
 */
function textSimilarity(a, b) {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Check if report content matches banned spam patterns
 */
function containsSpamPatterns(text) {
  return SPAM_CONFIG.bannedPatterns.some(pattern => pattern.test(text));
}

/**
 * Validate and sanitize bug report, check for spam
 * Returns { valid: boolean, reason?: string }
 */
async function validateBugReport(report, clientIP, sessionId) {
  // 1. Basic field validation
  if (!report.title || report.title.trim().length < 5) {
    return { valid: false, reason: 'Bug title must be at least 5 characters' };
  }
  if (!report.description || report.description.trim().length < SPAM_CONFIG.minDescriptionLength) {
    return { valid: false, reason: `Description must be at least ${SPAM_CONFIG.minDescriptionLength} characters` };
  }
  if (!report.severity || !['critical', 'major', 'minor', 'cosmetic'].includes(report.severity)) {
    return { valid: false, reason: 'Invalid severity level' };
  }
  if (!report.affectedArea) {
    return { valid: false, reason: 'Affected area is required' };
  }

  // 2. Spam pattern detection
  const combinedText = `${report.title} ${report.description} ${report.stepsToReproduce || ''}`;
  if (containsSpamPatterns(combinedText)) {
    return { valid: false, reason: 'Report contains disallowed content' };
  }

  // 3. Rate limiting checks (MongoDB-backed)
  try {
    const db = await getMongoDb();
    const reportsCollection = db.collection('bug_reports');
    const now = new Date();

    // 3a. IP rate limit
    const ipWindowStart = new Date(now.getTime() - SPAM_CONFIG.ipWindowMinutes * 60 * 1000);
    const recentByIP = await reportsCollection.countDocuments({
      'meta.ip': clientIP,
      reportedAt: { $gte: ipWindowStart }
    });
    if (recentByIP >= SPAM_CONFIG.maxReportsPerIP) {
      return { valid: false, reason: 'Too many reports from this network. Please try again later.' };
    }

    // 3b. Session rate limit
    if (sessionId) {
      const sessionWindowStart = new Date(now.getTime() - SPAM_CONFIG.sessionWindowMinutes * 60 * 1000);
      const recentBySession = await reportsCollection.countDocuments({
        'meta.sessionId': sessionId,
        reportedAt: { $gte: sessionWindowStart }
      });
      if (recentBySession >= SPAM_CONFIG.maxReportsPerSession) {
        return { valid: false, reason: 'You have submitted too many reports recently. Please wait before submitting again.' };
      }
    }

    // 3c. Duplicate content detection
    const dupWindowStart = new Date(now.getTime() - SPAM_CONFIG.duplicateWindowMinutes * 60 * 1000);
    const recentReports = await reportsCollection.find(
      { reportedAt: { $gte: dupWindowStart } },
      { projection: { title: 1, description: 1 } }
    ).sort({ reportedAt: -1 }).limit(50).toArray();

    for (const existing of recentReports) {
      const titleSim = textSimilarity(report.title, existing.title || '');
      const descSim = textSimilarity(report.description, existing.description || '');
      if (titleSim >= SPAM_CONFIG.similarityThreshold && descSim >= SPAM_CONFIG.similarityThreshold) {
        return { valid: false, reason: 'A very similar report has already been submitted recently. Thank you!' };
      }
    }
  } catch (err) {
    // If MongoDB is unavailable, allow the report but log
    console.error('Spam check MongoDB error (allowing report):', err.message);
  }

  return { valid: true };
}

// =============================================
// --- Incident Automation ---
// =============================================

/**
 * Call OpenRouter with the lightest model to generate a plain-text incident summary.
 * Falls back to a deterministic summary if AI is unavailable.
 *
 * @param {Array} reports - Array of bug report documents
 * @returns {Promise<string>} Plain text summary
 */
async function generateAISummary(reports) {
  const reportLines = reports.map(r =>
    `[${r.severity.toUpperCase()}] ${r.title} — ${r.affectedArea}: ${r.description.substring(0, 300)}`
  );

  const prompt = `Summarize this user incident cluster for a status page incident.

Include:
- Root symptom
- Affected system
- User impact
- Time pattern
- Confidence level

Reports:
${reportLines.join('\n')}

Respond in plain text only (no markdown, no bullet symbols, no asterisks). Keep it under 6 lines. Be concise and direct like this example:

Users are experiencing failures loading PDFs in the document viewer.
Issue appears concentrated in Chrome v141 in India region.
First report detected at 14:02 UTC and increasing.
Impact: Users cannot open study materials.
Confidence: High.`;

  if (!OPENROUTER_API_KEY) {
    console.warn('[AI Summary] No OpenRouter API key — using fallback summary');
    return null;
  }

  // Try each model in order (lightest first)
  for (const model of SUMMARY_MODELS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s max

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://materioa.vercel.app',
          'X-Title': 'Materio Incident Monitor'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a concise incident summarizer for a web application called Materio. Output plain text only. No markdown formatting, no bullet points, no asterisks.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 300
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[AI Summary] Model ${model} returned ${response.status}, trying next...`);
        continue;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();

      if (text && text.length > 20) {
        return text;
      }
    } catch (err) {
      console.warn(`[AI Summary] Model ${model} failed: ${err.message}`);
      continue;
    }
  }

  console.warn('[AI Summary] All models failed — using fallback');
  return null;
}

/**
 * Build structured incident data from a cluster of reports.
 * Uses AI summary when available, deterministic fallback otherwise.
 *
 * @param {Array} reports - Clustered bug reports
 * @returns {Promise<Object>} Incident data with name, summary, severity, etc.
 */
async function buildIncidentSummary(reports) {
  const areas = [...new Set(reports.map(r => r.affectedArea))];
  const severities = reports.map(r => r.severity);
  const worstSeverity = ['critical', 'major', 'minor', 'cosmetic'].find(s => severities.includes(s)) || 'minor';
  const timestamps = reports.map(r => new Date(r.reportedAt).toISOString());
  const timeRange = `${timestamps[0]} to ${timestamps[timestamps.length - 1]}`;
  const rootSymptom = reports[0].title;
  const confidence = reports.length >= 5 ? 'High' : reports.length >= 3 ? 'Medium' : 'Low';

  // Try AI summary first
  let summary = await generateAISummary(reports);

  // Deterministic fallback if AI fails
  if (!summary) {
    const affectedSystems = areas.join(', ');
    const userImpact = worstSeverity === 'critical'
      ? 'Users unable to use core functionality.'
      : worstSeverity === 'major'
        ? 'Significant feature degradation affecting user workflows.'
        : 'Minor inconvenience affecting some users.';

    const reportLines = reports.map(r =>
      `[${r.severity.toUpperCase()}] ${r.title} — ${r.affectedArea}: ${r.description.substring(0, 200)}`
    );

    summary = [
      `Root Symptom: ${rootSymptom}`,
      `Affected System: ${affectedSystems}`,
      `User Impact: ${userImpact}`,
      `Time Pattern: ${reports.length} reports between ${timeRange}`,
      `Confidence Level: ${confidence}`,
      '',
      'Reports:',
      ...reportLines
    ].join('\n');
  }

  return {
    name: `[Auto] ${rootSymptom} (+${reports.length - 1} related)`,
    summary,
    severity: worstSeverity,
    affectedAreas: areas,
    reportCount: reports.length,
    aiGenerated: summary !== null
  };
}

/**
 * Check if recent reports form a cluster and auto-create an incident
 */
async function checkAndCreateIncident() {
  try {
    const db = await getMongoDb();
    const reportsCollection = db.collection('bug_reports');
    const incidentsCollection = db.collection('auto_incidents');
    const now = new Date();

    // Check cooldown — don't create incidents too frequently
    const cooldownStart = new Date(now.getTime() - INCIDENT_AUTO_CONFIG.cooldownMinutes * 60 * 1000);
    const recentIncident = await incidentsCollection.findOne(
      { createdAt: { $gte: cooldownStart } },
      { sort: { createdAt: -1 } }
    );
    if (recentIncident) {
      return null;
    }

    // Find reports in the cluster window
    const windowStart = new Date(now.getTime() - INCIDENT_AUTO_CONFIG.clusterWindowHours * 60 * 60 * 1000);
    const recentReports = await reportsCollection.find({
      reportedAt: { $gte: windowStart },
      status: { $ne: 'spam' },
      _incidentCreated: { $ne: true }
    }).sort({ reportedAt: 1 }).toArray();

    if (recentReports.length < INCIDENT_AUTO_CONFIG.clusterThreshold) {
      return null;
    }

    // Also check same-day clustering
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todaysReports = recentReports.filter(r => new Date(r.reportedAt) >= todayStart);

    if (todaysReports.length < INCIDENT_AUTO_CONFIG.clusterThreshold && recentReports.length < INCIDENT_AUTO_CONFIG.clusterThreshold) {
      return null;
    }

    // Use the larger cluster
    const cluster = todaysReports.length >= recentReports.length ? todaysReports : recentReports;
    const incidentData = await buildIncidentSummary(cluster);

    // Send incident alert via SMTP email (skip cosmetic severity - not incident-worthy)
    let emailResult = null;
    if (incidentData.severity !== 'cosmetic') {
      try {
        emailResult = await sendIncidentEmail(incidentData);
        if (!emailResult.success) {
          console.warn('Incident email not sent:', emailResult.error);
        }
      } catch (err) {
        console.error('Failed to send incident email:', err.message);
      }
    }

    // Record the auto-incident in MongoDB
    const incidentRecord = {
      createdAt: now,
      reportIds: cluster.map(r => r._id),
      reportCount: cluster.length,
      name: incidentData.name,
      summary: incidentData.summary,
      severity: incidentData.severity,
      affectedAreas: incidentData.affectedAreas,
      aiGenerated: incidentData.aiGenerated || false,
      emailSent: emailResult ? {
        success: emailResult.success,
        messageId: emailResult.messageId || null,
        error: emailResult.error || null,
      } : null,
    };

    await incidentsCollection.insertOne(incidentRecord);

    // Mark reports as linked to this incident
    await reportsCollection.updateMany(
      { _id: { $in: cluster.map(r => r._id) } },
      { $set: { _incidentCreated: true, _incidentId: incidentRecord._id } }
    );

    return incidentRecord;
  } catch (err) {
    console.error('Incident automation error:', err.message);
    return null;
  }
}

// =============================================
// --- /report Endpoint Handler ---
// =============================================

async function handleBugReport(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = req.body;
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' });
    }

    const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const sessionId = body.sessionId || null;

    // Validate required fields synchronously (fast, no DB)
    const requiredFields = ['title', 'severity', 'description', 'affectedArea'];
    for (const field of requiredFields) {
      if (!body[field] || (typeof body[field] === 'string' && !body[field].trim())) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // Build report document
    const report = {
      title: body.title.trim(),
      severity: body.severity,
      affectedArea: body.affectedArea,
      description: body.description.trim(),
      stepsToReproduce: body.stepsToReproduce ? body.stepsToReproduce.trim() : null,
      email: body.email || null,
      reportedAt: new Date(),
      status: 'open',
      meta: {
        ip: clientIP,
        userAgent: req.headers['user-agent'] || 'unknown',
        referrer: req.headers['referer'] || null,
        origin: req.headers['origin'] || null,
        sessionId: sessionId,
        appVersion: VERSION,
      },
      _incidentCreated: false,
      _incidentId: null,
    };

    // Spam check (includes DB-backed rate limiting)
    const validation = await validateBugReport(body, clientIP, sessionId);
    if (!validation.valid) {
      // Still return success to not reveal spam detection to potential abusers
      return res.status(201).json({
        success: true,
        message: 'Bug report submitted successfully. Thank you for helping improve Materio!',
        reportId: 'filtered',
      });
    }

    // Save to MongoDB before responding (don't fire-and-forget — serverless
    // runtimes like Vercel can freeze the function after the response is sent,
    // which silently kills any pending background work including DB writes)
    const db = await getMongoDb();
    const reportsCollection = db.collection('bug_reports');
    const insertResult = await reportsCollection.insertOne(report);

    // Run incident automation BEFORE responding — serverless runtimes freeze
    // the function after the response is sent, killing any pending async work
    try {
      await checkAndCreateIncident();
    } catch (err) {
      console.error('Incident check failed (non-fatal):', err.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Bug report submitted successfully. Thank you for helping improve Materio!',
      reportId: insertResult.insertedId.toString(),
    });

  } catch (error) {
    console.error('Bug report error:', error);
    logError('bug_report', error.message);

    // Fallback: try to send report via email so it's not lost
    if (body && body.title) {
      try {
        await sendAlertEmail({
          subject: `${body.severity === 'critical' ? '🔴' : '🟡'} Bug Report (Fallback): ${body.title}`,
          text: `[FALLBACK] MongoDB was unavailable.\nTitle: ${body.title}\nSeverity: ${body.severity}\nDescription: ${body.description}`,
          html: getBugReportTemplate(body, true)
        });
      } catch (mailError) {
        console.error('Fatal: Both MongoDB and Email fallback failed:', mailError.message);
      }
    }

    return res.status(500).json({
      error: 'Failed to submit bug report. Please try again later.',
      details: error.message
    });
  }
}

// =============================================
// --- /alert Endpoint Handler (SMTP) ---
// =============================================

/**
 * POST /api/v2/health/alert
 * Sends a custom alert/incident email via SMTP.
 * Body: { subject, message, severity?, to? }
 *
 * Requires a simple shared secret to prevent abuse:
 *   Header: x-alert-key  (must match env ALERT_SECRET)
 */
async function handleAlertEmail(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // Simple auth gate — if ALERT_SECRET is set, require it
    const alertSecret = process.env.ALERT_SECRET || '';
    if (alertSecret) {
      const provided = req.headers['x-alert-key'] || '';
      if (provided !== alertSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const body = req.body;
    if (!body || !body.subject || !body.message) {
      return res.status(400).json({ error: 'Required fields: subject, message' });
    }

    const severity = body.severity || 'minor';
    const subject = `[Materio Alert] ${body.subject}`;
    const text = `[${severity.toUpperCase()}] ${body.subject}\n\n${body.message}`;
    const html = getAlertTemplate(body.subject, body.message, severity);

    const result = await sendAlertEmail({
      to: body.to || ALERT_EMAIL,
      subject,
      text,
      html,
    });

    if (result.success) {
      return res.status(200).json({ success: true, messageId: result.messageId });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Alert email error:', error);
    logError('alert_email', error.message);
    return res.status(500).json({ error: 'Failed to send alert email' });
  }
}

// =============================================
// --- /test-incident-email Endpoint (Preview) ---
// =============================================

/**
 * GET /api/v2/health/test-incident-email or ?action=test-incident-email
 * Renders a sample incident email template for preview without sending
 */
async function handleTestIncidentEmail(req, res) {
  // Hosted logo URL (more reliable for email clients)
  const LOGO_URL = 'https://materioa.vercel.app/assets/img/materio.png';

  const sampleIncident = {
    name: '[Auto] PDF loading failures in Chrome (+3 related)',
    summary: `Users are reporting issues with testing and verification processes.
Affected systems include general application functionality, TLS, performance, and the mailer service.
Impact: Users are unable to reliably report bugs or confirm fixes, and may not receive alert emails.
Reports began increasing around 14:00 UTC and continue with intermittent frequency.
Confidence: Medium.`,
    severity: 'major',
    affectedAreas: ['Document Viewer', 'PDF Processing'],
    reportCount: 4,
    aiGenerated: true,
  };

  const { name, summary, severity, affectedAreas, reportCount } = sampleIncident;

  const SEVERITY_COLORS = {
    critical: '#DC2626',
    major: '#EA580C',
    minor: '#CA8A04',
    cosmetic: '#6B7280',
  };

  // Severity-based background colors with transparency for the header
  const SEVERITY_HEADER_BG = {
    critical: 'rgba(220, 38, 38, 0.15)',
    major: 'rgba(234, 88, 12, 0.15)',
    minor: 'rgba(202, 138, 4, 0.15)',
    cosmetic: 'rgba(107, 114, 128, 0.15)',
  };

  const SEVERITY_HEADER_BORDER = {
    critical: '#DC2626',
    major: '#EA580C',
    minor: '#CA8A04',
    cosmetic: '#6B7280',
  };

  const color = SEVERITY_COLORS[severity] || '#6B7280';
  const headerBg = SEVERITY_HEADER_BG[severity] || 'rgba(107, 114, 128, 0.15)';
  const headerBorder = SEVERITY_HEADER_BORDER[severity] || '#6B7280';

  // Format date nicely: "February 7th 2026, 2:40 PM IST"
  const dateObj = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = dateObj.getDate();
  const suffix = (day === 1 || day === 21 || day === 31) ? 'st' : (day === 2 || day === 22) ? 'nd' : (day === 3 || day === 23) ? 'rd' : 'th';
  const formattedDate = `${months[dateObj.getMonth()]} ${day}${suffix} ${dateObj.getFullYear()}, ${dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} IST`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
    body { margin: 0; padding: 20px; background: #ffffff; font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div style="max-width:600px;margin:24px auto;">
    <!-- Logo -->
    <div style="margin-bottom:24px;">
      <img src="${LOGO_URL}" alt="materio." width="180" height="38" style="display:block;" />
    </div>
    
    <!-- Outer card container -->
    <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;padding:24px;">
      <!-- Combined Header + Info card -->
      <div style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <!-- Header: rounded top, flat bottom -->
        <div style="background:${headerBg};padding:16px 20px;">
          <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;line-height:1.4;color:#1f2937;">${escapeHtml(name.replace(/\[Auto\] /, ''))}</h2>
          <div style="font-size:13px;">
            <span style="color:${color};font-weight:600;">Incident created</span>
            <span style="color:#6b7280;margin-left:12px;">Started ${formattedDate}</span>
          </div>
        </div>
        <!-- Info section: flat top, rounded bottom -->
        <div style="padding:16px 20px;font-size:14px;line-height:1.8;color:#1f2937;background:#fff;">
          <div><strong>Severity</strong> : <span style="color:${color};font-weight:600;">${severity.charAt(0).toUpperCase() + severity.slice(1)}</span></div>
          <div><strong>Affected Areas:</strong> ${escapeHtml(affectedAreas.join(', '))}</div>
          <div><strong>Reports:</strong> ${reportCount} clustered reports</div>
        </div>
      </div>
      
      <!-- Summary section: rounded corners, thin gray border -->
      <div style="background:#fafafa;padding:16px 20px;margin-bottom:24px;border-radius:12px;border:1px solid #e5e7eb;">
        <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1f2937;">Summary</h3>
        <div style="font-size:13px;line-height:1.7;color:#4b5563;">${escapeHtml(summary).replace(/\n/g, '<br>')}</div>
      </div>
      
      <!-- Footer -->
      <div style="text-align:center;font-size:12px;color:#9ca3af;">
        This incident is auto generated by Materio's incident reporting system's
      </div>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}

// --- HTML escaping helper ---
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Main Handler ---
module.exports = async (req, res) => {
  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Robust path resolution for Vercel Dev and Production
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);

  // Resolve the original request path
  const capturedPath = req.query && req.query.path
    ? (Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path))
    : '';
  const originalPath = req.headers['x-matched-path'] || req.headers['x-original-url'] || url.pathname || '';

  // Also check query parameter 'action' for consistency with features API
  const action = req.query?.action || url.searchParams.get('action') || '';

  const isReport = capturedPath.includes('report') || originalPath.includes('/report') || action === 'report';
  const isAlert = capturedPath.includes('alert') || originalPath.includes('/alert') || action === 'alert';
  const isTestEmail = capturedPath.includes('test-incident-email') || originalPath.includes('/test-incident-email') || action === 'test-incident-email';

  // Route: /api/v2/health/report or ?action=report
  if (isReport) {
    return handleBugReport(req, res);
  }

  // Route: /api/v2/health/alert or ?action=alert
  if (isAlert) {
    return handleAlertEmail(req, res);
  }

  // Route: /api/v2/health/test-incident-email or ?action=test-incident-email
  // Preview incident email template without sending
  if (isTestEmail) {
    return handleTestIncidentEmail(req, res);
  }

  // Route: /api/v2/health (GET only)
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      debug: { path: originalPath, action, method: req.method }
    });
  }

  try {
    const requestStartTime = Date.now();

    // --- System metrics ---
    const memoryUsage = process.memoryUsage();
    const cpuLoad = os.loadavg();
    const uptime = process.uptime();

    // --- Dependency checks ---
    const [supabaseStatus, cdnStatus, incidentStatus] = await Promise.all([
      checkSupabase(),
      checkCdnAPI(),
      checkIncidentIO(),
    ]);

    // --- Build info ---
    const build = {
      version: VERSION,
      commit: BUILD_COMMIT,
      builtAt: BUILD_TIME,
      buildId: BUILD_ID,
      region: REGION,
      nodeVersion: process.version,
      platform: os.platform(),
    };

    // --- System info ---
    const system = {
      uptimeSeconds: uptime,
      cpuLoad,
      memory: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
      },
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      cpus: os.cpus().length,
    };

    // --- Dependencies summary ---
    const dependencies = {
      supabase: supabaseStatus,
      cdn: cdnStatus,
    };

    // --- Calculate overall dependency latency ---
    const dependencyLatencies = [
      supabaseStatus.latencyMs,
      cdnStatus.latencyMs
    ].filter(lat => lat !== undefined);

    const overallLatency = {
      averageMs: dependencyLatencies.length > 0
        ? Math.round(dependencyLatencies.reduce((a, b) => a + b, 0) / dependencyLatencies.length)
        : 0,
      maxMs: dependencyLatencies.length > 0 ? Math.max(...dependencyLatencies) : 0,
      minMs: dependencyLatencies.length > 0 ? Math.min(...dependencyLatencies) : 0
    };

    // --- Final response ---
    const healthy =
      supabaseStatus.status === 'connected' &&
      cdnStatus.status === 'ok' &&
      !incidentStatus.hasIncident;

    let status = healthy ? 'ok' : 'degraded';
    let message = healthy
      ? 'All systems operational'
      : (incidentStatus.hasIncident ? (incidentStatus.incident.name || 'System incident reported') : 'Some dependencies are unavailable');

    // Detect if the host environment is offline (to avoid "degraded" false negatives)
    if (!healthy && (supabaseStatus.status === 'error' || cdnStatus.status === 'error')) {
      const isOnline = await checkInternetConnection();
      if (!isOnline) {
        status = 'offline';
        message = 'Please check your internet connection';
      }
    }

    const responseTime = Date.now() - requestStartTime;

    const response = {
      status,
      message,
      timestamp: new Date().toISOString(),
      service: 'materio-core',
      responseTimeMs: responseTime,
      // Include active incident info if any (for health indicator)
      incident: incidentStatus.incident,
      summary: {
        uptime: `${Math.floor(uptime)}s`,
        dependenciesHealthy: healthy,
        errorsLastHour: getErrorsLastHour(),
        latency: overallLatency,
        hasActiveIncident: incidentStatus.hasIncident
      },
      build,
      system,
      dependencies,
    };

    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(healthy ? 200 : 503).json(response);
  } catch (error) {
    console.error('Health check error:', error);
    logError('health_check', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};