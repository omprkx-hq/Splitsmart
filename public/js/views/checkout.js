/**
 * SplitSmart AI - Dedicated PayPal Payment Gateway & Checkout View
 * Environment: PayPal REST API (v2/checkout/orders)
 * Features:
 * - Official PayPal Smart Buttons (Credit/Debit Card, PayPal Balance, Pay Later)
 * - Server-side OAuth2 & capture verification with Idempotency Key
 * - Runtime Gateway Setup Panel for instant Client ID & Secret verification
 * - Automatic 3D Clearance Bill on successful payment
 */

let currentCheckoutContext = null;
let paypalSdkLoading = false;
let paypalSdkLoadedClientId = null;

async function loadPayPalSdkScript(clientId, currency = 'USD') {
    if (window.paypal && paypalSdkLoadedClientId === clientId) {
        return true;
    }

    if (paypalSdkLoading) return false;
    paypalSdkLoading = true;

    return new Promise((resolve) => {
        const existing = document.getElementById('paypal-js-sdk');
        if (existing) existing.remove();

        const script = document.createElement('script');
        script.id = 'paypal-js-sdk';
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&components=buttons,funding-eligibility`;
        script.onload = () => {
            paypalSdkLoading = false;
            paypalSdkLoadedClientId = clientId;
            resolve(true);
        };
        script.onerror = () => {
            paypalSdkLoading = false;
            console.warn('Could not load remote PayPal SDK, using server-side order redirect flow.');
            resolve(false);
        };
        document.head.appendChild(script);
    });
}

async function renderCheckoutView(settlementId) {
    const content = document.getElementById('app-content');
    if (!content) return;

    if (!settlementId) {
        window.location.hash = '#/settlements';
        return;
    }

    content.innerHTML = `
      <div style="text-align: center; padding: 48px 0; color: #64748B;">
        Loading secure payment session #${settlementId}...
      </div>
    `;

    try {
        // Fetch active groups to locate settlement
        const [groupsRes, paypalConfig] = await Promise.all([
            API.get('/groups'),
            API.get('/settlements/paypal/config').catch(() => ({ configured: false, clientId: 'sb', mode: 'sandbox' }))
        ]);

        const groups = groupsRes.groups || [];
        let settlement = null;
        let group = null;

        for (const g of groups) {
            const data = await API.get(`/settlements/group/${g.id}/balances`);
            const match = (data.settlements || []).find(s => s.id === parseInt(settlementId, 10));
            if (match) {
                settlement = match;
                group = g;
                currentCheckoutContext = { settlement, group };
                break;
            }
        }

        if (!settlement) {
            content.innerHTML = `
              <div class="card" style="max-width: 500px; margin: 40px auto; text-align: center; padding: 32px;">
                <h3 style="color: #DC2626; margin-bottom: 8px;">Settlement Record Not Found</h3>
                <p style="color: #64748B; margin-bottom: 20px;">Could not locate settlement #${settlementId}.</p>
                <a href="#/settlements" class="btn btn-secondary">&larr; Return to Settlements</a>
              </div>
            `;
            return;
        }

        const formattedAmount = Number(settlement.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });
        const isConfigured = Boolean(paypalConfig.configured);
        const mode = (paypalConfig.mode || 'sandbox').toUpperCase();

        content.innerHTML = `
          <div style="max-width: 620px; margin: 20px auto;">
            
            <!-- Breadcrumbs -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <a href="#/settlements" style="font-size: 13px; color: var(--text-muted);">&larr; Back to Settlements</a>
              <button class="btn btn-secondary btn-xs" onclick="togglePayPalConfigDrawer()" style="font-size: 11px; padding: 4px 10px; gap: 6px;">
                ⚙️ PayPal API Gateway: <span class="badge ${isConfigured ? 'badge-green' : 'badge-amber'}" style="font-size: 10px;">${isConfigured ? mode : 'SETUP REQUIRED'}</span>
              </button>
            </div>

            <!-- Credentials Config Drawer -->
            <div id="paypal-config-drawer" class="card" style="display: ${isConfigured ? 'none' : 'block'}; margin-bottom: 20px; border: 1px dashed var(--accent-primary); background: rgba(208, 240, 48, 0.03);">
              <div class="card-header" style="padding: 14px 18px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="color: var(--accent-primary);">${Icons.lock(16)}</span>
                  <span style="font-size: 14px; font-weight: 700; color: var(--text-primary);">Connect Real PayPal Payment Gateway</span>
                </div>
                <span class="badge badge-amber" style="font-size: 10px;">Free &amp; Instant</span>
              </div>
              <div class="card-body" style="padding: 16px 18px; font-size: 13px;">
                <p style="color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">
                  Enter your PayPal Developer credentials to enable real interactive payments. You can get free Sandbox credentials in 1 minute from 
                  <a href="https://developer.paypal.com/dashboard/applications/sandbox" target="_blank" style="color: var(--accent-lime); font-weight: 600; text-decoration: underline;">
                    developer.paypal.com ↗
                  </a>.
                </p>

                <div style="display: grid; gap: 10px; margin-bottom: 14px;">
                  <div>
                    <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">PayPal Client ID</label>
                    <input type="text" id="cfg-paypal-client-id" class="form-input" style="font-family: var(--font-code); font-size: 12px;" placeholder="e.g. A21AAJ... or your Sandbox Client ID" value="${isConfigured ? paypalConfig.clientId : ''}">
                  </div>
                  <div>
                    <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">PayPal Client Secret</label>
                    <input type="password" id="cfg-paypal-client-secret" class="form-input" style="font-family: var(--font-code); font-size: 12px;" placeholder="e.g. EIaAAJ... or your Sandbox Client Secret">
                  </div>
                  <div>
                    <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Environment</label>
                    <select id="cfg-paypal-mode" class="form-select" style="font-size: 12px;">
                      <option value="sandbox" ${mode === 'SANDBOX' ? 'selected' : ''}>Sandbox (Free Testing &bull; api-m.sandbox.paypal.com)</option>
                      <option value="live" ${mode === 'LIVE' ? 'selected' : ''}>Live Production (Real Money &bull; api-m.paypal.com)</option>
                    </select>
                  </div>
                </div>

                <div style="display: flex; gap: 10px;">
                  <button class="btn btn-primary btn-sm" onclick="handleSavePayPalCredentials(${settlementId})" style="gap: 6px;">
                    ${Icons.check(13)} Save &amp; Verify With PayPal
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="togglePayPalConfigDrawer()">Hide Panel</button>
                </div>
              </div>
            </div>

            <!-- Mode Notification Banner -->
            <div style="background-color: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 12px;">
              <span style="color: var(--accent-lime); margin-top: 2px;">${Icons.shield(18)}</span>
              <div>
                <strong style="color: var(--text-primary); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                  PayPal Gateway Active &bull; ${mode}
                </strong>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-secondary); line-height: 1.4;">
                  All payment transfers are captured with cryptographic server-side verification and zero-drift PostgreSQL audit logging.
                </p>
              </div>
            </div>

            <!-- Checkout Order Card -->
            <div class="card" style="box-shadow: var(--shadow-lg);">
              <div class="card-header">
                <div>
                  <span class="card-title">Settlement Payment</span>
                  <div style="font-size: 12px; color: var(--text-muted);">Settlement #${settlement.id} &bull; ${group ? group.name : 'Group'}</div>
                </div>
                <span class="badge ${settlement.status === 'paid' ? 'badge-green' : 'badge-amber'}">
                  ${settlement.status.toUpperCase()}
                </span>
              </div>

              <div class="card-body">
                <!-- Summary of Transfer -->
                <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td width="45%">
                        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Payer (You)</div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${escapeHtml(settlement.payer_name)}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(settlement.payer_email)}</div>
                      </td>
                      <td width="10%" align="center" style="font-size: 20px; color: var(--text-muted);">&rarr;</td>
                      <td width="45%" align="right">
                        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Payee (Recipient)</div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${escapeHtml(settlement.payee_name)}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(settlement.payee_email)}</div>
                      </td>
                    </tr>
                  </table>

                  <div style="margin-top: 20px; padding-top: 16px; border-top: 1px dashed var(--border-subtle); display: flex; justify-content: space-between; align-items: baseline;">
                    <span style="font-size: 13px; font-weight: 600; color: var(--text-muted);">Total Settlement Amount:</span>
                    <span style="font-size: 30px; font-weight: 900; color: var(--accent-lime);" class="num">
                      ${settlement.currency} ${formattedAmount}
                    </span>
                  </div>
                </div>

                ${settlement.status === 'paid' ? `
                  <div style="text-align: center; padding: 24px 0;">
                    <div style="margin-bottom: 8px; color: var(--accent-emerald);">${Icons.checkCircle(40)}</div>
                    <h3 style="font-size: 19px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Payment Verified &amp; Settled</h3>
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                      Ledger Ref: <strong style="font-family: var(--font-code);">${settlement.payment_reference || 'VERIFIED'}</strong>
                    </p>
                    <a href="#/settlements" class="btn btn-primary">Return to Settlements &rarr;</a>
                  </div>
                ` : `
                  <!-- Payment Initiation Action -->
                  <div id="checkout-action-area">
                    
                    <!-- Native PayPal Smart Buttons Mount Point -->
                    <div id="paypal-button-container" style="min-height: 48px; margin-bottom: 16px;"></div>

                    <!-- Direct Launch Fallback Button -->
                    <button id="btn-start-paypal" class="btn btn-green btn-block btn-lg" onclick="handleStartPayPalCheckout(${settlement.id})" style="margin-bottom: 14px;">
                      ${Icons.creditCard(16)} Pay with PayPal ${mode} &rarr;
                    </button>

                    <div style="text-align: center;">
                      <span style="font-size: 12px; color: var(--text-muted);">or settle directly outside PayPal:</span><br>
                      <button class="btn btn-secondary btn-sm" style="margin-top: 6px;" onclick="handleManualCashSettle(${settlement.id})">
                        Mark Paid in Cash
                      </button>
                    </div>
                  </div>

                  <div id="checkout-progress-area" style="display: none; padding: 24px 0; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 10px;">⏳</div>
                    <div id="checkout-status-text" style="font-size: 15px; font-weight: 700; color: var(--text-primary);">
                      Communicating with PayPal API...
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
                      Verifying order status and ledger capture server-side...
                    </div>
                  </div>
                `}

              </div>

              <div class="card-footer" style="justify-content: space-between; font-size: 12px; color: var(--text-muted);">
                <span>${Icons.lock(12)} PayPal REST v2 API Verified</span>
                <span>Zero-Drift Financial Ledger</span>
              </div>
            </div>

          </div>
        `;

        // Attempt to mount native PayPal Smart Buttons if client-id available
        if (settlement.status !== 'paid' && paypalConfig.clientId) {
            initPayPalSmartButtons(settlement.id, paypalConfig.clientId, settlement.currency);
        }

    } catch (err) {
        content.innerHTML = `
          <div class="card" style="padding: 32px; text-align: center;">
            <p style="color: #DC2626;">${err.message}</p>
            <a href="#/settlements" class="btn btn-secondary">Return to Settlements</a>
          </div>
        `;
    }
}

async function initPayPalSmartButtons(settlementId, clientId, currency = 'USD') {
    try {
        const loaded = await loadPayPalSdkScript(clientId, currency);
        if (!loaded || !window.paypal || !window.paypal.Buttons) return;

        const container = document.getElementById('paypal-button-container');
        if (!container) return;
        container.innerHTML = '';

        window.paypal.Buttons({
            style: {
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: 'paypal'
            },
            createOrder: async () => {
                const res = await API.post(`/settlements/${settlementId}/paypal/create-order`, {});
                return res.orderId;
            },
            onApprove: async (data) => {
                const actionArea = document.getElementById('checkout-action-area');
                const progressArea = document.getElementById('checkout-progress-area');
                const statusText = document.getElementById('checkout-status-text');

                if (actionArea) actionArea.style.display = 'none';
                if (progressArea) progressArea.style.display = 'block';
                if (statusText) statusText.innerText = 'Capturing & verifying PayPal transaction with ledger...';

                await executePayPalCapture(settlementId, data.orderID);
            },
            onError: (err) => {
                showToast('PayPal checkout notice: ' + (err.message || 'Please use sandbox account to approve.'), 'info');
            }
        }).render('#paypal-button-container');

        // Hide fallback button if native buttons render
        const fbBtn = document.getElementById('btn-start-paypal');
        if (fbBtn) fbBtn.style.display = 'none';
    } catch (e) {
        console.warn('PayPal Smart Buttons mount fallback:', e);
    }
}

function togglePayPalConfigDrawer() {
    const drawer = document.getElementById('paypal-config-drawer');
    if (drawer) {
        drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
    }
}

async function handleSavePayPalCredentials(settlementId) {
    const clientId = document.getElementById('cfg-paypal-client-id')?.value;
    const clientSecret = document.getElementById('cfg-paypal-client-secret')?.value;
    const mode = document.getElementById('cfg-paypal-mode')?.value || 'sandbox';

    if (!clientId || !clientSecret) {
        showToast('Please enter both PayPal Client ID and Secret.', 'error');
        return;
    }

    try {
        showToast('Testing credentials with PayPal...', 'info');
        const res = await API.post('/settlements/paypal/setup', {
            clientId,
            clientSecret,
            mode
        });

        showToast(res.message, 'success');
        // Refresh checkout view
        renderCheckoutView(settlementId);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleStartPayPalCheckout(settlementId) {
    const actionArea = document.getElementById('checkout-action-area');
    const progressArea = document.getElementById('checkout-progress-area');
    const statusText = document.getElementById('checkout-status-text');

    if (actionArea) actionArea.style.display = 'none';
    if (progressArea) progressArea.style.display = 'block';

    try {
        statusText.innerText = 'Step 1/3: Calling PayPal API to generate Order...';

        const orderRes = await API.post(`/settlements/${settlementId}/paypal/create-order`, {});
        const orderId = orderRes.orderId;
        const approveLink = orderRes.order?.links?.find(l => l.rel === 'approve')?.href;

        statusText.innerText = `Step 2/3: Order #${orderId} generated. Waiting for PayPal approval...`;

        if (approveLink) {
            // Open PayPal Checkout window
            const paypalWindow = window.open(approveLink, 'PayPalCheckout', 'width=500,height=700');

            progressArea.innerHTML = `
              <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 20px; text-align: left;">
                <h4 style="font-size: 15px; color: var(--text-primary); margin-bottom: 8px;">PayPal Checkout Window Opened</h4>
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
                  1. Complete the payment approval in the popup PayPal window.<br>
                  2. Once approved, click the button below to capture and verify server-side.
                </p>
                <div style="margin-bottom: 16px;">
                  <span style="font-size: 12px; color: var(--text-muted);">PayPal Order ID:</span>
                  <code style="background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 2px 6px; border-radius: 4px; font-size: 12px; color: var(--text-primary);">${orderId}</code>
                </div>
                <button class="btn btn-green btn-block" onclick="executePayPalCapture(${settlementId}, '${orderId}')">
                  ${Icons.check(15)} Verify &amp; Capture Payment Server-Side &rarr;
                </button>
              </div>
            `;
        } else {
            await executePayPalCapture(settlementId, orderId);
        }
    } catch (err) {
        showToast(err.message, 'error');
        if (actionArea) actionArea.style.display = 'block';
        if (progressArea) progressArea.style.display = 'none';
    }
}

async function executePayPalCapture(settlementId, orderId) {
    const progressArea = document.getElementById('checkout-progress-area');
    if (progressArea) {
        progressArea.innerHTML = `
          <div style="padding: 20px 0;">
            <div style="margin-bottom: 8px; color: var(--accent-emerald);">${Icons.shield(32)}</div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">Verifying payment with PayPal API...</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Executing server capture &amp; updating ledger balances...</div>
          </div>
        `;
    }

    try {
        const verifyRes = await API.post(`/settlements/${settlementId}/paypal/verify-capture`, { orderId });
        showToast('Payment verified successfully! Receipt emails dispatched.', 'success');

        // Automatically Trigger 3D Clearance / Paid Bill Animation!
        await triggerAutoClearanceBill(currentCheckoutContext, verifyRes.captureId || orderId, true);

        renderCheckoutView(settlementId);
    } catch (err) {
        showToast(err.message, 'error');
        if (progressArea) {
            progressArea.innerHTML = `
              <div style="color: #DC2626; padding: 16px;">
                <strong>Verification Failed:</strong> ${err.message}
                <div style="margin-top: 12px;">
                  <button class="btn btn-secondary btn-sm" onclick="renderCheckoutView(${settlementId})">Retry</button>
                </div>
              </div>
            `;
        }
    }
}

async function handleManualCashSettle(settlementId) {
    if (!confirm('Mark this settlement as settled in cash?')) return;

    try {
        await API.post(`/settlements/${settlementId}/cash-settle`, {});
        showToast('Settlement recorded as settled!', 'success');

        // Automatically Trigger 3D Clearance / Paid Bill Animation!
        await triggerAutoClearanceBill(currentCheckoutContext, `CASH-${Date.now().toString().slice(-6)}`, false);

        renderCheckoutView(settlementId);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function triggerAutoClearanceBill(context, paymentRef, isPayPal = false) {
    if (typeof show3DBillModal !== 'function' || !context) return;

    const grpId = context.settlement?.group_id || context.group?.id;
    let isAllSettled = false;
    let members = [];
    let totalSpent = 0;
    let isOwner = false;
    let groupName = context.group?.name || 'Expense Group';
    let currency = context.settlement?.currency || 'USD';

    if (grpId) {
        try {
            const [balRes, grpRes] = await Promise.all([
                API.get(`/settlements/group/${grpId}/balances`).catch(() => null),
                API.get(`/groups/${grpId}`).catch(() => null)
            ]);
            if (balRes) {
                isAllSettled = (balRes.proposedTransfers || []).length === 0;
                members = (balRes.balances || []).map(b => b.name);
            }
            if (grpRes && grpRes.group) {
                groupName = grpRes.group.name;
                currency = grpRes.group.currency || currency;
                totalSpent = grpRes.stats?.totalSpent || 0;
                isOwner = grpRes.group.owner_id === AppState.user?.id;
            }
        } catch (e) {
            // fallback gracefully
        }
    }

    show3DBillModal({
        groupId: grpId,
        isAllSettled: isAllSettled,
        title: isAllSettled 
            ? 'OFFICIAL GROUP CLEARANCE CERTIFICATE' 
            : (isPayPal ? 'PAYPAL SETTLEMENT' : 'CASH SETTLEMENT RECEIPT'),
        stampText: isAllSettled ? 'ALL SETTLED' : (isPayPal ? 'PAID IN FULL' : 'SETTLED'),
        groupName: groupName,
        payerName: context.settlement?.payer_name || 'You',
        payeeName: context.settlement?.payee_name || 'Recipient',
        amount: context.settlement?.amount || 0,
        currency: currency,
        paymentRef: paymentRef,
        totalSpent: totalSpent,
        members: members,
        isOwner: isOwner
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

window.renderCheckoutView = renderCheckoutView;
window.handleStartPayPalCheckout = handleStartPayPalCheckout;
window.executePayPalCapture = executePayPalCapture;
window.handleManualCashSettle = handleManualCashSettle;
window.togglePayPalConfigDrawer = togglePayPalConfigDrawer;
window.handleSavePayPalCredentials = handleSavePayPalCredentials;
