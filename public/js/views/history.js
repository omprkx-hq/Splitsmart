/**
 * View 10: Transaction History & Audit Ledger
 */

let historyState = {
    groups: [],
    selectedGroupId: '',
    selectedCategory: 'ALL',
    searchQuery: '',
    transactions: []
};

async function renderHistoryView() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="text-align: center; padding: 48px 0; color: #64748B;">
        Loading transaction audit history...
      </div>
    `;

    try {
        const groupsRes = await API.get('/groups');
        historyState.groups = groupsRes.groups || [];
        await fetchHistoryData();
        renderHistoryUI();
    } catch (err) {
        content.innerHTML = `
          <div class="card" style="padding: 32px; text-align: center;">
            <p style="color: #DC2626;">${err.message}</p>
          </div>
        `;
    }
}

async function fetchHistoryData() {
    let endpoint = `/activity?limit=50`;
    if (historyState.selectedGroupId) endpoint += `&groupId=${historyState.selectedGroupId}`;
    if (historyState.selectedCategory && historyState.selectedCategory !== 'ALL') {
        endpoint += `&category=${encodeURIComponent(historyState.selectedCategory)}`;
    }
    if (historyState.searchQuery) endpoint += `&search=${encodeURIComponent(historyState.searchQuery)}`;

    const res = await API.get(endpoint);
    historyState.transactions = res.transactions || [];
}

function renderHistoryUI() {
    const content = document.getElementById('app-content');
    if (!content) return;

    const list = historyState.transactions;

    content.innerHTML = `
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Transaction History</h1>
          <p class="page-subtitle">Complete ledger audit log across all your groups.</p>
        </div>
        <a href="#/add-expense" class="btn btn-primary btn-sm">+ Add New Expense</a>
      </div>

      <!-- Filters Bar -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-body" style="padding: 16px 20px;">
          <div style="display: grid; grid-template-columns: 2fr 1.5fr 1.5fr; gap: 14px;">
            <div>
              <label class="form-label" style="font-size: 12px;">Search Description or Payer</label>
              <input type="text" class="form-input" placeholder="Search by merchant or member..." value="${historyState.searchQuery}" oninput="historyState.searchQuery = this.value; debounceHistoryFetch();">
            </div>

            <div>
              <label class="form-label" style="font-size: 12px;">Filter by Group</label>
              <select class="form-select" onchange="historyState.selectedGroupId = this.value; fetchHistoryData().then(renderHistoryUI);">
                <option value="">All Groups</option>
                ${historyState.groups.map(g => `
                  <option value="${g.id}" ${String(g.id) === String(historyState.selectedGroupId) ? 'selected' : ''}>
                    ${g.name}
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="form-label" style="font-size: 12px;">Filter by Category</label>
              <select class="form-select" onchange="historyState.selectedCategory = this.value; fetchHistoryData().then(renderHistoryUI);">
                <option value="ALL" ${historyState.selectedCategory === 'ALL' ? 'selected' : ''}>All Categories</option>
                <option value="Food & Dining" ${historyState.selectedCategory === 'Food & Dining' ? 'selected' : ''}>Food &amp; Dining</option>
                <option value="Transportation" ${historyState.selectedCategory === 'Transportation' ? 'selected' : ''}>Transportation</option>
                <option value="Housing" ${historyState.selectedCategory === 'Housing' ? 'selected' : ''}>Housing</option>
                <option value="Entertainment" ${historyState.selectedCategory === 'Entertainment' ? 'selected' : ''}>Entertainment</option>
                <option value="Shopping" ${historyState.selectedCategory === 'Shopping' ? 'selected' : ''}>Shopping</option>
                <option value="Travel" ${historyState.selectedCategory === 'Travel' ? 'selected' : ''}>Travel</option>
                <option value="General" ${historyState.selectedCategory === 'General' ? 'selected' : ''}>General</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Itemized Ledger Table -->
      <div class="card" style="box-shadow: var(--shadow-sm);">
        <div class="card-header">
          <span class="card-title">Recorded Transactions (${list.length})</span>
          <span class="badge badge-slate">History</span>
        </div>
        <div class="card-body" style="padding: 0;">
          ${list.length === 0 ? `
            <div style="padding: 40px; text-align: center; color: var(--text-muted);">
              No matching transactions found. Try adjusting your filters.
            </div>
          ` : `
            <table class="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Group</th>
                  <th>Category</th>
                  <th>Paid By</th>
                  <th>Split Method</th>
                  <th class="numeric">Total Amount</th>
                  <th style="text-align: right;">3D Bill</th>
                </tr>
              </thead>
              <tbody>
                ${list.map(t => `
                  <tr>
                    <td style="font-size: 13px; color: var(--text-muted);">${t.date ? String(t.date).slice(0, 10) : ''}</td>
                    <td>
                      <strong style="color: var(--text-primary);">${t.description}</strong>
                      ${t.receipt_url ? `<a href="${t.receipt_url}" target="_blank" style="font-size: 11px; color: var(--info-primary); margin-left: 6px;">[Receipt ↗]</a>` : ''}
                    </td>
                    <td style="font-size: 13px; color: var(--text-primary);">${t.group_name}</td>
                    <td><span class="badge badge-slate" style="font-size: 11px;">${t.category}</span></td>
                    <td style="font-size: 13px; color: var(--text-secondary);">${t.payer_name}</td>
                    <td style="font-size: 12px; color: var(--text-muted);">${t.split_method.toLowerCase()} (${t.split_participant_count} people)</td>
                    <td class="numeric" style="font-weight: 700; font-size: 14px; color: var(--text-primary);">
                      ${t.currency} ${Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary btn-xs" onclick="showTransaction3DBill(${t.id}, '${escapeJs(t.description)}', '${escapeJs(t.group_name)}', '${escapeJs(t.payer_name)}', ${t.amount}, '${t.currency}', '${t.date ? String(t.date).slice(0, 10) : ''}')" style="font-size: 11px; padding: 4px 8px; color: var(--accent-lime); border-color: rgba(208, 240, 48, 0.3);">
                        View 3D ↗
                      </button>
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

let debounceTimer = null;
function debounceHistoryFetch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        await fetchHistoryData();
        renderHistoryUI();
    }, 300);
}

function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'");
}

function showTransaction3DBill(txId, desc, groupName, payerName, amount, currency, date) {
    if (typeof show3DBillModal === 'function') {
        show3DBillModal({
            title: 'VERIFIED EXPENSE BILL',
            stampText: 'PAID IN FULL',
            groupName: groupName || 'Expense Group',
            payerName: payerName || 'Payer',
            payeeName: desc || 'Itemized Bill',
            amount: Number(amount || 0),
            currency: currency || 'USD',
            paymentRef: `EXP-${txId}`,
            date: date || new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        });
    }
}

window.renderHistoryView = renderHistoryView;
window.debounceHistoryFetch = debounceHistoryFetch;
window.showTransaction3DBill = showTransaction3DBill;
