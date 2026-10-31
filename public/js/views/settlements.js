/**
 * View 8: Settle Up & Balances
 * Clean, human UI for settling group debts with PayPal or Cash.
 */

let settlementsViewState = {
    groups: [],
    selectedGroupId: null,
    balances: [],
    proposedTransfers: [],
    settlementsHistory: []
};

async function renderSettlementsView() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="text-align: center; padding: 48px 0; color: var(--text-muted);">
        Calculating balances...
      </div>
    `;

    try {
        const groupsRes = await API.get('/groups');
        settlementsViewState.groups = groupsRes.groups || [];

        if (settlementsViewState.groups.length === 0) {
            content.innerHTML = `
              <div class="card" style="max-width: 500px; margin: 40px auto; text-align: center; padding: 40px;">
                <div style="margin-bottom: 12px; color: var(--text-muted);">${Icons.folder(36)}</div>
                <h3 style="margin-bottom: 8px;">No Expense Groups</h3>
                <p style="color: var(--text-muted); margin: 0 0 20px 0;">Create a group to track balances and settle up.</p>
                <a href="#/groups" class="btn btn-primary">${Icons.plus(14)} Create Group</a>
              </div>
            `;
            return;
        }

        if (!settlementsViewState.selectedGroupId) {
            settlementsViewState.selectedGroupId = AppState.activeGroupId || settlementsViewState.groups[0].id;
        }

        await loadSettlementData(settlementsViewState.selectedGroupId);
        renderSettlementsUI();
    } catch (err) {
        content.innerHTML = `
          <div class="card" style="padding: 32px; text-align: center;">
            <p style="color: var(--danger-primary);">${err.message}</p>
          </div>
        `;
    }
}

async function loadSettlementData(groupId) {
    const res = await API.get(`/settlements/group/${groupId}/balances`);
    settlementsViewState.balances = res.balances || [];
    settlementsViewState.proposedTransfers = res.proposedTransfers || [];
    settlementsViewState.settlementsHistory = res.settlements || [];
}

function renderSettlementsUI() {
    const content = document.getElementById('app-content');
    if (!content) return;

    const currentGroup = settlementsViewState.groups.find(g => g.id === settlementsViewState.selectedGroupId) || settlementsViewState.groups[0];
    const cur = currentGroup ? currentGroup.currency : 'USD';
    const balances = settlementsViewState.balances;
    const transfers = settlementsViewState.proposedTransfers;
    const history = settlementsViewState.settlementsHistory;
    const currentUserId = AppState.user?.id;

    content.innerHTML = `
      <!-- Page Header -->
      <div class="page-header" style="margin-bottom: 24px;">
        <div>
          <h1 class="page-title">Settle Up</h1>
          <p class="page-subtitle">See who owes whom and settle debts directly with PayPal or Cash.</p>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <label style="font-size: 13px; font-weight: 600; color: var(--text-muted);">Active Group:</label>
          <select class="form-select" style="width: auto; padding: 6px 12px; font-size: 13px;" onchange="handleSettlementGroupChange(this.value)">
            ${settlementsViewState.groups.map(g => `
              <option value="${g.id}" ${g.id === settlementsViewState.selectedGroupId ? 'selected' : ''}>
                ${escapeHtml(g.name)} (${g.currency})
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Section 1: Who Pays Whom (Suggested Transfers) -->
      <div class="card" style="margin-bottom: 24px; box-shadow: var(--shadow-sm);">
        <div class="card-header">
          <div>
            <span class="card-title">Suggested Payments to Settle Debts</span>
            <div style="font-size: 12px; color: var(--text-muted);">Simplified payments so your group can settle all debts in the fewest steps.</div>
          </div>
          <span class="badge badge-primary">Zero-Debt Plan</span>
        </div>
        <div class="card-body" style="padding: 0;">
          ${transfers.length === 0 ? `
            <div style="padding: 40px; text-align: center; color: var(--accent-emerald); font-weight: 600;">
              <div style="margin-bottom: 8px; color: var(--accent-emerald);">${Icons.checkCircle(32)}</div>
              <div>Everyone in ${escapeHtml(currentGroup.name)} is completely settled up! No payments needed.</div>
              <div style="margin-top: 16px;">
                <button class="btn btn-primary btn-sm" onclick="showSettlementClearanceBill(${currentGroup.id})" style="display: inline-flex; align-items: center; gap: 8px;">
                  ${Icons.receipt(14)} View 3D Clearance Bill &rarr;
                </button>
              </div>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column;">
              ${transfers.map(t => {
                  const isCurrentUserPayer = t.payerId === currentUserId;
                  const isCurrentUserPayee = t.payeeId === currentUserId;

                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); gap: 16px; flex-wrap: wrap;">
                      <div style="display: flex; align-items: center; gap: 12px; font-size: 15px;">
                        <strong style="color: var(--text-primary);">${isCurrentUserPayer ? 'You' : escapeHtml(t.payerName)}</strong>
                        <span style="color: var(--text-muted);">&rarr; pays &rarr;</span>
                        <strong style="color: var(--text-primary);">${isCurrentUserPayee ? 'You' : escapeHtml(t.payeeName)}</strong>
                      </div>

                      <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="font-size: 17px; font-weight: 800; color: var(--text-primary);" class="num">
                          ${cur} ${Number(t.amount).toFixed(2)}
                        </div>

                        ${isCurrentUserPayer ? `
                          <button class="btn btn-green btn-sm" onclick="initiatePayPalSettlement(${t.payerId}, ${t.payeeId}, ${t.amount}, '${cur}', ${currentGroup.id})">
                            Pay via PayPal &rarr;
                          </button>
                        ` : isCurrentUserPayee ? `
                          <button class="btn btn-secondary btn-sm" onclick="initiateCashSettlement(${t.payerId}, ${t.payeeId}, ${t.amount}, '${cur}', ${currentGroup.id}, '${escapeJs(t.payerName)}', '${escapeJs(t.payeeName)}')">
                            ${Icons.check(13)} Mark Cash Received
                          </button>
                        ` : `
                          <span class="badge badge-slate" style="font-size: 11px;">Awaiting peer payment</span>
                        `}
                      </div>
                    </div>
                  `;
              }).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- Section 2: Individual Member Balances Table -->
      <div class="card" style="margin-bottom: 24px; box-shadow: var(--shadow-sm);">
        <div class="card-header">
          <span class="card-title">Member Net Balances</span>
          <span class="badge badge-slate">${balances.length} members</span>
        </div>
        <div class="card-body" style="padding: 0;">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Member</th>
                <th class="numeric">Total Paid</th>
                <th class="numeric">Fair Share</th>
                <th class="numeric">Net Position</th>
              </tr>
            </thead>
            <tbody>
              ${balances.map(b => `
                <tr>
                  <td>
                    <strong>${escapeHtml(b.name)}</strong>
                    ${b.userId === currentUserId ? '<span class="badge badge-slate" style="font-size: 10px; margin-left: 6px;">You</span>' : ''}
                  </td>
                  <td class="numeric">${cur} ${Number(b.totalPaid).toFixed(2)}</td>
                  <td class="numeric">${cur} ${Number(b.totalShare).toFixed(2)}</td>
                  <td class="numeric" style="font-weight: 700; color: ${b.netBalance > 0.01 ? 'var(--accent-emerald)' : (b.netBalance < -0.01 ? 'var(--danger-primary)' : 'var(--text-muted)')};">
                    ${b.netBalance > 0.01 ? `+${cur} ${b.netBalance.toFixed(2)}` : (b.netBalance < -0.01 ? `-${cur} ${Math.abs(b.netBalance).toFixed(2)}` : `${cur} 0.00`)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 3: Past Payments & Settle History -->
      <div class="card" style="box-shadow: var(--shadow-sm);">
        <div class="card-header">
          <span class="card-title">Payment &amp; Settle History</span>
          <span class="badge badge-slate">${history.length} records</span>
        </div>
        <div class="card-body" style="padding: 0;">
          ${history.length === 0 ? `
            <div style="padding: 32px; text-align: center; color: var(--text-muted); font-size: 14px;">
              No completed payments recorded yet for this group.
            </div>
          ` : `
            <table class="ledger-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th class="numeric">Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${history.map(s => `
                  <tr>
                    <td><strong>${escapeHtml(s.payer_name)}</strong></td>
                    <td><strong>${escapeHtml(s.payee_name)}</strong></td>
                    <td class="numeric" style="font-weight: 700;">${s.currency} ${Number(s.amount).toFixed(2)}</td>
                    <td>
                      <span class="badge ${s.status === 'paid' ? 'badge-green' : 'badge-amber'}">
                        ${s.payment_reference ? 'PayPal' : 'Cash'}
                      </span>
                    </td>
                    <td style="font-size: 12px; color: var(--text-muted);">
                      ${s.settled_at ? new Date(s.settled_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
}

async function handleSettlementGroupChange(groupId) {
    settlementsViewState.selectedGroupId = parseInt(groupId, 10);
    AppState.setActiveGroup(settlementsViewState.selectedGroupId);
    await loadSettlementData(settlementsViewState.selectedGroupId);
    renderSettlementsUI();
}

async function initiatePayPalSettlement(payerId, payeeId, amount, currency, customGroupId) {
    try {
        const groupId = customGroupId || settlementsViewState.selectedGroupId;
        const stRes = await API.post('/settlements', {
            groupId,
            payerId,
            payeeId,
            amount,
            currency
        });

        window.location.hash = `#/checkout/${stRes.settlement.id}`;
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function initiateCashSettlement(payerId, payeeId, amount, currency, customGroupId, customPayerName, customPayeeName) {
    const groupId = customGroupId || settlementsViewState.selectedGroupId;
    if (!confirm(`Mark payment of ${currency} ${Number(amount).toFixed(2)} as settled in cash?`)) {
        return;
    }

    try {
        const stRes = await API.post('/settlements', {
            groupId,
            payerId,
            payeeId,
            amount,
            currency
        });

        await API.post(`/settlements/${stRes.settlement.id}/cash-settle`, {});
        showToast('Settlement successfully recorded as paid!', 'success');

        // Look up names if not directly supplied
        let payerName = customPayerName;
        let payeeName = customPayeeName;
        let groupName = 'Expense Group';

        if (Array.isArray(settlementsViewState.groups)) {
            const grp = settlementsViewState.groups.find(g => String(g.id) === String(groupId));
            if (grp) groupName = grp.name;
        }

        if ((!payerName || !payeeName) && Array.isArray(settlementsViewState.balances)) {
            const p1 = settlementsViewState.balances.find(b => String(b.userId) === String(payerId));
            const p2 = settlementsViewState.balances.find(b => String(b.userId) === String(payeeId));
            if (p1 && !payerName) payerName = p1.name;
            if (p2 && !payeeName) payeeName = p2.name;
        }

        // Automatically query updated group status & clearance
        const [balRes, grpRes] = await Promise.all([
            API.get(`/settlements/group/${groupId}/balances`).catch(() => null),
            API.get(`/groups/${groupId}`).catch(() => null)
        ]);

        const isAllSettled = balRes ? (balRes.proposedTransfers || []).length === 0 : false;
        const memberNames = balRes ? (balRes.balances || []).map(b => b.name) : [];
        const isOwner = grpRes?.group?.owner_id === AppState.user?.id;
        const grpName = grpRes?.group?.name || groupName;
        const totalSpent = grpRes?.stats?.totalSpent || 0;

        // Automatically Trigger 3D Clearance / Paid Bill Celebration!
        if (typeof show3DBillModal === 'function') {
            show3DBillModal({
                groupId: groupId,
                isAllSettled: isAllSettled,
                title: isAllSettled ? 'OFFICIAL GROUP CLEARANCE CERTIFICATE' : 'CASH SETTLEMENT RECEIPT',
                stampText: isAllSettled ? 'ALL SETTLED' : 'SETTLED',
                groupName: grpName,
                payerName: payerName || (payerId === AppState.user?.id ? 'You' : 'Member'),
                payeeName: payeeName || (payeeId === AppState.user?.id ? 'You' : 'Member'),
                amount: Number(amount || 0),
                currency: currency || 'USD',
                paymentRef: `CASH-${Date.now().toString().slice(-6)}`,
                members: memberNames,
                totalSpent: totalSpent,
                isOwner: isOwner
            });
        }

        // Refresh view according to active page
        if (window.location.hash.startsWith('#/groups/')) {
            if (typeof renderGroupDetailsView === 'function') {
                renderGroupDetailsView(groupId, 'balances');
            }
        } else {
            await loadSettlementData(groupId);
            renderSettlementsUI();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function showSettlementClearanceBill(groupId) {
    try {
        const [grpRes, balRes] = await Promise.all([
            API.get(`/groups/${groupId}`).catch(() => null),
            API.get(`/settlements/group/${groupId}/balances`).catch(() => null)
        ]);
        const group = grpRes?.group || settlementsViewState.groups.find(g => String(g.id) === String(groupId)) || {};
        const memberNames = (balRes?.balances || settlementsViewState.balances || []).map(b => b.name);
        const totalSpent = grpRes?.stats?.totalSpent || 0;
        const isOwner = group.owner_id === AppState.user?.id;

        if (typeof show3DBillModal === 'function') {
            show3DBillModal({
                groupId: groupId,
                isAllSettled: true,
                title: 'OFFICIAL GROUP CLEARANCE CERTIFICATE',
                stampText: 'ALL SETTLED',
                groupName: group.name || 'Expense Group',
                currency: group.currency || 'USD',
                amount: 0,
                members: memberNames,
                totalSpent: totalSpent,
                isOwner: isOwner
            });
        }
    } catch (err) {
        console.error('Error opening 3D clearance bill:', err);
    }
}

function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'");
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

window.renderSettlementsView = renderSettlementsView;
window.handleSettlementGroupChange = handleSettlementGroupChange;
window.initiatePayPalSettlement = initiatePayPalSettlement;
window.initiateCashSettlement = initiateCashSettlement;
window.showSettlementClearanceBill = showSettlementClearanceBill;
