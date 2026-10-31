/**
 * View 14: Privacy Policy, Ledger Mathematics & Help FAQ
 */

function renderPrivacyView() {
  const content = document.getElementById('app-content');
  if (!content) return;

  content.innerHTML = `
      <div style="max-width: 840px; margin: 0 auto;">
        
        <div class="page-header" style="margin-bottom: 28px;">
          <div>
            <h1 class="page-title">Privacy Policy &amp; Ledger Transparency</h1>
            <p class="page-subtitle">Mathematical standards, data security protocols, and PayPal Sandbox documentation.</p>
          </div>
        </div>

        <!-- Section 1: Financial Ledger Mathematics -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">1. Deterministic Ledger Mathematics</span>
            <span class="badge badge-primary">Zero Penny Drift</span>
          </div>
          <div class="card-body" style="font-size: 14px; color: #334155; line-height: 1.6;">
            <p style="margin-bottom: 12px;">
              SplitSmart AI operates on strict double-entry ledger principles. Unlike standard apps that introduce rounding errors through floating-point math:
            </p>
            <ul style="margin-left: 20px; display: flex; flex-direction: column; gap: 8px;">
              <li><strong>Integer Minor Units:</strong> All currency amounts are converted to integer minor units (e.g., cents or pence) prior to arithmetic calculations.</li>
              <li><strong>Indivisible Remainder Allocation:</strong> When dividing an amount that does not split cleanly (for instance, splitting $100.00 among 3 participants yields $33.3333...), the indivisible remainder cent ($0.01) is assigned deterministically to the first participant so the sum of individual shares equals the exact total ($33.34 + $33.33 + $33.33 = $100.00).</li>
              <li><strong>Greedy Transfer Minimization:</strong> Our settlement optimizer matches the largest debtors against the largest creditors to settle all outstanding balances in the minimum theoretical number of peer transfers.</li>
            </ul>
          </div>
        </div>

        <!-- Section 2: PayPal Sandbox Protocol -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">2. PayPal Sandbox &amp; Verification Protocol</span>
            <span class="badge badge-amber">Official Sandbox Integration</span>
          </div>
          <div class="card-body" style="font-size: 14px; color: #334155; line-height: 1.6;">
            <p style="margin-bottom: 12px;">
              SplitSmart AI uses the official PayPal REST v2 Sandbox APIs. Here is how settlements are safeguarded:
            </p>
            <ul style="margin-left: 20px; display: flex; flex-direction: column; gap: 8px;">
              <li><strong>No Frontend-Only Confirmations:</strong> A settlement is NEVER marked as paid based on client-side redirects or webhooks without direct backend confirmation.</li>
              <li><strong>Server-Side Verification:</strong> When a user approves an order, our Express backend contacts PayPal's sandbox API, verifies the exact order ID, verifies currency and amount match the settlement record, and captures the order.</li>
              <li><strong>Idempotency Guarantees:</strong> Capture reference IDs are stored uniquely in PostgreSQL. Replayed or duplicate requests are blocked idempotently.</li>
            </ul>
          </div>
        </div>

        <!-- Section 3: Data Security & Email Validation -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">3. Data Security &amp; Native MX Verification</span>
            <span class="badge badge-slate">Enterprise Security</span>
          </div>
          <div class="card-body" style="font-size: 14px; color: #334155; line-height: 1.6;">
            <ul style="margin-left: 20px; display: flex; flex-direction: column; gap: 8px;">
              <li><strong>Native DNS MX Lookups:</strong> When a user signs up or is invited to a group, SplitSmart AI uses Node.js <code>dns.promises.resolveMx()</code> to verify that the destination domain has active Mail Exchange servers. Discarded/fake domains are blocked immediately.</li>
              <li><strong>Real HTML Receipts:</strong> Every expense and PayPal transaction automatically triggers real inline-CSS HTML receipts containing receipt IDs, itemized participant splits, and updated net balances.</li>
              <li><strong>Guardrailed AI Assistant:</strong> AI operations are sandboxed. The AI parses input into structured drafts, but you retain 100% control through our Mandatory Review Gate. The AI cannot silently insert or modify ledger transactions.</li>
            </ul>
          </div>
        </div>

        <!-- Section 4: Frequently Asked Questions -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">4. Frequently Asked Questions (FAQ)</span>
          </div>
          <div class="card-body" style="font-size: 14px; color: #334155; line-height: 1.6;">
            <div style="margin-bottom: 16px;">
              <strong style="color: #0F172A;">Q: How do I test the PayPal Sandbox checkout?</strong><br>
              A: When the PayPal Sandbox window opens, log in using your PayPal Sandbox personal/buyer account created in the <a href="https://developer.paypal.com/dashboard/accounts" target="_blank" style="color: #0284C7; font-weight: 600;">PayPal Developer Dashboard</a>. Once you approve the payment, click "Verify &amp; Capture" in SplitSmart AI.
            </div>
            <div style="margin-bottom: 16px;">
              <strong style="color: #0F172A;">Q: What happens if an invited user has not registered yet?</strong><br>
              A: When you invite them, an official signed invitation token is dispatched to their email address. When they click "Accept Invitation", SplitSmart automatically attaches them to the group ledger.
            </div>
            <div>
              <strong style="color: #0F172A;">Q: Can I settle debts in cash instead of PayPal?</strong><br>
              A: Yes! On the Settlements page or Checkout view, click "Mark Paid in Cash" to record an in-person settlement. The ledger balances update immediately.
            </div>
          </div>
        </div>

      </div>
    `;
}

window.renderPrivacyView = renderPrivacyView;
