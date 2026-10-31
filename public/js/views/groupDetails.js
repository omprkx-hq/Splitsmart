/**
 * View 5: Group Details & Expenses
 * Clean, human, friendly UI modeled after Splitwise and Wise.
 */

let currentGroupTab = 'expenses'; // 'expenses' | 'balances' | 'members'

async function renderGroupDetailsView(groupId, activeTab = null) {
    const content = document.getElementById('app-content');
    if (!content) return;

    if (!groupId) {
        window.location.hash = '#/groups';
        return;
    }

    if (activeTab) currentGroupTab = activeTab;

    content.innerHTML = `
      <div style="text-align: center; padding: 48px 0; color: var(--text-muted);">
        Loading group...
      </div>
    `;

    try {
        const [groupData, expensesData, balancesData] = await Promise.all([
            API.get(`/groups/${groupId}`),
            API.get(`/expenses/group/${groupId}`),
            API.get(`/settlements/group/${groupId}/balances`).catch(() => ({ balances: [], proposedTransfers: [] }))
        ]);

        const group = groupData.group;
        const members = groupData.members || [];
        const pendingInvitations = groupData.pendingInvitations || [];
        const stats = groupData.stats || {};
        const expenses = expensesData.expenses || [];
        const balances = balancesData.balances || [];
        const isSimplified = balancesData.simplifyDebts !== false;
        const proposedTransfers = balancesData.proposedTransfers || [];
        const directPairwiseDebts = balancesData.directPairwiseDebts || [];
        const activeDebtsList = isSimplified ? proposedTransfers : directPairwiseDebts;
        const currentUserId = AppState.user?.id;

        AppState.setActiveGroup(groupId);

        // Calculate current user's balance in this group
        const myBalanceObj = balances.find(b => b.userId === currentUserId);
        const myNet = myBalanceObj ? Number(myBalanceObj.netBalance || 0) : 0;

        let balanceBannerText = "You are all settled up in this group.";
        let balanceBannerClass = "banner-settled";
        if (myNet > 0.01) {
            balanceBannerText = `You are owed ${group.currency} ${myNet.toFixed(2)} in this group.`;
            balanceBannerClass = "banner-owed";
        } else if (myNet < -0.01) {
            balanceBannerText = `You owe ${group.currency} ${Math.abs(myNet).toFixed(2)} in this group.`;
            balanceBannerClass = "banner-debt";
        }

        content.innerHTML = `
          <!-- Page Header -->
          <div class="page-header" style="margin-bottom: 20px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <a href="#/groups" style="color: var(--text-muted); font-size: 13px; font-weight: 600;">&larr; All Groups</a>
                <span class="badge badge-slate">${group.currency}</span>
              </div>
              <h1 class="page-title" style="margin-bottom: 4px;">${escapeHtml(group.name)}</h1>
              <p class="page-subtitle">${escapeHtml(group.purpose || 'Shared Expenses')} &bull; Created by ${escapeHtml(group.owner_name)}</p>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
              <button class="btn btn-secondary" onclick="showInviteModal(${groupId}, '${escapeJs(group.name)}')">
                ${Icons.mail(14)} Invite Member
              </button>
              <a href="#/settlements" class="btn btn-secondary">
                ${Icons.scale(14)} Settle Up
              </a>
              <a href="#/add-expense" class="btn btn-primary">
                ${Icons.plus(14)} Add Expense
              </a>
            </div>
          </div>

          <!-- Group Balance Summary Banner -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: gap; gap: 16px; box-shadow: var(--shadow-sm);">
            <div>
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 4px;">
                Your Group Balance
              </div>
              <div style="font-size: 20px; font-weight: 800; color: ${myNet > 0.01 ? 'var(--accent-emerald)' : (myNet < -0.01 ? 'var(--danger-primary)' : 'var(--text-primary)')};">
                ${balanceBannerText}
              </div>
            </div>
            <div style="display: flex; gap: 24px; text-align: right;">
              <div>
                <div style="font-size: 12px; color: var(--text-muted);">Total Group Spend</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);" class="num">
                  ${group.currency} ${Number(stats.totalSpent || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div style="font-size: 12px; color: var(--text-muted);">Members</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">
                  ${members.length}
                </div>
              </div>
            </div>
          </div>

          <!-- Tab Navigation -->
          <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-subtle); margin-bottom: 24px;">
            <button class="tab-button ${currentGroupTab === 'expenses' ? 'active' : ''}" onclick="switchGroupTab(${groupId}, 'expenses')">
              ${Icons.receipt(14)} Expenses (${expenses.length})
            </button>
            <button class="tab-button ${currentGroupTab === 'balances' ? 'active' : ''}" onclick="switchGroupTab(${groupId}, 'balances')">
              ${Icons.scale(14)} Balances &amp; Settle (${activeDebtsList.length})
            </button>
            <button class="tab-button ${currentGroupTab === 'members' ? 'active' : ''}" onclick="switchGroupTab(${groupId}, 'members')">
              ${Icons.users(14)} Members (${members.length}) ${pendingInvitations.length > 0 ? `<span class="badge badge-amber" style="margin-left: 4px;">${pendingInvitations.length} pending</span>` : ''}
            </button>
          </div>

          <!-- Tab 1: Expenses Feed -->
          ${currentGroupTab === 'expenses' ? `
            <div class="card" style="box-shadow: var(--shadow-sm);">
              <div class="card-header">
                <div>
                  <span class="card-title">Shared Expenses</span>
                  <div style="font-size: 13px; color: var(--text-muted);">All recorded bills and costs in this group</div>
                </div>
                <a href="#/add-expense" class="btn btn-primary btn-sm">${Icons.plus(13)} Add Expense</a>
              </div>
              <div class="card-body" style="padding: 0;">
                ${expenses.length === 0 ? `
                  <div style="padding: 48px 24px; text-align: center; color: var(--text-muted);">
                    <div style="margin-bottom: 12px; color: var(--text-muted);">${Icons.receipt(36)}</div>
                    <h3 style="font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">No expenses yet</h3>
                    <p style="font-size: 14px; max-width: 400px; margin: 0 auto 18px auto;">
                      Whenever someone pays for dinner, groceries, or a booking, add it here to split the cost fairly.
                    </p>
                    <a href="#/add-expense" class="btn btn-primary btn-sm">${Icons.plus(13)} Add First Expense</a>
                  </div>
                ` : `
                  <div style="display: flex; flex-direction: column;">
                    ${expenses.map(e => {
                        const isPayer = e.payer_id === currentUserId;
                        const dateStr = e.date ? new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                        
                        return `
                          <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); gap: 16px;">
                            <div style="display: flex; align-items: center; gap: 14px;">
                              <div style="width: 42px; height: 42px; border-radius: var(--radius-md); background: var(--bg-muted); display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                ${getCategoryIcon(e.category)}
                              </div>
                              <div>
                                <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">
                                  ${escapeHtml(e.description)}
                                  ${e.receipt_url ? `<a href="${e.receipt_url}" target="_blank" style="font-size: 12px; color: var(--info-primary); margin-left: 6px;">[Receipt ↗]</a>` : ''}
                                </div>
                                <div style="font-size: 13px; color: var(--text-muted);">
                                  ${dateStr} &bull; Paid by <strong style="color: var(--text-secondary);">${e.payers && e.payers.length > 1 ? `${e.payers.length} co-payers` : (isPayer ? 'You' : escapeHtml(e.payer_name))}</strong>
                                  ${e.payers && e.payers.length > 1 ? `<span style="font-size: 11px; color: var(--accent-lime); margin-left: 4px;">(${e.payers.map(p => `${p.userId === currentUserId ? 'You' : escapeHtml(p.name)}: ${e.currency} ${p.amountPaid.toFixed(2)}`).join(', ')})</span>` : ''}
                                </div>
                              </div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 20px;">
                              <div style="text-align: right;">
                                <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);" class="num">
                                  ${e.currency} ${Number(e.amount).toFixed(2)}
                                </div>
                                <div style="font-size: 12px; color: var(--text-muted);">
                                  ${e.split_method.toLowerCase()} split
                                </div>
                              </div>

                              <button class="btn btn-secondary btn-sm" onclick="handleDeleteExpense(${e.id}, ${groupId})" title="Delete expense" style="color: var(--danger-primary); padding: 6px 10px;">
                                ${Icons.trash(14)}
                              </button>
                            </div>
                          </div>
                        `;
                    }).join('')}
                  </div>
                `}
              </div>
            </div>
          ` : ''}

          <!-- Tab 2: Balances & Settle Up -->
          ${currentGroupTab === 'balances' ? `
            <div class="card" style="box-shadow: var(--shadow-sm); margin-bottom: 24px;">
              <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                  <span class="card-title">Who Owes Whom</span>
                  <div style="font-size: 13px; color: var(--text-muted);">${isSimplified ? 'Algorithmic debt minimization (fewest total payments)' : 'Direct 1-on-1 debts to original bill payers'}</div>
                </div>

                <!-- Direct vs Simplified Debts Toggle -->
                <div style="display: flex; gap: 4px; background: var(--bg-surface); padding: 3px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                  <button class="btn ${isSimplified ? 'btn-primary' : 'btn-secondary'} btn-xs" onclick="toggleGroupSimplifyDebts(${group.id}, true)" style="font-size: 11px; padding: 4px 10px; cursor: pointer;">
                    Simplified (Fewest)
                  </button>
                  <button class="btn ${!isSimplified ? 'btn-primary' : 'btn-secondary'} btn-xs" onclick="toggleGroupSimplifyDebts(${group.id}, false)" style="font-size: 11px; padding: 4px 10px; cursor: pointer;">
                    Direct 1-on-1
                  </button>
                </div>
              </div>
              <div class="card-body" style="padding: 0;">
                ${activeDebtsList.length === 0 ? `
                  <div style="padding: 44px 24px; text-align: center;">
                    <div style="margin-bottom: 12px; color: var(--accent-emerald);">${Icons.checkCircle(40)}</div>
                    <h3 style="font-size: 19px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">Zero Outstanding Debts!</h3>
                    <p style="font-size: 14px; color: var(--text-muted); max-width: 440px; margin: 0 auto 18px auto;">
                      All expenses in <strong>${escapeHtml(group.name)}</strong> have been settled in full.
                    </p>
                    
                    <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                      <button class="btn btn-primary btn-sm" onclick="showGroupAllSettledBill(${group.id})" style="display: inline-flex; align-items: center; gap: 8px;">
                        ${Icons.receipt(14)} View 3D Clearance Bill &rarr;
                      </button>

                      ${group.owner_id === currentUserId ? `
                        <button class="btn btn-secondary btn-sm" onclick="handleArchiveGroupFromModal(${group.id})" title="Freeze group as read-only historical audit archive">
                          ${Icons.shield(14)} Archive Group (Audit-Safe)
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="handleDeleteGroupFromModal(${group.id}, '${escapeJs(group.name)}')" style="color: var(--danger-primary);" title="Permanently delete group and all expenses">
                          ${Icons.trash(14)} Delete Group
                        </button>
                      ` : `
                        <button class="btn btn-secondary btn-sm" onclick="handleLeaveGroupFromModal(${group.id}, '${escapeJs(group.name)}')">
                          Leave Settled Group
                        </button>
                      `}
                    </div>
                  </div>
                ` : `
                  <div style="display: flex; flex-direction: column;">
                    ${activeDebtsList.map(t => {
                        const isCurrentUserPayer = t.payerId === currentUserId;
                        const isCurrentUserPayee = t.payeeId === currentUserId;

                        return `
                          <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); gap: 16px;">
                            <div style="display: flex; align-items: center; gap: 12px; font-size: 15px;">
                              <strong style="color: var(--text-primary);">${isCurrentUserPayer ? 'You' : escapeHtml(t.payerName)}</strong>
                              <span style="color: var(--text-muted);">&rarr; owes &rarr;</span>
                              <strong style="color: var(--text-primary);">${isCurrentUserPayee ? 'You' : escapeHtml(t.payeeName)}</strong>
                            </div>

                            <div style="display: flex; align-items: center; gap: 16px;">
                              <div style="font-size: 17px; font-weight: 800; color: var(--text-primary);" class="num">
                                ${group.currency} ${Number(t.amount).toFixed(2)}
                              </div>

                              ${isCurrentUserPayer ? `
                                <button class="btn btn-green btn-sm" onclick="initiatePayPalSettlement(${t.payerId}, ${t.payeeId}, ${t.amount}, '${group.currency}', ${group.id})">
                                  Pay via PayPal &rarr;
                                </button>
                              ` : isCurrentUserPayee ? `
                                <button class="btn btn-secondary btn-sm" onclick="initiateCashSettlement(${t.payerId}, ${t.payeeId}, ${t.amount}, '${group.currency}', ${group.id}, '${escapeJs(t.payerName)}', '${escapeJs(t.payeeName)}')">
                                  ${Icons.check(13)} Mark Cash Received
                                </button>
                              ` : `
                                <span class="badge badge-slate" style="font-size: 11px;">Pending</span>
                              `}
                            </div>
                          </div>
                        `;
                    }).join('')}
                  </div>
                `}
              </div>
            </div>

            <!-- Member Balances Breakdown Table -->
            <div class="card" style="box-shadow: var(--shadow-sm);">
              <div class="card-header">
                <span class="card-title">Member Total Positions</span>
              </div>
              <div class="card-body" style="padding: 0;">
                <table class="ledger-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th class="numeric">Paid</th>
                      <th class="numeric">Fair Share</th>
                      <th class="numeric">Net Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${balances.map(b => `
                      <tr>
                        <td>
                          <strong>${escapeHtml(b.name)}</strong>
                          ${b.userId === currentUserId ? '<span class="badge badge-slate" style="font-size: 10px; margin-left: 6px;">You</span>' : ''}
                        </td>
                        <td class="numeric">${group.currency} ${Number(b.totalPaid).toFixed(2)}</td>
                        <td class="numeric">${group.currency} ${Number(b.totalShare).toFixed(2)}</td>
                        <td class="numeric" style="font-weight: 700; color: ${b.netBalance > 0.01 ? 'var(--accent-emerald)' : (b.netBalance < -0.01 ? 'var(--danger-primary)' : 'var(--text-muted)')};">
                          ${b.netBalance > 0.01 ? `+${group.currency} ${b.netBalance.toFixed(2)}` : (b.netBalance < -0.01 ? `-${group.currency} ${Math.abs(b.netBalance).toFixed(2)}` : `${group.currency} 0.00`)}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <!-- Tab 3: Members & Invitations -->
          ${currentGroupTab === 'members' ? `
            <div class="card" style="box-shadow: var(--shadow-sm); margin-bottom: 24px;">
              <div class="card-header">
                <div>
                  <span class="card-title">Active Members (${members.length})</span>
                  <div style="font-size: 13px; color: var(--text-muted);">Everyone who can view and add expenses to this group</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="showInviteModal(${groupId}, '${escapeJs(group.name)}')">
                  + Invite Member
                </button>
              </div>
              <div class="card-body" style="padding: 0;">
                <div style="display: flex; flex-direction: column;">
                  ${members.map(m => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border-subtle);">
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 9999px; background: var(--bg-muted); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: var(--text-primary);">
                          ${(m.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">
                            ${escapeHtml(m.name)}
                            ${m.id === currentUserId ? '<span style="font-size: 12px; font-weight: 500; color: var(--text-muted); margin-left: 4px;">(You)</span>' : ''}
                          </div>
                          <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(m.email)}</div>
                        </div>
                      </div>
                      <span class="badge ${m.role === 'owner' ? 'badge-primary' : 'badge-slate'}" style="text-transform: capitalize;">
                        ${m.role}
                      </span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Pending Invitations Section -->
            <div class="card" style="box-shadow: var(--shadow-sm);">
              <div class="card-header">
                <div>
                  <span class="card-title">Pending Invitations (${pendingInvitations.length})</span>
                  <div style="font-size: 13px; color: var(--text-muted);">Invited people who have not joined yet. You can copy and send their join link anytime.</div>
                </div>
              </div>
              <div class="card-body" style="padding: 0;">
                ${pendingInvitations.length === 0 ? `
                  <div style="padding: 32px; text-align: center; color: var(--text-muted); font-size: 14px;">
                    No pending invitations. Click <strong>+ Invite Member</strong> above to invite your friends.
                  </div>
                ` : `
                  <div style="display: flex; flex-direction: column;">
                    ${pendingInvitations.map(inv => `
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border-subtle); gap: 12px; flex-wrap: wrap;">
                        <div>
                          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${escapeHtml(inv.email)}</div>
                          <div style="font-size: 12px; color: var(--text-muted);">
                            Expires: ${new Date(inv.expiresAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div style="display: flex; gap: 8px;">
                          <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${inv.inviteUrl}')">
                            ${Icons.copy(13)} Copy Invite Link
                          </button>
                          <button class="btn btn-secondary btn-sm" style="color: var(--danger-primary);" onclick="handleCancelInvite(${groupId}, ${inv.id})">
                            Cancel
                          </button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>
          ` : ''}
        `;
    } catch (err) {
        content.innerHTML = `
          <div class="card" style="padding: 32px; text-align: center;">
            <p style="color: var(--danger-primary); margin-bottom: 12px;">${err.message}</p>
            <a href="#/groups" class="btn btn-secondary">Back to Groups</a>
          </div>
        `;
    }
}

function switchGroupTab(groupId, tab) {
    currentGroupTab = tab;
    renderGroupDetailsView(groupId, tab);
}

function showInviteModal(groupId, groupName) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay" onclick="closeModal(event)">
        <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 520px;">
          <div class="card-header">
            <div>
              <span class="card-title">Invite to ${escapeHtml(groupName)}</span>
              <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">Add friends or roommates to split expenses together</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="closeModal()" title="Close" style="padding: 6px 8px; line-height: 1;">${Icons.close(14)}</button>
          </div>

          <form id="invite-form" onsubmit="handleSendInvite(event, ${groupId})">
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Friend's Email Address *</label>
                <input type="email" id="invite-email" class="form-input" placeholder="alex@gmail.com" required autofocus>
                <div class="form-hint">
                  Enter the email address of the person you want to invite.
                </div>
              </div>

              <!-- Result Container (Shown after invite generation) -->
              <div id="invite-result-container" style="display: none; margin-top: 18px;">
                <div id="invite-result-banner" class="callout" style="margin-bottom: 16px;"></div>

                <div class="form-group">
                  <label class="form-label">Direct Invitation Link</label>
                  <div style="display: flex; gap: 8px;">
                    <input type="text" id="invite-link-input" class="form-input" readonly style="font-family: var(--font-code); font-size: 12px; background: var(--bg-muted);">
                    <button type="button" class="btn btn-secondary" id="btn-copy-link" onclick="copyInviteInput()" style="white-space: nowrap; gap: 6px;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      <span id="copy-btn-text">Copy</span>
                    </button>
                  </div>
                  <div class="form-hint">
                    Share this link directly via WhatsApp, Slack, iMessage, or email.
                  </div>
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px;">
                  <a id="invite-wa-link" href="#" target="_blank" class="share-pill-btn share-pill-whatsapp" style="padding: 7px 12px; font-size: 12px;">
                    Share via WhatsApp &rarr;
                  </a>
                  <a id="invite-mail-link" href="#" class="share-pill-btn" style="padding: 7px 12px; font-size: 12px;">
                    Send via Email App &rarr;
                  </a>
                  <a id="invite-test-link" href="#" target="_blank" class="share-pill-btn" style="padding: 7px 12px; font-size: 12px; color: var(--accent-primary);">
                    Open Tab &rarr;
                  </a>
                </div>
              </div>
            </div>

            <div class="card-footer" style="justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button type="submit" id="btn-submit-invite" class="btn btn-primary">
                Create &amp; Send Invite &rarr;
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
}

async function handleSendInvite(e, groupId) {
    e.preventDefault();
    const emailInput = document.getElementById('invite-email');
    const email = emailInput.value.trim();
    const btn = document.getElementById('btn-submit-invite');
    const resultContainer = document.getElementById('invite-result-container');
    const resultBanner = document.getElementById('invite-result-banner');
    const linkInput = document.getElementById('invite-link-input');
    const testLink = document.getElementById('invite-test-link');

    btn.disabled = true;
    btn.innerText = 'Creating Invitation...';

    try {
        const res = await API.post(`/groups/${groupId}/invite`, { email });
        
        // Show result box
        resultContainer.style.display = 'block';

        let inviteUrl = res.invitation.inviteUrl;
        const currentOrigin = window.location.origin;
        if (currentOrigin && !currentOrigin.includes('localhost') && !currentOrigin.includes('127.0.0.1')) {
            const token = res.invitation.token || (inviteUrl.split('token=')[1] || '').split('&')[0];
            if (token) {
                inviteUrl = `${currentOrigin}${window.location.pathname}#/invite/accept?token=${token}`;
            }
        }

        linkInput.value = inviteUrl;
        testLink.href = inviteUrl;

        const waLink = document.getElementById('invite-wa-link');
        const mailLink = document.getElementById('invite-mail-link');
        if (waLink) {
            const waText = encodeURIComponent(`Hey! Join our expense group on SplitSmart to track and settle bills: ${inviteUrl}`);
            waLink.href = `https://api.whatsapp.com/send?text=${waText}`;
        }
        if (mailLink) {
            const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Join our expense group on SplitSmart')}&body=${encodeURIComponent(`Hi,\n\nI created an expense group on SplitSmart so we can track and split bills.\n\nClick the link below to join:\n${inviteUrl}\n\nBest,\n${AppState.user?.name || 'Your friend'}`)}`;
            mailLink.href = mailtoUrl;
        }

        if (res.isRealDelivery) {
            resultBanner.className = 'callout callout-success';
            resultBanner.innerHTML = `
              <div class="callout-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-emerald);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div class="callout-body">
                <div class="callout-title">Invitation Email Sent!</div>
                <div>An official invitation has been delivered to <strong>${escapeHtml(email)}</strong>. You can also share the direct link below.</div>
              </div>
            `;
            showToast('Invitation email sent successfully!', 'success');
        } else if (res.isVirtualPreview && res.previewUrl) {
            resultBanner.className = 'callout callout-success';
            resultBanner.innerHTML = `
              <div class="callout-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-emerald);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div class="callout-body">
                <div class="callout-title">Invitation Created &amp; Virtual Email Dispatched!</div>
                <div style="margin-bottom: 8px;">The email was rendered and delivered to the test inbox. You can inspect the live HTML email below or copy the direct join link:</div>
                <a href="${res.previewUrl}" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  View Sent HTML Email &rarr;
                </a>
              </div>
            `;
            showToast('Invite email dispatched! Click to view preview.', 'success');
        } else {
            resultBanner.className = 'callout callout-info';
            resultBanner.innerHTML = `
              <div class="callout-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--info-primary);"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </div>
              <div class="callout-body">
                <div class="callout-title">Invitation Link Ready</div>
                <div>The invitation link is generated and active. Share this direct link with your friend to let them join immediately.</div>
                ${res.isSandboxRestricted ? `
                  <div style="font-size: 11px; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border-subtle); color: var(--text-muted);">
                    <strong>Tip for Live Outbound Emails:</strong> To send emails directly to external inboxes via Gmail, set your 16-character Gmail App Password in <code>SMTP_PASS</code> in <code>.env</code>.
                  </div>
                ` : ''}
              </div>
            `;
            showToast('Invite link generated! Copy and share it.', 'info');
        }

        // Change button to Done
        btn.innerText = 'Done';
        btn.onclick = () => {
            closeModal();
            renderGroupDetailsView(groupId, 'members');
        };
        btn.disabled = false;
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.innerText = 'Create & Send Invite →';
    }
}

function copyInviteInput() {
    const input = document.getElementById('invite-link-input');
    const copyBtnText = document.getElementById('copy-btn-text');
    if (input) {
        input.select();
        navigator.clipboard.writeText(input.value);
        if (copyBtnText) {
            copyBtnText.innerText = 'Copied!';
            setTimeout(() => {
                copyBtnText.innerText = 'Copy';
            }, 2000);
        }
        showToast('Invite link copied to clipboard!', 'success');
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Invite link copied to clipboard!', 'success');
}

async function handleCancelInvite(groupId, inviteId) {
    if (!confirm('Cancel this pending invitation?')) return;
    try {
        await API.delete(`/groups/${groupId}/invitations/${inviteId}`);
        showToast('Invitation cancelled.', 'info');
        renderGroupDetailsView(groupId, 'members');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleDeleteExpense(expenseId, groupId) {
    if (!confirm('Are you sure you want to delete this expense? Balances will be recalculated immediately.')) {
        return;
    }

    try {
        await API.delete(`/expenses/${expenseId}`);
        showToast('Expense deleted and balances updated.', 'info');
        renderGroupDetailsView(groupId, 'expenses');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function getCategoryIcon(cat) {
    return Icons.category(cat, 18);
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

function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'");
}

async function toggleGroupSimplifyDebts(groupId, simplify) {
    try {
        await API.patch(`/groups/${groupId}/settings`, { simplifyDebts: simplify });
        showToast(simplify ? 'Switched to Simplified Debts (fewest transfers)' : 'Switched to Direct 1-on-1 Debts', 'info');
        renderGroupDetailsView(groupId, 'balances');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function showGroupAllSettledBill(groupId) {
    try {
        const [groupData, balancesData] = await Promise.all([
            API.get(`/groups/${groupId}`),
            API.get(`/settlements/group/${groupId}/balances`).catch(() => ({ balances: [] }))
        ]);
        const group = groupData.group || {};
        const memberNames = (balancesData.balances || []).map(b => b.name);
        const totalSpent = groupData.stats?.totalSpent || 0;
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

window.showGroupAllSettledBill = showGroupAllSettledBill;
window.toggleGroupSimplifyDebts = toggleGroupSimplifyDebts;
window.renderGroupDetailsView = renderGroupDetailsView;
window.switchGroupTab = switchGroupTab;
window.showInviteModal = showInviteModal;
window.handleSendInvite = handleSendInvite;
window.copyInviteInput = copyInviteInput;
window.copyToClipboard = copyToClipboard;
window.handleCancelInvite = handleCancelInvite;
window.handleDeleteExpense = handleDeleteExpense;
