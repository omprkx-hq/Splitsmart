/**
 * View 4: My Groups
 * Clean, friendly group cards that dynamically adapt to theme.
 */

async function renderGroupsView() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="text-align: center; padding: 48px 0; color: var(--text-muted);">
        Loading groups...
      </div>
    `;

    try {
        const res = await API.get('/groups');
        const groups = res.groups || [];

        content.innerHTML = `
          <div class="page-header">
            <div>
              <h1 class="page-title">My Groups</h1>
              <p class="page-subtitle">Manage shared expenses for your trips, apartment, dinners, and projects.</p>
            </div>
            <button class="btn btn-primary" onclick="showCreateGroupModal()">${Icons.plus(14)} Create New Group</button>
          </div>

          ${groups.length === 0 ? `
            <div class="card" style="text-align: center; padding: 48px 24px;">
              <div style="margin-bottom: 12px; color: var(--text-muted);">${Icons.folder(40)}</div>
              <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">No expense groups yet</h3>
              <p style="color: var(--text-muted); max-width: 420px; margin: 0 auto 20px auto; font-size: 14px;">
                Create your first group for an upcoming trip, shared apartment, or friends dinner to start splitting costs.
              </p>
              <button class="btn btn-primary" onclick="showCreateGroupModal()">${Icons.plus(14)} Create First Group</button>
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
              ${groups.map(g => {
                  const budgetNum = g.budget ? Number(g.budget) : null;
                  const spentNum = Number(g.total_expenses || 0);
                  const pct = budgetNum ? Math.min(100, Math.round((spentNum / budgetNum) * 100)) : null;

                  return `
                    <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm);">
                      <div class="card-body">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                          <div>
                            <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                              <span class="badge ${g.role === 'owner' ? 'badge-primary' : 'badge-slate'}" style="font-size: 10px; text-transform: capitalize;">
                                ${g.role}
                              </span>
                              ${g.is_archived ? `
                                <span class="badge badge-amber" style="font-size: 10px;">Archived</span>
                              ` : ''}
                            </div>
                            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${escapeHtml(g.name)}</h3>
                            <div style="font-size: 13px; color: var(--text-muted);">${escapeHtml(g.purpose || 'General Expenses')}</div>
                          </div>
                          <span class="badge badge-slate" style="font-size: 11px;">${g.currency}</span>
                        </div>

                        <!-- Metrics Box -->
                        <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin: 16px 0;">
                          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span style="font-size: 13px; color: var(--text-muted);">Total Spent:</span>
                            <span style="font-size: 14px; font-weight: 700; color: var(--text-primary);" class="num">
                              ${g.currency} ${spentNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div style="display: flex; justify-content: space-between;">
                            <span style="font-size: 13px; color: var(--text-muted);">Members:</span>
                            <span style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${g.member_count}</span>
                          </div>

                          ${budgetNum ? `
                            <div style="margin-top: 10px; border-top: 1px dashed var(--border-subtle); padding-top: 8px;">
                              <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                                <span>Budget (${pct}%)</span>
                                <span>${g.currency} ${budgetNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div style="background: var(--border-subtle); height: 6px; border-radius: 3px; overflow: hidden;">
                                <div style="background: ${pct > 90 ? 'var(--danger-primary)' : 'var(--accent-emerald)'}; height: 100%; width: ${pct}%;"></div>
                              </div>
                            </div>
                          ` : ''}
                        </div>
                      </div>

                      <div class="card-footer" style="justify-content: flex-end;">
                        <a href="#/groups/${g.id}" class="btn btn-primary btn-sm">Open Group &rarr;</a>
                      </div>
                    </div>
                  `;
              }).join('')}
            </div>
          `}
        `;
    } catch (err) {
        content.innerHTML = `
          <div class="card" style="padding: 32px; text-align: center;">
            <p style="color: var(--danger-primary); margin-bottom: 12px;">${err.message}</p>
            <button class="btn btn-secondary" onclick="renderGroupsView()">Retry</button>
          </div>
        `;
    }
}

function showCreateGroupModal() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay" onclick="closeModal(event)">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="card-header">
            <span class="card-title">Create New Group</span>
            <button class="btn btn-secondary btn-sm" onclick="closeModal()">✕</button>
          </div>
          <form onsubmit="handleCreateGroup(event)">
            <div class="card-body">
              <!-- Friendly Quick Category Selector -->
              <div class="form-group" style="margin-bottom: 16px;">
                <label class="form-label" style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Quick Preset</label>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="selectGroupPreset('🏠 Roommates & Apartment', 'Household Rent & Groceries')">🏠 Roommates</button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="selectGroupPreset('✈️ Friends Vacation', 'Travel & Flights')">✈️ Friends Trip</button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="selectGroupPreset('🍕 Weekend Dinners', 'Food & Drinks')">🍕 Dinners & Outings</button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="selectGroupPreset('🎁 Family & Relatives Gift', 'Family Celebrations')">🎁 Family &amp; Relatives</button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="selectGroupPreset('💑 Couple & Shared Living', 'Personal & Daily')">💑 Couple / Personal</button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Group Name *</label>
                <input type="text" id="group-name" class="form-input" placeholder="e.g. Barcelona Trip, Apartment 4B, Friday Dinner" required autofocus>
              </div>

              <div class="form-group">
                <label class="form-label">Purpose / Category</label>
                <input type="text" id="group-purpose" class="form-input" placeholder="e.g. Travel, Household, Dining, Family">
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                  <label class="form-label">Currency</label>
                  <select id="group-currency" class="form-select">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Optional Budget</label>
                  <input type="number" id="group-budget" class="form-input" step="0.01" min="0" placeholder="e.g. 1000.00">
                </div>
              </div>
            </div>

            <div class="card-footer">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button type="submit" id="btn-save-group" class="btn btn-primary">Create Group &rarr;</button>
            </div>
          </form>
        </div>
      </div>
    `;
}

async function handleCreateGroup(e) {
    e.preventDefault();
    const name = document.getElementById('group-name').value.trim();
    const purpose = document.getElementById('group-purpose').value.trim();
    const currency = document.getElementById('group-currency').value;
    const budget = document.getElementById('group-budget').value;
    const btn = document.getElementById('btn-save-group');

    btn.disabled = true;
    btn.innerText = 'Creating...';

    try {
        const res = await API.post('/groups', {
            name,
            purpose,
            currency,
            budget: budget ? parseFloat(budget) : null
        });

        closeModal();
        showToast('Group created successfully!', 'success');
        renderGroupsView();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Create Group →';
    }
}

function closeModal(e) {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
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

function selectGroupPreset(name, purpose) {
    const nameInput = document.getElementById('group-name');
    const purposeInput = document.getElementById('group-purpose');
    if (nameInput) nameInput.value = name;
    if (purposeInput) purposeInput.value = purpose;
}

window.renderGroupsView = renderGroupsView;
window.showCreateGroupModal = showCreateGroupModal;
window.handleCreateGroup = handleCreateGroup;
window.selectGroupPreset = selectGroupPreset;
window.closeModal = closeModal;
