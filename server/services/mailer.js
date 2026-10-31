/**
 * SplitSmart AI - Enterprise Outbound Email Service
 * Supports Resend API, Nodemailer SMTP (Gmail / Custom), and Automated Virtual Preview (Ethereal)
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

let smtpTransporter = null;
let etherealTransporter = null;

/**
 * Check if real outbound mail credentials are configured in .env
 */
function isRealEmailConfigured() {
    const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
    const hasResend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());
    return hasSmtp || hasResend;
}

async function getSmtpTransporter() {
    if (smtpTransporter) return smtpTransporter;

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
        console.log(`[MAILER] Configuring real SMTP transport for ${user}...`);
        smtpTransporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass }
        });
        return smtpTransporter;
    }

    return null;
}

async function getEtherealTransporter() {
    if (etherealTransporter) return etherealTransporter;

    try {
        console.log('[MAILER] Initializing automated Ethereal test inbox transporter...');
        const testAccount = await nodemailer.createTestAccount();
        etherealTransporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        return etherealTransporter;
    } catch (err) {
        console.warn('[MAILER] Could not initialize Ethereal transporter:', err.message);
        return null;
    }
}

/**
 * Send an email with HTML and text content.
 * 1. Tries Nodemailer SMTP (e.g. Gmail App Password) first if credentials are set in .env.
 * 2. Tries Resend API if configured.
 * 3. If in Sandbox/Test mode, delivers to automated Ethereal inbox with a live click-to-view preview link!
 */
async function sendMail({ to, subject, html, text }) {
    // 1. Prioritize real Nodemailer SMTP (e.g. Gmail App Password)
    const smtp = await getSmtpTransporter();
    if (smtp) {
        try {
            console.log(`[MAILER] Dispatching live email via SMTP to ${to}...`);
            const from = process.env.EMAIL_FROM || `"SplitSmart AI" <${process.env.SMTP_USER}>`;
            const info = await smtp.sendMail({
                from,
                to,
                subject,
                html,
                text: text || html.replace(/<[^>]*>?/gm, '')
            });

            console.log(`✅ [MAILER] Real email delivered via SMTP to [${to}] - MessageId: ${info.messageId}`);
            return {
                success: true,
                isRealDelivery: true,
                provider: 'smtp',
                messageId: info.messageId
            };
        } catch (smtpErr) {
            console.error(`❌ [MAILER] SMTP delivery failed to ${to}:`, smtpErr.message);
        }
    }

    // 2. Try Resend API if configured
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
        try {
            console.log(`[MAILER] Attempting email via Resend API to ${to}...`);
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM || 'SplitSmart <onboarding@resend.dev>',
                    to: [to],
                    subject,
                    html,
                    text: text || html.replace(/<[^>]*>?/gm, '')
                })
            });

            const data = await res.json();
            if (res.ok && data.id) {
                console.log(`✅ [MAILER] Real email delivered via Resend to ${to} (ID: ${data.id})`);
                return {
                    success: true,
                    isRealDelivery: true,
                    provider: 'resend',
                    messageId: data.id
                };
            }
            console.warn('[MAILER] Resend API restriction notice:', data.message || data);
        } catch (resendErr) {
            console.warn('[MAILER] Resend API dispatch error:', resendErr.message);
        }
    }

    // 3. Automated Virtual Delivery via Ethereal (Zero error, live web preview!)
    const ethereal = await getEtherealTransporter();
    if (ethereal) {
        try {
            console.log(`[MAILER] Delivering to virtual test inbox for ${to}...`);
            const info = await ethereal.sendMail({
                from: '"SplitSmart AI" <invitations@splitsmart.app>',
                to,
                subject,
                html,
                text: text || html.replace(/<[^>]*>?/gm, '')
            });

            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log(`📨 [MAILER] Virtual delivery complete! View email in browser: ${previewUrl}`);
            return {
                success: true,
                isRealDelivery: false,
                isVirtualPreview: true,
                previewUrl,
                messageId: info.messageId
            };
        } catch (etherealErr) {
            console.warn('[MAILER] Ethereal delivery error:', etherealErr.message);
        }
    }

    // 4. Fallback
    return {
        success: false,
        isRealDelivery: false,
        isSandboxRestricted: true,
        error: 'Outbound email in sandbox mode.'
    };
}

module.exports = {
    getTransporter: getSmtpTransporter,
    sendMail,
    isRealEmailConfigured
};

