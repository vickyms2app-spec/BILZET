import nodemailer from 'nodemailer';
import { env } from '../config/env.mjs';

/**
 * Production-ready Email Service for BILZET
 * Handles SMTP delivery, automated retries, and outbox auditing.
 */

// In-memory outbox audit store for testing and verification
export const emailOutbox = [];

export const getOutbox = () => [...emailOutbox];
export const clearOutbox = () => {
  emailOutbox.length = 0;
};
export const getLatestEmail = () => emailOutbox[emailOutbox.length - 1] || null;

/**
 * Determine if SMTP provider is properly configured
 */
export const isEmailConfigured = () => {
  const host = process.env.SMTP_HOST || env.SMTP_HOST;
  const user = process.env.SMTP_USER || env.SMTP_USER;
  const pass = process.env.SMTP_PASS || env.SMTP_PASS;
  return Boolean(host && user && pass);
};

/**
 * Create transport or fallback to mock transport
 */
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || env.SMTP_USER;
  const pass = process.env.SMTP_PASS || env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      pool: true,
      maxConnections: 5,
    });
  }

  return transporter;
};

/**
 * Sends an email with retry logic and delivery confirmation
 */
export const sendEmail = async (mailOptions, maxRetries = 2) => {
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || env.SHOP_EMAIL || 'no-reply@bilzet.com';
  const fullOptions = { from: `BILZET CA Connect <${from}>`, ...mailOptions };

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const activeTransporter = getTransporter();

      if (activeTransporter) {
        const info = await activeTransporter.sendMail(fullOptions);
        const record = {
          messageId: info.messageId,
          to: fullOptions.to,
          subject: fullOptions.subject,
          html: fullOptions.html,
          text: fullOptions.text,
          status: 'DELIVERED',
          timestamp: new Date(),
          realSend: true,
        };
        emailOutbox.push(record);
        return record;
      }

      // If in production without SMTP configuration, report clear error
      if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_MOCK_EMAIL) {
        throw new Error('Email provider is not configured. Please configure SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS).');
      }

      // Development / Testing verified delivery simulation
      const messageId = `<inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@bilzet.com>`;
      const record = {
        messageId,
        to: fullOptions.to,
        subject: fullOptions.subject,
        html: fullOptions.html,
        text: fullOptions.text,
        status: 'DELIVERED',
        timestamp: new Date(),
        simulated: true,
      };
      emailOutbox.push(record);
      return record;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }
  }

  throw new Error(`Email delivery failed after ${maxRetries} attempt(s): ${lastError?.message || 'Unknown error'}`);
};

/**
 * Send Chartered Accountant Invitation Email
 */
export const sendCaInvitationEmail = async ({
  to,
  caName,
  businessName,
  businessGstin,
  inviteLink,
  expiresAt,
  permissions = [],
  message = '',
}) => {
  if (!to || !to.includes('@')) {
    throw new Error('A valid recipient email address is required.');
  }

  const name = caName || 'Chartered Accountant';
  const formattedExpiry = expiresAt ? new Date(expiresAt).toUTCString() : '7 days from now';

  const permissionLabels = {
    sales_audit: 'Sales & Output GST Register',
    purchase_audit: 'Purchases & ITC Reconciliation',
    tax_audit: 'GST Slabs & Audit Review',
    reconciliation: 'Bank & Payment Reconciliation',
    reports: 'Workpapers & Financial Summaries',
    tasks: 'Audit Tasks Management',
    discrepancies: 'Discrepancy Flagging & Resolutions',
    documents: 'Supporting Documents & Challans',
  };

  const permBadges = permissions
    .map((p) => `<span style="display:inline-block;background:#e0e7ff;color:#3730a3;padding:4px 10px;margin:3px;border-radius:12px;font-size:12px;font-weight:600;">${permissionLabels[p] || p}</span>`)
    .join(' ');

  const subject = `Invitation to Connect with ${businessName} on CA Connect`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px; text-align: center; color: #ffffff;">
      <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px;">BILZET</div>
      <div style="font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9;">CA Connect Workspace</div>
    </div>

    <!-- Body -->
    <div style="padding: 36px 32px;">
      <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #0f172a;">Hello ${name},</h2>
      
      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
        <strong>${businessName}</strong> ${businessGstin ? `(GSTIN: <code>${businessGstin}</code>)` : ''} has invited you to connect as their Chartered Accountant through <strong>CA Connect</strong>.
      </p>

      ${message ? `
      <div style="background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 0 8px 8px 0; font-size: 14px; color: #475569; margin-bottom: 24px; font-style: italic;">
        "${message}"
      </div>
      ` : ''}

      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
        Through your authorized CA workspace, you can review invoices, audit sales and purchase records, monitor GST-related adjustments, reconcile transactions, manage audit tasks, access supporting documents, and prepare reports according to your assigned permissions.
      </p>

      ${permissions.length > 0 ? `
      <div style="margin-bottom: 28px;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Authorized Access Permissions:</div>
        <div>${permBadges}</div>
      </div>
      ` : ''}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteLink}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
          Accept Invitation & Connect
        </a>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; color: #64748b; word-break: break-all; margin-bottom: 24px;">
        <strong>Direct Link:</strong> <a href="${inviteLink}" style="color: #2563eb;">${inviteLink}</a>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 12px;">
        This invitation is intended for <strong>${to}</strong> and expires on <strong>${formattedExpiry}</strong>.
      </p>

      <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 0;">
        If you were not expecting this invitation, you can ignore this email. No access will be granted unless the invitation is accepted through the authorized process.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      Regards,<br>
      <strong>CA Connect Team &bull; BILZET</strong><br>
      One business transaction &bull; One authoritative record &bull; Synchronized views everywhere
    </div>

  </div>
</body>
</html>
  `.trim();

  const text = `
Subject: ${subject}

Hello ${name},

${businessName} ${businessGstin ? `(GSTIN: ${businessGstin})` : ''} has invited you to connect as their Chartered Accountant through CA Connect.

Through your authorized CA workspace, you can review invoices, audit sales and purchase records, monitor GST-related adjustments, reconcile transactions, manage audit tasks, access supporting documents, and prepare reports according to your assigned permissions.

To review and accept the invitation, click the secure link below:
${inviteLink}

This invitation is intended for ${to} and expires on ${formattedExpiry}.

If you were not expecting this invitation, you can ignore this email. No access will be granted unless the invitation is accepted through the authorized process.

Regards,
CA Connect Team
  `.trim();

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
};

/**
 * Send notification to Admin when CA accepts the invitation
 */
export const sendCaInvitationAcceptedEmail = async ({
  to,
  caName,
  caEmail,
  businessName,
  acceptedAt = new Date(),
}) => {
  if (!to) return null;

  const subject = `Chartered Accountant Connected: ${caName || caEmail} on CA Connect`;
  const formattedDate = new Date(acceptedAt).toLocaleString();

  const html = `
    <div style="font-family: sans-serif; padding: 24px; color: #1e293b;">
      <h2 style="color: #16a34a;">CA Invitation Accepted</h2>
      <p>Great news! <strong>${caName || 'Your Chartered Accountant'}</strong> (<code>${caEmail}</code>) has accepted your invitation to connect with <strong>${businessName}</strong>.</p>
      <p>Timestamp: <strong>${formattedDate}</strong></p>
      <p>They now have authorized audit and reporting access to your store in CA Connect.</p>
      <p>Regards,<br>BILZET CA Connect</p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Your Chartered Accountant ${caName} (${caEmail}) has accepted the invitation to connect with ${businessName} at ${formattedDate}.`,
  }).catch((err) => {
    console.warn('[EmailService] Failed to notify admin of CA acceptance:', err.message);
    return null;
  });
};

export default {
  sendEmail,
  sendCaInvitationEmail,
  sendCaInvitationAcceptedEmail,
  isEmailConfigured,
  getOutbox,
  clearOutbox,
  getLatestEmail,
};
