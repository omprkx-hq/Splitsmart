/**
 * SplitSmart AI - Enterprise Inline HTML Email Templates
 * Design Standard: Stripe / Wise Fintech Precision
 * Brand Palette: Clean White (#FFFFFF), Deep Navy (#0F172A), Slate (#E2E8F0), Emerald (#16A34A)
 */

function baseLayout(title, contentHtml) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 36px; border-bottom: 1px solid #F1F5F9; background-color: #FFFFFF;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <span style="font-size: 20px; font-weight: 700; color: #0F172A; letter-spacing: -0.5px; text-decoration: none;">
                      Split<span style="color: #16A34A;">Smart</span> <span style="font-size: 13px; font-weight: 600; color: #64748B; background: #F1F5F9; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">AI</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: #64748B; font-weight: 500;">Split smarter. Settle easier.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; line-height: 18px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <strong>SplitSmart AI Financial Technologies</strong><br>
                    Enterprise Ledger & Settlement Platform<br>
                    All currency calculations are strictly ledger-verified.
                  </td>
                  <td align="right" valign="top">
                    <span style="color: #16A34A; font-weight: 600;">🔒 Bank-Grade Ledger</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
}

/**
 * 1. OTP Verification Email Template
 */
function getOtpEmailTemplate({ name, otpCode, expiresMinutes = 10 }) {
    const title = 'SplitSmart AI - Verify Your Account';
    const content = `
      <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px;">
        Account Verification Code
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 22px;">
        Hello ${name ? `<strong>${name}</strong>` : 'there'},<br>
        Please enter the one-time authentication code below to verify your email address and activate your SplitSmart account.
      </p>

      <!-- OTP Box -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
        <tr>
          <td align="center">
            <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 20px 32px; display: inline-block;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; color: #0F172A; letter-spacing: 8px; font-variant-numeric: tabular-nums;">
                ${otpCode}
              </span>
            </div>
          </td>
        </tr>
      </table>

      <div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 6px; padding: 12px 16px; margin: 20px 0 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #92400E; line-height: 18px;">
          ⏱️ This single-use security code will expire in <strong>${expiresMinutes} minutes</strong>. If you did not request this verification, you can safely ignore this email.
        </p>
      </div>

      <p style="margin: 0; font-size: 14px; color: #64748B;">
        Best regards,<br>
        <strong>The SplitSmart AI Security Team</strong>
      </p>
    `;
    return baseLayout(title, content);
}

/**
 * 2. Group Invitation Email Template
 */
function getGroupInviteTemplate({ inviterName, groupName, inviteUrl, expiresDays = 7 }) {
    const title = `Invitation to join ${groupName} on SplitSmart AI`;
    const content = `
      <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px;">
        Group Collaboration Invitation
      </h1>
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569; line-height: 22px;">
        <strong>${inviterName || 'A colleague'}</strong> has invited you to collaborate on the shared expense ledger for <strong>${groupName}</strong> on SplitSmart AI.
      </p>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-size: 13px; color: #64748B; padding-bottom: 6px;">Expense Group</td>
          </tr>
          <tr>
            <td style="font-size: 18px; font-weight: 700; color: #0F172A; padding-bottom: 16px;">${groupName}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #64748B; padding-bottom: 6px;">Invited By</td>
          </tr>
          <tr>
            <td style="font-size: 15px; font-weight: 600; color: #334155;">${inviterName || 'Group Administrator'}</td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 20px 0;">
        <tr>
          <td align="center">
            <a href="${inviteUrl}" target="_blank" style="display: inline-block; background-color: #16A34A; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px; box-shadow: 0 1px 2px rgba(22, 163, 74, 0.2);">
              Accept Invitation &amp; Join Group &rarr;
            </a>
          </td>
        </tr>
      </table>

      <p style="font-size: 13px; color: #64748B; text-align: center; margin: 0 0 24px 0;">
        Button not working? Copy and paste this link in your browser:<br>
        <a href="${inviteUrl}" style="color: #0284C7; word-break: break-all; font-size: 12px;">${inviteUrl}</a>
      </p>

      <p style="margin: 0; font-size: 13px; color: #94A3B8;">
        This invitation link is valid for ${expiresDays} days.
      </p>
    `;
    return baseLayout(title, content);
}

/**
 * 3. Formatted Expense & PayPal Settlement Receipt Email Template
 */
function getReceiptEmailTemplate({
    receiptId,
    title = 'Expense Recorded',
    groupName,
    description,
    category,
    currency = 'USD',
    totalAmount,
    payerName,
    paymentRef = null,
    isSettlement = false,
    splits = [],
    recipientNetBalance = null,
    dashboardUrl
}) {
    const emailTitle = isSettlement 
        ? `SplitSmart AI - PayPal Settlement Receipt #${receiptId}` 
        : `SplitSmart AI - Expense Receipt #${receiptId}: ${description}`;

    const formattedTotal = Number(totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const splitsRows = splits.map(s => {
        const shareFormatted = Number(s.share_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 12px 14px; font-size: 14px; color: #1E293B; font-weight: 500;">${s.participant_name || s.participant_email || 'Member'}</td>
            <td style="padding: 12px 14px; font-size: 13px; color: #64748B;">${s.split_method || 'Equal'}</td>
            <td style="padding: 12px 14px; font-size: 14px; font-weight: 600; color: #0F172A; text-align: right; font-variant-numeric: tabular-nums;">${currency} ${shareFormatted}</td>
            <td style="padding: 12px 14px; font-size: 12px; text-align: right;">
              <span style="background-color: #ECFDF5; color: #065F46; padding: 3px 8px; border-radius: 4px; font-weight: 600;">Recorded</span>
            </td>
          </tr>
        `;
    }).join('');

    const content = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: ${isSettlement ? '#16A34A' : '#0284C7'}; letter-spacing: 0.5px;">
            ${isSettlement ? '✅ Verified PayPal Settlement' : '📊 Shared Expense Receipt'}
          </span>
          <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px;">
            ${description}
          </h1>
        </div>
      </div>

      <!-- Receipt Meta Header Box -->
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td width="50%" style="padding-bottom: 12px;">
              <div style="font-size: 12px; color: #64748B; text-transform: uppercase;">Receipt / Transaction #</div>
              <div style="font-size: 14px; font-weight: 600; color: #0F172A; font-family: monospace;">${receiptId}</div>
            </td>
            <td width="50%" style="padding-bottom: 12px;" align="right">
              <div style="font-size: 12px; color: #64748B; text-transform: uppercase;">Date &amp; Time</div>
              <div style="font-size: 14px; font-weight: 600; color: #0F172A;">${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC</div>
            </td>
          </tr>
          <tr>
            <td>
              <div style="font-size: 12px; color: #64748B; text-transform: uppercase;">Group Name</div>
              <div style="font-size: 14px; font-weight: 600; color: #0F172A;">${groupName || 'Default Group'}</div>
            </td>
            <td align="right">
              <div style="font-size: 12px; color: #64748B; text-transform: uppercase;">Paid By</div>
              <div style="font-size: 14px; font-weight: 600; color: #0F172A;">${payerName}</div>
            </td>
          </tr>
          ${paymentRef ? `
          <tr>
            <td colspan="2" style="padding-top: 12px; border-top: 1px dashed #CBD5E1;">
              <div style="font-size: 12px; color: #64748B; text-transform: uppercase;">PayPal Capture Reference</div>
              <div style="font-size: 13px; font-weight: 600; color: #16A34A; font-family: monospace;">${paymentRef} (VERIFIED SANDBOX)</div>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Total Amount Banner -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px;">
        <tr>
          <td style="padding: 16px 20px;">
            <span style="font-size: 13px; font-weight: 600; color: #166534; text-transform: uppercase;">Total Transaction Amount</span>
          </td>
          <td align="right" style="padding: 16px 20px;">
            <span style="font-size: 26px; font-weight: 700; color: #15803D; font-variant-numeric: tabular-nums;">
              ${currency} ${formattedTotal}
            </span>
          </td>
        </tr>
      </table>

      <!-- Itemized Split Table -->
      <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #0F172A;">Itemized Ledger Breakdown</h3>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
            <th align="left" style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase;">Participant</th>
            <th align="left" style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase;">Method</th>
            <th align="right" style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase;">Share</th>
            <th align="right" style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${splitsRows.length > 0 ? splitsRows : `
          <tr>
            <td colspan="4" style="padding: 16px; text-align: center; color: #64748B; font-size: 14px;">Direct payment settlement</td>
          </tr>
          `}
        </tbody>
      </table>

      ${recipientNetBalance !== null ? `
      <!-- Recipient Net Balance -->
      <div style="background-color: #F8FAFC; border-left: 4px solid #16A34A; padding: 14px 18px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
        <span style="font-size: 13px; color: #64748B;">Your updated net balance in ${groupName || 'this group'}:</span>
        <div style="font-size: 18px; font-weight: 700; color: ${Number(recipientNetBalance) >= 0 ? '#16A34A' : '#DC2626'}; font-variant-numeric: tabular-nums; margin-top: 4px;">
          ${Number(recipientNetBalance) >= 0 ? `+${currency} ${Number(recipientNetBalance).toFixed(2)} (You are owed)` : `-${currency} ${Math.abs(Number(recipientNetBalance)).toFixed(2)} (You owe)`}
        </div>
      </div>
      ` : ''}

      <!-- Action Button -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0 10px 0;">
        <tr>
          <td align="center">
            <a href="${dashboardUrl || '#'}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px;">
              View Full Group Ledger &rarr;
            </a>
          </td>
        </tr>
      </table>
    `;
    return baseLayout(emailTitle, content);
}

module.exports = {
    getOtpEmailTemplate,
    getGroupInviteTemplate,
    getReceiptEmailTemplate
};
