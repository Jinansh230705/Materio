/**
 * Materio SMTP Mailer Utility
 * Sends incident/alert emails via Gmail SMTP using nodemailer.
 * Used as a free replacement for incident.io API.
 *
 * Environment variables:
 *   SMTP_EMAIL     - Gmail address (e.g. materioappdesk@gmail.com)
 *   SMTP_PASSWORD  - Gmail App Password (16-char code from Google)
 *   ALERT_EMAIL    - Recipient for incident alerts (defaults to SMTP_EMAIL)
 */

const nodemailer = require('nodemailer');

// --- Config ---
const SMTP_EMAIL = process.env.SMTP_EMAIL || process.env.SENDER_EMAIL || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || process.env.SENDER_PASSWORD || '';
const ALERT_EMAIL = process.env.ALERT_EMAIL || SMTP_EMAIL;

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);

// Reusable transporter (created lazily)
let _transporter = null;

function getTransporter() {
  if (!SMTP_EMAIL || !SMTP_PASSWORD) {
    return null;
  }
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
      },
      // Connection timeout for serverless
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return _transporter;
}

// --- Severity styles ---
const SEVERITY_COLORS = {
  critical: '#DC2626',
  major: '#EA580C',
  minor: '#CA8A04',
  cosmetic: '#6B7280',
};

const SEVERITY_EMOJI = {
  critical: '🔴',
  major: '🟠',
  minor: '🟡',
  cosmetic: '⚪',
};

/**
 * Send an incident alert email when bug reports cluster.
 *
 * @param {Object} incidentData - output from buildIncidentSummary()
 *   { name, summary, severity, affectedAreas, reportCount }
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 * 
 * NOTE on images & fonts:
 * - External image URLs: Gmail blocks until user approves. Use CID attachments instead.
 * - Custom fonts (@font-face): Email clients don't support. Falls back to system fonts.
 * - Current setup: Uses system font stack (-apple-system, Roboto, etc.) which renders 
 *   consistently across all email clients without external requests.
 */
async function sendIncidentEmail(incidentData) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[Mailer] SMTP not configured — skipping incident email');
    return { success: false, error: 'SMTP not configured' };
  }

  const { name, summary, severity, affectedAreas, reportCount, aiGenerated } = incidentData;
  const color = SEVERITY_COLORS[severity] || '#6B7280';
  const emoji = SEVERITY_EMOJI[severity] || '⚪';
  const timestamp = new Date().toISOString();

  // Hosted logo URL (more reliable than CID for Gmail)
  const LOGO_URL = 'https://materioa.vercel.app/assets/img/materio.png';

  const subject = `${emoji} [Materio Incident] ${name}`;

  // Plain text version
  const text = [
    `${emoji} AUTO-INCIDENT CREATED`,
    `Materio Health Monitor`,
    ``,
    `Incident: ${name}`,
    `Severity: ${severity.toUpperCase()}`,
    `Affected Areas: ${affectedAreas.join(', ')}`,
    `Reports: ${reportCount} clustered reports`,
    `Time: ${timestamp}`,
    aiGenerated ? `Summary: AI-generated` : `Summary: Deterministic fallback`,
    ``,
    `--- SUMMARY ---`,
    ``,
    summary,
    ``,
    `--- END ---`,
    ``,
    `This incident was auto-created by Materio Health Monitor based on clustered bug reports.`,
  ].join('\n');

  // Severity-based background colors with transparency for the header
  const SEVERITY_HEADER_BG = {
    critical: 'rgba(220, 38, 38, 0.15)',  // Light red
    major: 'rgba(234, 88, 12, 0.15)',     // Light orange (peach/salmon tone)
    minor: 'rgba(202, 138, 4, 0.15)',     // Light yellow
    cosmetic: 'rgba(107, 114, 128, 0.15)', // Light gray
  };

  const SEVERITY_HEADER_BORDER = {
    critical: '#DC2626',
    major: '#EA580C',
    minor: '#CA8A04',
    cosmetic: '#6B7280',
  };

  const headerBg = SEVERITY_HEADER_BG[severity] || 'rgba(107, 114, 128, 0.15)';
  const headerBorder = SEVERITY_HEADER_BORDER[severity] || '#6B7280';

  // Format date nicely: "February 7th 2026, 2:40 PM IST"
  const dateObj = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = dateObj.getDate();
  const suffix = (day === 1 || day === 21 || day === 31) ? 'st' : (day === 2 || day === 22) ? 'nd' : (day === 3 || day === 23) ? 'rd' : 'th';
  const formattedDate = `${months[dateObj.getMonth()]} ${day}${suffix} ${dateObj.getFullYear()}, ${dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} IST`;

  // HTML version with embedded logo (base64) and system fonts
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body { margin: 0; padding: 20px; background: #ffffff; font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }</style></head>
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

  try {
    const info = await transporter.sendMail({
      from: `"Materio Health Monitor" <${SMTP_EMAIL}>`,
      to: ALERT_EMAIL,
      subject,
      text,
      html,
    });

    console.log(`[Mailer] Incident email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Mailer] Failed to send incident email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a generic alert/notification email.
 *
 * @param {Object} opts
 * @param {string} opts.to - recipient (defaults to ALERT_EMAIL)
 * @param {string} opts.subject
 * @param {string} opts.text - plain text body
 * @param {string} [opts.html] - optional HTML body
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendAlertEmail({ to, subject, text, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Materio Alerts" <${SMTP_EMAIL}>`,
      to: to || ALERT_EMAIL,
      subject,
      text,
      html: html || undefined,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Mailer] Alert email failed:', err.message);
    return { success: false, error: err.message };
  }
}

// --- HTML escaping ---
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  sendIncidentEmail,
  sendAlertEmail,
  ALERT_EMAIL,
};
