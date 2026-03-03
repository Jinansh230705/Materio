const os = require('os');
const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = require('../config/supabase');
const { logError, getErrorsLastHour } = require('../utils/error-tracker');
const fs = require('fs');
const path = require('path');

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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    const res = await fetch('https://cdn-materioa.netlify.app/api/health', { 
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

// --- Main Handler ---
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const requestStartTime = Date.now();
    
    // --- System metrics ---
    const memoryUsage = process.memoryUsage();
    const cpuLoad = os.loadavg();
    const uptime = process.uptime();

    // --- Dependency checks ---
    const [supabaseStatus, cdnStatus] = await Promise.all([
      checkSupabase(),
      checkCdnAPI(),
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
      cdnStatus.status === 'ok';

    const responseTime = Date.now() - requestStartTime;

    const response = {
      status: healthy ? 'ok' : 'degraded',
      message: healthy
        ? 'All systems operational'
        : 'Some dependencies are unavailable',
      timestamp: new Date().toISOString(),
      service: 'materio-core',
      responseTimeMs: responseTime,
      summary: {
        uptime: `${Math.floor(uptime)}s`,
        dependenciesHealthy: healthy,
        errorsLastHour: getErrorsLastHour(),
        latency: overallLatency
      },
      build,
      system,
      dependencies,
    };

    return {
      statusCode: healthy ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(response, null, 2),
    };
  } catch (error) {
    console.error('Health check error:', error);
    logError('health_check', error.message);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'error',
        message: 'Health check failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
