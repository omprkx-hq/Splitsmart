/**
 * View 6: Add Expense Form with Equal, Custom, Percentage, Shares, and Adjustment Splits
 * Supports single-payer and co-funding multi-payer expenses.
 */

let addExpenseState = {
    groups: [],
    selectedGroupId: null,
    members: [],
    splitMethod: 'EQUAL', // 'EQUAL' | 'CUSTOM' | 'PERCENTAGE' | 'SHARES' | 'ADJUSTMENT'
    isMultiPayer: false,
    coPayers: {}, // { [userId]: number }
    participants: {}, // { [userId]: { selected: boolean, customAmount: number, percentage: number, shares: number, adjustment: number } }
    savedDescription: '',
    savedAmount: '',
    savedCategory: 'General',
    savedDate: '',
    savedPayerId: null,
    savedNotes: ''
};

function captureExpenseInputs() {
    const desc = document.getElementById('exp-description');
    if (desc) addExpenseState.savedDescription = desc.value;
    const amt = document.getElementById('exp-amount');
    if (amt) addExpenseState.savedAmount = amt.value;
    const cat = document.getElementById('exp-category');
    if (cat) addExpenseState.savedCategory = cat.value;
    const payer = document.getElementById('exp-payer');
    if (payer) addExpenseState.savedPayerId = payer.value;
    const dt = document.getElementById('exp-date');
    if (dt) addExpenseState.savedDate = dt.value;
    const notes = document.getElementById('exp-notes');
    if (notes) addExpenseState.savedNotes = notes.value;
}

async function renderAddExpenseView(prefillData = null) {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="text-align: center; padding: 48px 0; color: #64748B;">
        Preparing expense entry ledger...
      </div>
    `;

    try {
        const groupsRes = await API.get('/groups');
        addExpenseState.groups = groupsRes.groups || [];

        if (addExpenseState.groups.length === 0) {
            content.innerHTML = `
              <div class="card" style="max-width: 500px; margin: 40px auto; text-align: center; padding: 40px;">
                <h3 style="margin-bottom: 8px;">No Expense Groups Found</h3>
                <p style="color: #64748B; margin-bottom: 20px;">You must belong to at least one expense group to record shared costs.</p>
                <a href="#/groups" class="btn btn-primary">+ Create an Expense Group</a>
              </div>
            `;
            return;
        }

        const defaultGroupId = prefillData?.groupId || AppState.activeGroupId || addExpenseState.groups[0].id;
        addExpenseState.selectedGroupId = defaultGroupId;

        await loadGroupMembers(defaultGroupId);

        if (prefillData) {
            applyExpensePrefill(prefillData);
        }

        renderExpenseForm();
    } catch (err) {
        content.innerHTML = `
          <div class="card" style="padding: 32px; text-align: center;">
            <p style="color: #DC2626; margin-bottom: 12px;">${err.message}</p>
            <button class="btn btn-secondary" onclick="renderAddExpenseView()">Retry</button>
          </div>
        `;
    }
}

async function loadGroupMembers(groupId) {
    const groupData = await API.get(`/groups/${groupId}`);
    addExpenseState.members = groupData.members || [];
    
    addExpenseState.participants = {};
    addExpenseState.coPayers = {};
    const equalShare = addExpenseState.members.length > 0 ? (100 / addExpenseState.members.length) : 0;

    addExpenseState.members.forEach(m => {
        addExpenseState.participants[m.id] = {
            selected: true,
            customAmount: 0,
            percentage: Number(equalShare.toFixed(2)),
            shares: 1,
            adjustment: 0
        };
        addExpenseState.coPayers[m.id] = 0;
    });
}

function applyExpensePrefill(data) {
    if (data.splitMethod) addExpenseState.splitMethod = data.splitMethod;
    if (data.participantNames && Array.isArray(data.participantNames)) {
        addExpenseState.members.forEach(m => {
            const isMatched = data.participantNames.some(name => 
                name.toLowerCase().includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(name.toLowerCase())
            );
            if (addExpenseState.participants[m.id]) {
                addExpenseState.participants[m.id].selected = isMatched;
            }
        });
    }
}

function renderExpenseForm() {
    const content = document.getElementById('app-content');
    if (!content) return;

    const currentGroup = addExpenseState.groups.find(g => g.id === addExpenseState.selectedGroupId) || addExpenseState.groups[0];
    const cur = currentGroup ? currentGroup.currency : 'USD';
    const splitMethod = addExpenseState.splitMethod;
    const isMultiPayer = addExpenseState.isMultiPayer;

    content.innerHTML = `
      <div style="max-width: 760px; margin: 0 auto; padding: 24px 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">Record Shared Expense</h1>
            <p style="font-size: 14px; color: var(--text-muted);">Deterministic zero-drift mathematical split with automated receipt delivery</p>
          </div>
          <a href="#/groups/${addExpenseState.selectedGroupId}" class="btn btn-secondary btn-sm">&larr; Back to Group</a>
        </div>

        <form id="add-expense-form" onsubmit="handleSaveExpense(event)">
          <div class="card" style="margin-bottom: 24px; box-shadow: var(--shadow-sm);">
            <div class="card-body">
              
              <!-- Group & Category Selection -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                  <label class="form-label">Expense Group *</label>
                  <select id="exp-group" class="form-select" onchange="handleGroupChange(this.value)" required>
                    ${addExpenseState.groups.map(g => `
                      <option value="${g.id}" ${g.id === addExpenseState.selectedGroupId ? 'selected' : ''}>
                        ${g.name} (${g.currency})
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Category *</label>
                  <select id="exp-category" class="form-select" required>
                    <option value="Food & Dining">Food &amp; Dining</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Housing">Housing &amp; Utilities</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Shopping">Shopping &amp; Groceries</option>
                    <option value="Travel">Travel &amp; Flights</option>
                    <option value="General" selected>General</option>
                  </select>
                </div>
              </div>

              <!-- Description & Total Amount -->
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
                <div class="form-group">
                  <label class="form-label">Description *</label>
                  <input type="text" id="exp-description" class="form-input" value="${escapeHtml(addExpenseState.savedDescription || '')}" placeholder="Expense description" required autofocus>
                </div>

                <div class="form-group">
                  <label class="form-label">Total Amount (${cur}) *</label>
                  <input type="number" id="exp-amount" class="form-input num" value="${addExpenseState.savedAmount || ''}" step="0.01" min="0.01" placeholder="0.00" oninput="updateSplitPreview()" required>
                </div>
              </div>

              <!-- Payer Configuration -->
              <div style="border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px 16px; background: var(--bg-surface); margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <label class="form-label" style="margin: 0; font-weight: 700;">Who Paid? *</label>
                  <button type="button" class="btn btn-secondary btn-xs" onclick="toggleMultiPayerMode()" style="font-size: 11px; padding: 4px 10px;">
                    ${isMultiPayer ? '✓ Co-Funding (Multiple Payers)' : '⇄ Switch to Multiple Payers'}
                  </button>
                </div>

                ${!isMultiPayer ? `
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                      <select id="exp-payer" class="form-select" required>
                        ${addExpenseState.members.map(m => `
                          <option value="${m.id}" ${m.id === AppState.user?.id ? 'selected' : ''}>
                            ${m.name} ${m.id === AppState.user?.id ? '(You)' : ''}
                          </option>
                        `).join('')}
                      </select>
                    </div>
                    <div>
                      <input type="date" id="exp-date" class="form-input" value="${new Date().toISOString().slice(0, 10)}" required>
                    </div>
                  </div>
                ` : `
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <span style="font-size: 12px; color: var(--text-muted);">Enter amount paid by each person:</span>
                      <span id="payer-balance-indicator" class="badge badge-slate" style="font-size: 11px;">Sum must equal total</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      ${addExpenseState.members.map(m => `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--bg-muted); border-radius: var(--radius-sm);">
                          <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${m.name} ${m.id === AppState.user?.id ? '(You)' : ''}</span>
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 12px; color: var(--text-muted);">${cur}</span>
                            <input type="number" step="0.01" min="0" class="form-input num" style="width: 110px; padding: 4px 8px; font-size: 13px;" id="copayer-${m.id}" value="${addExpenseState.coPayers[m.id] || ''}" placeholder="0.00" oninput="handleCoPayerInput(${m.id}, this.value)">
                          </div>
                        </div>
                      `).join('')}
                    </div>
                    <div style="margin-top: 12px;">
                      <label class="form-label">Expense Date</label>
                      <input type="date" id="exp-date" class="form-input" value="${new Date().toISOString().slice(0, 10)}" required>
                    </div>
                  </div>
                `}
              </div>

              <!-- Split Method Selection Tabs -->
              <div style="margin: 20px 0 12px 0;">
                <label class="form-label">How to Split? *</label>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button type="button" class="btn ${splitMethod === 'EQUAL' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setSplitMethod('EQUAL')">
                    = Split Equally
                  </button>
                  <button type="button" class="btn ${splitMethod === 'CUSTOM' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setSplitMethod('CUSTOM')">
                    Exact Amounts
                  </button>
                  <button type="button" class="btn ${splitMethod === 'PERCENTAGE' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setSplitMethod('PERCENTAGE')">
                    % By Percentage
                  </button>
                  <button type="button" class="btn ${splitMethod === 'SHARES' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setSplitMethod('SHARES')">
                    ⚖ By Shares (Weights)
                  </button>
                  <button type="button" class="btn ${splitMethod === 'ADJUSTMENT' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setSplitMethod('ADJUSTMENT')">
                    ± Adjustments
                  </button>
                </div>
              </div>

              <!-- Participants Split Matrix -->
              <div style="border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; background: var(--bg-muted); margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 13px; font-weight: 700; color: var(--text-primary); text-transform: uppercase;">
                    Participants (${addExpenseState.members.length})
                  </span>
                  <span id="split-balance-indicator" class="badge badge-green">Ready</span>
                </div>

                <div id="participants-container" style="display: flex; flex-direction: column; gap: 8px;">
                  ${addExpenseState.members.map(m => {
                      const pState = addExpenseState.participants[m.id] || { selected: true, customAmount: 0, percentage: 0, shares: 1, adjustment: 0 };
                      return `
                        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: var(--radius-sm);">
                          <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="part-check-${m.id}" ${pState.selected ? 'checked' : ''} onchange="toggleParticipant(${m.id}, this.checked)">
                            <label for="part-check-${m.id}" style="font-size: 14px; font-weight: 600; color: var(--text-primary); cursor: pointer;">
                              ${m.name}
                            </label>
                          </div>

                          <div style="display: flex; align-items: center; gap: 12px;">
                            ${splitMethod === 'CUSTOM' ? `
                              <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="font-size: 12px; color: var(--text-muted);">${cur}</span>
                                <input type="number" step="0.01" min="0" class="form-input num" style="width: 100px; padding: 4px 8px; font-size: 13px;" id="custom-val-${m.id}" value="${pState.customAmount || ''}" placeholder="0.00" oninput="handleCustomAmountInput(${m.id}, this.value)" ${!pState.selected ? 'disabled' : ''}>
                              </div>
                            ` : splitMethod === 'PERCENTAGE' ? `
                              <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="number" step="0.1" min="0" max="100" class="form-input num" style="width: 70px; padding: 4px 8px; font-size: 13px;" id="pct-val-${m.id}" value="${pState.percentage || ''}" placeholder="0%" oninput="handlePercentageInput(${m.id}, this.value)" ${!pState.selected ? 'disabled' : ''}>
                                <span style="font-size: 12px; color: var(--text-muted);">%</span>
                              </div>
                            ` : splitMethod === 'SHARES' ? `
                              <div style="display: flex; align-items: center; gap: 4px;">
                                <input type="number" step="0.5" min="0.1" class="form-input num" style="width: 70px; padding: 4px 8px; font-size: 13px;" id="shares-val-${m.id}" value="${pState.shares || 1}" placeholder="1" oninput="handleSharesInput(${m.id}, this.value)" ${!pState.selected ? 'disabled' : ''}>
                                <span style="font-size: 12px; color: var(--text-muted);">shares</span>
                              </div>
                            ` : splitMethod === 'ADJUSTMENT' ? `
                              <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="font-size: 12px; color: var(--text-muted);">${cur}</span>
                                <input type="number" step="0.01" class="form-input num" style="width: 85px; padding: 4px 8px; font-size: 13px;" id="adj-val-${m.id}" value="${pState.adjustment || ''}" placeholder="+0.00" oninput="handleAdjustmentInput(${m.id}, this.value)" ${!pState.selected ? 'disabled' : ''}>
                              </div>
                            ` : ''}

                            <div style="min-width: 90px; text-align: right; font-size: 14px; font-weight: 600; color: var(--text-primary);" class="num" id="share-display-${m.id}">
                              ${cur} 0.00
                            </div>
                          </div>
                        </div>
                      `;
                  }).join('')}
                </div>
              </div>

              <!-- Notes (Optional) -->
              <div class="form-group">
                <label class="form-label">Notes (Optional)</label>
                <input type="text" id="exp-notes" class="form-input" placeholder="Additional details or notes">
              </div>

            </div>

            <div class="card-footer" style="display: flex; justify-content: flex-end; gap: 12px;">
              <a href="#/groups/${addExpenseState.selectedGroupId}" class="btn btn-secondary">Cancel</a>
              <button type="submit" class="btn btn-primary" id="btn-save-expense">
                Record Expense &amp; Dispatch Receipts &rarr;
              </button>
            </div>
          </div>
        </form>
      </div>
    `;

    updateSplitPreview();
}

async function handleGroupChange(groupId) {
    captureExpenseInputs();
    addExpenseState.selectedGroupId = parseInt(groupId, 10);
    await loadGroupMembers(addExpenseState.selectedGroupId);
    renderExpenseForm();
}

function toggleMultiPayerMode() {
    addExpenseState.isMultiPayer = !addExpenseState.isMultiPayer;
    renderExpenseForm();
}

function handleCoPayerInput(userId, val) {
    addExpenseState.coPayers[userId] = parseFloat(val) || 0;
    updatePayerBalanceIndicator();
}

function updatePayerBalanceIndicator() {
    const amountInput = document.getElementById('exp-amount');
    const indicator = document.getElementById('payer-balance-indicator');
    if (!amountInput || !indicator || !addExpenseState.isMultiPayer) return;

    const total = parseFloat(amountInput.value) || 0;
    const currentGroup = addExpenseState.groups.find(g => g.id === addExpenseState.selectedGroupId);
    const cur = currentGroup ? currentGroup.currency : 'USD';

    let sum = 0;
    Object.values(addExpenseState.coPayers).forEach(amt => { sum += amt; });

    const diff = total - sum;
    if (Math.abs(diff) < 0.01 && total > 0) {
        indicator.className = 'badge badge-green';
        indicator.innerText = `Exact match: ${cur} ${sum.toFixed(2)}`;
    } else {
        indicator.className = 'badge badge-red';
        indicator.innerText = `Sum: ${cur} ${sum.toFixed(2)} / ${cur} ${total.toFixed(2)} (${diff > 0 ? 'Short' : 'Over'} by ${Math.abs(diff).toFixed(2)})`;
    }
}

function setSplitMethod(method) {
    captureExpenseInputs();
    addExpenseState.splitMethod = method;
    renderExpenseForm();
}

function toggleMultiPayerMode() {
    captureExpenseInputs();
    addExpenseState.isMultiPayer = !addExpenseState.isMultiPayer;
    renderExpenseForm();
}

function toggleParticipant(userId, isChecked) {
    if (addExpenseState.participants[userId]) {
        addExpenseState.participants[userId].selected = isChecked;
    }
    updateSplitPreview();
}

function handleCustomAmountInput(userId, val) {
    if (addExpenseState.participants[userId]) {
        addExpenseState.participants[userId].customAmount = parseFloat(val) || 0;
    }
    updateSplitPreview();
}

function handlePercentageInput(userId, val) {
    if (addExpenseState.participants[userId]) {
        addExpenseState.participants[userId].percentage = parseFloat(val) || 0;
    }
    updateSplitPreview();
}

function handleSharesInput(userId, val) {
    if (addExpenseState.participants[userId]) {
        addExpenseState.participants[userId].shares = parseFloat(val) || 1;
    }
    updateSplitPreview();
}

function handleAdjustmentInput(userId, val) {
    if (addExpenseState.participants[userId]) {
        addExpenseState.participants[userId].adjustment = parseFloat(val) || 0;
    }
    updateSplitPreview();
}

function updateSplitPreview() {
    const amountInput = document.getElementById('exp-amount');
    const indicator = document.getElementById('split-balance-indicator');
    if (!amountInput || !indicator) return;

    const total = parseFloat(amountInput.value) || 0;
    const currentGroup = addExpenseState.groups.find(g => g.id === addExpenseState.selectedGroupId);
    const cur = currentGroup ? currentGroup.currency : 'USD';
    const method = addExpenseState.splitMethod;

    if (addExpenseState.isMultiPayer) {
        updatePayerBalanceIndicator();
    }

    const selectedMembers = addExpenseState.members.filter(m => addExpenseState.participants[m.id]?.selected);

    if (total <= 0 || selectedMembers.length === 0) {
        indicator.className = 'badge badge-slate';
        indicator.innerText = 'Enter amount to calculate';
        addExpenseState.members.forEach(m => {
            const el = document.getElementById(`share-display-${m.id}`);
            if (el) el.innerText = `${cur} 0.00`;
        });
        return;
    }

    const totalCents = Math.round(total * 100);

    // 1. EQUAL
    if (method === 'EQUAL') {
        const baseCents = Math.floor(totalCents / selectedMembers.length);
        let remCents = totalCents % selectedMembers.length;

        addExpenseState.members.forEach(m => {
            const el = document.getElementById(`share-display-${m.id}`);
            if (!el) return;
            if (addExpenseState.participants[m.id]?.selected) {
                const extra = remCents > 0 ? 1 : 0;
                if (remCents > 0) remCents--;
                const shareAmt = (baseCents + extra) / 100;
                el.innerText = `${cur} ${shareAmt.toFixed(2)}`;
            } else {
                el.innerText = `${cur} 0.00`;
            }
        });

        indicator.className = 'badge badge-green';
        indicator.innerText = `Exact: ${selectedMembers.length} shares sum to ${cur} ${total.toFixed(2)}`;
    } 
    // 2. CUSTOM
    else if (method === 'CUSTOM') {
        let sum = 0;
        selectedMembers.forEach(m => {
            const amt = addExpenseState.participants[m.id]?.customAmount || 0;
            sum += amt;
            const el = document.getElementById(`share-display-${m.id}`);
            if (el) el.innerText = `${cur} ${amt.toFixed(2)}`;
        });

        const diff = total - sum;
        if (Math.abs(diff) < 0.01) {
            indicator.className = 'badge badge-green';
            indicator.innerText = `Exact: Sum matches total (${cur} ${total.toFixed(2)})`;
        } else {
            indicator.className = 'badge badge-red';
            indicator.innerText = `Mismatch: ${cur} ${sum.toFixed(2)} / ${cur} ${total.toFixed(2)} (${diff > 0 ? 'Short by' : 'Over by'} ${Math.abs(diff).toFixed(2)})`;
        }
    } 
    // 3. PERCENTAGE
    else if (method === 'PERCENTAGE') {
        let sumPct = 0;
        selectedMembers.forEach(m => {
            const pct = addExpenseState.participants[m.id]?.percentage || 0;
            sumPct += pct;
            const shareAmt = (total * pct) / 100;
            const el = document.getElementById(`share-display-${m.id}`);
            if (el) el.innerText = `${cur} ${shareAmt.toFixed(2)}`;
        });

        if (Math.abs(sumPct - 100) < 0.01) {
            indicator.className = 'badge badge-green';
            indicator.innerText = 'Exact: Percentages sum to 100%';
        } else {
            indicator.className = 'badge badge-red';
            indicator.innerText = `Mismatch: Current sum is ${sumPct.toFixed(1)}% (Must equal 100%)`;
        }
    }
    // 4. SHARES / WEIGHTS
    else if (method === 'SHARES') {
        let totalShares = 0;
        selectedMembers.forEach(m => {
            const sh = Number(addExpenseState.participants[m.id]?.shares || 1);
            totalShares += sh;
        });

        if (totalShares > 0) {
            let allocatedCents = 0;
            const computed = selectedMembers.map(m => {
                const sh = Number(addExpenseState.participants[m.id]?.shares || 1);
                const shareCents = Math.floor((totalCents * sh) / totalShares);
                allocatedCents += shareCents;
                return { member: m, shareCents, shares: sh };
            });

            let remCents = totalCents - allocatedCents;
            computed.sort((a, b) => b.shares - a.shares);
            for (let i = 0; i < computed.length && remCents > 0; i++) {
                computed[i].shareCents += 1;
                remCents--;
            }

            computed.forEach(c => {
                const el = document.getElementById(`share-display-${c.member.id}`);
                if (el) el.innerText = `${cur} ${(c.shareCents / 100).toFixed(2)}`;
            });

            indicator.className = 'badge badge-green';
            indicator.innerText = `Exact: ${totalShares} total shares sum to ${cur} ${total.toFixed(2)}`;
        }
    }
    // 5. ADJUSTMENT
    else if (method === 'ADJUSTMENT') {
        let sumAdjCents = 0;
        selectedMembers.forEach(m => {
            const adj = addExpenseState.participants[m.id]?.adjustment || 0;
            sumAdjCents += Math.round(adj * 100);
        });

        const basePoolCents = totalCents - sumAdjCents;
        if (basePoolCents < 0) {
            indicator.className = 'badge badge-red';
            indicator.innerText = `Adjustments exceed total amount by ${cur} ${Math.abs(basePoolCents / 100).toFixed(2)}`;
            return;
        }

        const basePerPerson = Math.floor(basePoolCents / selectedMembers.length);
        let remCents = basePoolCents % selectedMembers.length;

        selectedMembers.forEach(m => {
            const extra = remCents > 0 ? 1 : 0;
            if (remCents > 0) remCents--;
            const adjCents = Math.round((addExpenseState.participants[m.id]?.adjustment || 0) * 100);
            const userCents = basePerPerson + extra + adjCents;
            const el = document.getElementById(`share-display-${m.id}`);
            if (el) el.innerText = `${cur} ${(userCents / 100).toFixed(2)}`;
        });

        indicator.className = 'badge badge-green';
        indicator.innerText = `Exact: Base + adjustments sum to ${cur} ${total.toFixed(2)}`;
    }
}

async function handleSaveExpense(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-expense');
    const description = document.getElementById('exp-description').value.trim();
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const category = document.getElementById('exp-category').value;
    const date = document.getElementById('exp-date').value;
    const notes = document.getElementById('exp-notes')?.value || null;

    const selectedMembers = addExpenseState.members.filter(m => addExpenseState.participants[m.id]?.selected);
    if (selectedMembers.length === 0) {
        showToast('Please select at least one participant for the split.', 'error');
        return;
    }

    // Resolve Payers
    let payersPayload = [];
    let payerId = null;

    if (addExpenseState.isMultiPayer) {
        let sumPayer = 0;
        addExpenseState.members.forEach(m => {
            const amt = addExpenseState.coPayers[m.id] || 0;
            if (amt > 0) {
                sumPayer += amt;
                payersPayload.push({ userId: m.id, amount: amt });
            }
        });

        if (Math.abs(sumPayer - amount) > 0.01) {
            showToast(`Sum of co-payers ($${sumPayer.toFixed(2)}) does not match total expense amount ($${amount.toFixed(2)}).`, 'error');
            return;
        }
        payerId = payersPayload[0]?.userId;
    } else {
        payerId = parseInt(document.getElementById('exp-payer').value, 10);
        payersPayload = [{ userId: payerId, amount }];
    }

    const participantsPayload = selectedMembers.map(m => ({
        userId: m.id,
        shareAmount: addExpenseState.participants[m.id]?.customAmount,
        percentage: addExpenseState.participants[m.id]?.percentage,
        shares: addExpenseState.participants[m.id]?.shares,
        adjustment: addExpenseState.participants[m.id]?.adjustment
    }));

    btn.disabled = true;
    btn.innerText = 'Recording & Dispatching Receipts...';

    try {
        await API.post('/expenses', {
            groupId: addExpenseState.selectedGroupId,
            description,
            amount,
            payerId,
            payers: payersPayload,
            splitMethod: addExpenseState.splitMethod,
            category,
            date,
            notes,
            participants: participantsPayload
        });

        showToast('Expense recorded and HTML receipts dispatched to all members!', 'success');
        window.location.hash = `#/groups/${addExpenseState.selectedGroupId}`;
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Record Expense & Dispatch Receipts →';
    }
}

window.renderAddExpenseView = renderAddExpenseView;
window.handleGroupChange = handleGroupChange;
window.toggleMultiPayerMode = toggleMultiPayerMode;
window.handleCoPayerInput = handleCoPayerInput;
window.setSplitMethod = setSplitMethod;
window.toggleParticipant = toggleParticipant;
window.handleCustomAmountInput = handleCustomAmountInput;
window.handlePercentageInput = handlePercentageInput;
window.handleSharesInput = handleSharesInput;
window.handleAdjustmentInput = handleAdjustmentInput;
window.updateSplitPreview = updateSplitPreview;
window.handleSaveExpense = handleSaveExpense;
