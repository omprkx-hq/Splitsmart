/**
 * SplitSmart AI - Modern Financial Dashboard & Command Hub
 * Awwwards-inspired layout: Dynamic greeting, visual cashflow command card,
 * interactive group cards, live pending invitations hub with WhatsApp/Email client sharing.
 */

async function renderDashboardView() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="text-align: center; padding: 60px 0; color: var(--text-muted);">
        <div style="display: inline-block; width: 24px; height: 24px; border: 2px solid var(--accent-primary); border-top-color: transparent; border-radius: 50%; animation: spin 0.7s linear infinite; margin-bottom: 12px;"></div>
        <div>Loading your financial command hub...</div>
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;

    try {
        const [dashData, groupsData, invitesData] = await Promise.all([
            API.get('/analytics/dashboard'),
            API.get('/groups').catch(() => ({ groups: [] })),
            API.get('/groups/invitations/all').catch(() => ({ invitations: [] }))
        ]);

        const user = AppState.user;
        const cur = user?.default_currency || 'USD';
        const sum = dashData.summary || {};
        const recentExpenses = dashData.recentExpenses || [];
        const recentActivity = dashData.recentActivity || [];
        const groups = groupsData.groups || [];
        const pendingInvites = invitesData.invitations || [];

        const netPosition = Number(sum.amountReceivableByUser || 0) - Number(sum.amountOwedByUser || 0);

        // Time-aware greeting & name formatting
        const rawName = user?.name || user?.email?.split('@')[0] || 'Friend';
        const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'Good morning' : (hour < 18 ? 'Good afternoon' : 'Good evening');
        const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

        content.innerHTML = `
          <!-- Dynamic Editorial Header -->
          <div class="page-header" style="margin-bottom: 24px; align-items: center;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #10B981; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); padding: 2px 8px; border-radius: 9999px;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span> Cloud Sync Active
                </span>
                <span style="font-size: 12px; color: var(--text-muted);">&bull;</span>
                <span style="font-size: 12px; color: var(--text-muted);">${todayStr}</span>
              </div>
              <h1 class="page-title forge-text-reveal">
                <span class="kinetic-line">
                  <span class="kinetic-word">${timeGreeting},</span>
                  <span class="kinetic-word user-greeting-name">${escapeHtml(cleanName)}!</span>
                </span>
              </h1>
              <p class="page-subtitle">Your real-time consolidated position across all group ledgers.</p>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" onclick="showQuickInviteModal()">
                ${Icons.mail(14)} Invite Friend
              </button>
              <button class="btn btn-secondary btn-sm" onclick="showCreateGroupModal()">
                ${Icons.plus(14)} New Group
              </button>
              <a href="#/add-expense" class="btn btn-primary btn-sm">
                ${Icons.plus(14)} Add Expense
              </a>
            </div>
          </div>

          <!-- Hero Command Hub (Net Position + Quick Action Tiles) -->
          <div class="dashboard-hero-grid">
            <!-- Left: High-Precision Balance Visualizer -->
            <div class="command-balance-card">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div>
                    <div class="stat-label" style="margin-bottom: 4px;">Net Consolidated Balance</div>
                    <div class="stat-value ${netPosition > 0.01 ? 'positive' : (netPosition < -0.01 ? 'negative' : '')}" style="font-size: 34px;">
                      ${netPosition > 0.01 ? `+${cur} ${netPosition.toFixed(2)}` : (netPosition < -0.01 ? `-${cur} ${Math.abs(netPosition).toFixed(2)}` : `${cur} 0.00`)}
                    </div>
                  </div>
                  <span class="badge ${netPosition > 0.01 ? 'badge-green' : (netPosition < -0.01 ? 'badge-red' : 'badge-slate')}" style="font-size: 11px;">
                    ${netPosition > 0.01 ? 'Overall Creditor' : (netPosition < -0.01 ? 'Payment Due' : 'All Settled')}
                  </span>
                </div>

                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">
                  ${netPosition > 0.01 
                    ? `You are owed a total of <strong>${cur} ${netPosition.toFixed(2)}</strong> across active groups.` 
                    : (netPosition < -0.01 
                      ? `You currently owe a total of <strong>${cur} ${Math.abs(netPosition).toFixed(2)}</strong> across active groups.` 
                      : 'All expense shares and settlements are fully squared away.')}
                </div>
              </div>

              <!-- Breakdown Pill Row -->
              <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="width: 8px; height: 8px; border-radius: 9999px; background: var(--accent-emerald);"></span>
                  <div>
                    <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">You Are Owed</div>
                    <div style="font-size: 15px; font-weight: 800; color: var(--accent-emerald);" class="num">
                      +${cur} ${Number(sum.amountReceivableByUser || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div style="height: 24px; width: 1px; background: var(--border-subtle);"></div>

                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="width: 8px; height: 8px; border-radius: 9999px; background: var(--danger-primary);"></span>
                  <div>
                    <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">You Owe</div>
                    <div style="font-size: 15px; font-weight: 800; color: ${sum.amountOwedByUser > 0.01 ? 'var(--danger-primary)' : 'var(--text-primary)'};" class="num">
                      ${sum.amountOwedByUser > 0.01 ? `-${cur} ${Number(sum.amountOwedByUser).toFixed(2)}` : `${cur} 0.00`}
                    </div>
                  </div>
                </div>

                <a href="#/settlements" class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 4px 10px;">
                  Settle Up &rarr;
                </a>
              </div>
            </div>

            <!-- Right: 4 Sleek Command Action Tiles -->
            <div class="action-tiles-grid">
              <a href="#/add-expense" class="action-tile">
                <div class="action-tile-icon" style="color: var(--accent-emerald);">
                  ${Icons.plus(18)}
                </div>
                <div>
                  <div class="action-tile-title">+ Add Expense</div>
                  <div class="action-tile-subtitle">Split a new bill, receipt, or rent</div>
                </div>
              </a>

              <a href="#/settlements" class="action-tile">
                <div class="action-tile-icon" style="color: var(--warning-primary);">
                  ${Icons.scale(18)}
                </div>
                <div>
                  <div class="action-tile-title">Settle Debts</div>
                  <div class="action-tile-subtitle">PayPal sandbox or cash resolution</div>
                </div>
              </a>

              <button type="button" class="action-tile" onclick="showQuickInviteModal()" style="text-align: left; width: 100%;">
                <div class="action-tile-icon" style="color: var(--info-primary);">
                  ${Icons.mail(18)}
                </div>
                <div>
                  <div class="action-tile-title">Invite Friend</div>
                  <div class="action-tile-subtitle">Instant WhatsApp, link &amp; mail share</div>
                </div>
              </button>

              <a href="#/analytics" class="action-tile">
                <div class="action-tile-icon" style="color: var(--accent-primary);">
                  ${Icons.chart(18)}
                </div>
                <div>
                  <div class="action-tile-title">Spending Analytics</div>
                  <div class="action-tile-subtitle">Category breakdown &amp; cash trends</div>
                </div>
              </a>
            </div>
          </div>

          <!-- Real Active Invitations Hub (Highlighted Feature) -->
          ${pendingInvites.length > 0 ? `
            <div class="card" style="margin-bottom: 28px; border-color: var(--accent-border-hover); box-shadow: var(--shadow-sm);">
              <div class="card-header" style="background: var(--bg-surface-elevated);">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="color: var(--accent-primary);">${Icons.mail(16)}</span>
                  <span class="card-title">Pending Invitations &amp; Instant Share Links (${pendingInvites.length})</span>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="showQuickInviteModal()">+ Invite Another</button>
              </div>
              <div class="card-body" style="padding: 0;">
                <div style="display: flex; flex-direction: column;">
                  ${pendingInvites.map(inv => {
                    const waText = encodeURIComponent(`Hey! Join our expense group "${inv.groupName}" on SplitSmart to track and settle shared bills: ${inv.inviteUrl}`);
                    const mailtoUrl = `mailto:${encodeURIComponent(inv.email)}?subject=${encodeURIComponent(`Join our group "${inv.groupName}" on SplitSmart`)}&body=${encodeURIComponent(`Hi,\n\nI created the group "${inv.groupName}" on SplitSmart so we can easily track and split our expenses.\n\nClick the link below to join:\n${inv.inviteUrl}\n\nBest,\n${user?.name || 'Your friend'}`)}`;
                    return `
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 12px;">
                        <div>
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <strong style="color: var(--text-primary); font-size: 14px;">${escapeHtml(inv.email)}</strong>
                            <span class="badge badge-slate" style="font-size: 10px;">${escapeHtml(inv.groupName)}</span>
                          </div>
                          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                            Link valid for 7 days &bull; Share directly with your friend
                          </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                          <!-- 1-Click Copy Link -->
                          <button type="button" class="share-pill-btn" onclick="copyInviteLinkText('${inv.inviteUrl}', this)">
                            ${Icons.copy(12)} Copy Link
                          </button>

                          <!-- 1-Click WhatsApp Share -->
                          <a href="https://api.whatsapp.com/send?text=${waText}" target="_blank" class="share-pill-btn share-pill-whatsapp" title="Share via WhatsApp">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            WhatsApp
                          </a>

                          <!-- 1-Click Email App Share -->
                          <a href="${mailtoUrl}" class="share-pill-btn" title="Open in your Gmail / Email App">
                            ${Icons.send(12)} Send via Mail App
                          </a>

                          <!-- 1-Click Test Join in New Tab -->
                          <a href="${inv.inviteUrl}" target="_blank" class="share-pill-btn" style="color: var(--accent-primary);" title="Open invite in new tab to test">
                            ${Icons.external(12)} Open Tab
                          </a>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Groups Showcase Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h2 style="font-size: 20px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.4px;">Your Active Expense Groups</h2>
              <p style="font-size: 13px; color: var(--text-muted);">Collaborative ledgers with roommates, friends, and trips.</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="showCreateGroupModal()">+ Create Group</button>
              <a href="#/groups" class="btn btn-secondary btn-sm">View All (${groups.length})</a>
            </div>
          </div>

          <!-- Groups Modern Grid -->
          <div class="groups-modern-grid">
            ${groups.length === 0 ? `
              <div class="card" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; border: 1px solid var(--border-subtle); background: var(--bg-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);">
                <div style="width: 52px; height: 52px; border-radius: 14px; background: var(--bg-muted); display: inline-flex; align-items: center; justify-content: center; color: var(--accent-primary); margin-bottom: 14px;">
                  ${Icons.users(24)}
                </div>
                <h3 style="font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">No Groups Joined Yet</h3>
                <p style="font-size: 13px; color: var(--text-muted); max-width: 440px; margin: 0 auto 18px auto; line-height: 1.5;">
                  Create your first group for an upcoming trip, apartment rent, or dinner party to start tracking expenses together.
                </p>
                <button class="btn btn-primary" onclick="showCreateGroupModal()">
                  ${Icons.plus(14)} Create Your First Group
                </button>
              </div>
            ` : groups.map(g => `
              <div class="group-card-modern">
                <div>
                  <div class="group-card-header">
                    <div>
                      <div class="group-card-title">${escapeHtml(g.name)}</div>
                      <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                        ${escapeHtml(g.purpose || 'General')}
                      </div>
                    </div>
                    <span class="badge badge-slate" style="font-family: var(--font-code); font-size: 11px;">${g.currency}</span>
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; margin: 14px 0 6px 0;">
                    <div style="font-size: 12px; color: var(--text-muted);">
                      Total Group Spend
                    </div>
                    <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);" class="num">
                      ${g.currency} ${Number(g.total_expenses || 0).toFixed(2)}
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted);">
                    ${Icons.users(13)}
                    <span>${g.member_count} active ${g.member_count === 1 ? 'member' : 'members'}</span>
                  </div>
                </div>

                <div class="group-card-actions">
                  <a href="#/groups/${g.id}" class="btn btn-secondary btn-sm" style="flex: 1; text-align: center;">
                    Open Ledger
                  </a>
                  <button class="btn btn-secondary btn-sm" onclick="showQuickInviteModal(${g.id})" title="Invite friends to this group">
                    ${Icons.mail(13)} Invite
                  </button>
                  <a href="#/add-expense" class="btn btn-primary btn-sm" title="Add expense to this group">
                    ${Icons.plus(13)}
                  </a>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Bottom Grid: Recent Expenses Ledger & Activity Stream -->
          <div class="dashboard-bottom-grid">
            <!-- Left: Recent Expenses Ledger -->
            <div>
              <div class="card" style="box-shadow: var(--shadow-sm);">
                <div class="card-header">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--accent-primary);">${Icons.receipt(16)}</span>
                    <span class="card-title">Recent Shared Expenses</span>
                  </div>
                  <a href="#/add-expense" class="btn btn-primary btn-sm">+ Add Expense</a>
                </div>
                <div class="card-body" style="padding: 0;">
                  ${recentExpenses.length === 0 ? `
                    <div style="padding: 36px; text-align: center; color: var(--text-muted); font-size: 13px;">
                      No expenses logged yet. Click <strong>+ Add Expense</strong> above to add a shared bill.
                    </div>
                  ` : `
                    <div style="display: flex; flex-direction: column;">
                      ${recentExpenses.slice(0, 6).map(e => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border-subtle); transition: background 0.15s ease;">
                          <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 36px; height: 36px; border-radius: var(--radius-md); background: var(--bg-muted); display: flex; align-items: center; justify-content: center; color: var(--accent-primary);">
                              ${Icons.category(e.category, 16)}
                            </div>
                            <div>
                              <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">
                                ${escapeHtml(e.description)}
                              </div>
                              <div style="font-size: 12px; color: var(--text-muted);">
                                ${escapeHtml(e.group_name)} &bull; Paid by <strong style="color: var(--text-secondary);">${escapeHtml(e.payer_name)}</strong>
                              </div>
                            </div>
                          </div>
                          
                          <div style="text-align: right;">
                            <div style="font-size: 15px; font-weight: 800; color: var(--text-primary);" class="num">
                              ${e.currency} ${Number(e.amount).toFixed(2)}
                            </div>
                            <div style="font-size: 11px; color: var(--text-muted);">
                              ${new Date(e.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  `}
                </div>
              </div>
            </div>

            <!-- Right: Activity Timeline -->
            <div>
              <div class="card" style="box-shadow: var(--shadow-sm);">
                <div class="card-header">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--info-primary);">${Icons.history(16)}</span>
                    <span class="card-title">Live Ledger Activity</span>
                  </div>
                  <span class="badge badge-slate">Real-Time</span>
                </div>
                <div class="card-body" style="padding: 16px 20px;">
                  ${recentActivity.length === 0 ? `
                    <div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 24px 0;">
                      All recent actions and settlements will appear in this audit feed.
                    </div>
                  ` : `
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                      ${recentActivity.slice(0, 7).map(a => `
                        <div style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px; font-size: 13px;">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                            <strong style="color: var(--text-primary); font-size: 13px;">${formatActionName(a.action)}</strong>
                            <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-code);">
                              ${new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style="color: var(--text-muted); font-size: 12px;">
                            ${escapeHtml(a.actor_name || 'System')} ${a.group_name ? `in <strong>${escapeHtml(a.group_name)}</strong>` : ''}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  `}
                </div>
              </div>
            </div>
          </div>
        `;
    } catch (err) {
        content.innerHTML = `
          <div class="card" style="padding: 36px; text-align: center;">
            <h3 style="color: var(--danger-primary); margin-bottom: 8px;">Unable to load dashboard</h3>
            <p style="color: var(--text-muted); margin-bottom: 16px;">${err.message}</p>
            <button class="btn btn-secondary" onclick="renderDashboardView()">Retry</button>
          </div>
        `;
    }
}

// Quick Copy Helper
function copyInviteLinkText(text, btnEl) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            const original = btnEl.innerHTML;
            btnEl.innerHTML = `${Icons.check(12)} Copied!`;
            showToast('Direct invitation link copied to clipboard!', 'success', 2000);
            setTimeout(() => { btnEl.innerHTML = original; }, 2000);
        });
    } else {
        showToast('Link: ' + text, 'info', 5000);
    }
}

// Quick Invite Modal (Available from anywhere on the dashboard)
async function showQuickInviteModal(preselectedGroupId = null) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    // Fetch groups
    let groups = [];
    try {
        const res = await API.get('/groups');
        groups = res.groups || [];
    } catch (e) {
        showToast('Please create a group first.', 'error');
        return;
    }

    if (groups.length === 0) {
        showToast('You must create at least one group before sending invites.', 'info');
        showCreateGroupModal();
        return;
    }

    const defaultGroup = preselectedGroupId ? groups.find(g => g.id === preselectedGroupId) : groups[0];

    modalContainer.innerHTML = `
      <div class="modal-overlay" onclick="closeModal(event)">
        <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 520px;">
          <div class="card-header">
            <div>
              <span class="card-title">Invite Friend to Split Expenses</span>
              <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">Share via WhatsApp, email, or direct join link</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="closeModal()" title="Close" style="padding: 6px 8px; line-height: 1;">${Icons.close(14)}</button>
          </div>

          <form id="quick-invite-form" onsubmit="handleSendQuickInvite(event)">
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Select Expense Group *</label>
                <select id="quick-invite-group" class="form-select">
                  ${groups.map(g => `
                    <option value="${g.id}" ${defaultGroup && defaultGroup.id === g.id ? 'selected' : ''}>
                      ${escapeHtml(g.name)} (${g.currency})
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Friend's Email Address *</label>
                <input type="email" id="quick-invite-email" class="form-input" placeholder="alex@gmail.com" required autofocus>
                <div class="form-hint">
                  Enter the email address of the person you want to invite.
                </div>
              </div>

              <!-- Result Area (Populates after generation) -->
              <div id="quick-invite-result" style="display: none; margin-top: 18px;">
                <div id="quick-invite-callout" class="callout callout-info" style="margin-bottom: 16px;"></div>

                <div class="form-group">
                  <label class="form-label">Direct Shareable Join Link</label>
                  <div style="display: flex; gap: 8px;">
                    <input type="text" id="quick-invite-link-input" class="form-input" readonly style="font-family: var(--font-code); font-size: 12px; background: var(--bg-muted);">
                    <button type="button" class="btn btn-secondary" onclick="copyQuickInviteLink()" style="white-space: nowrap; gap: 6px;">
                      ${Icons.copy(14)} Copy
                    </button>
                  </div>
                </div>

                <!-- Instant 1-Click Sharing Row -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px;">
                  <a id="quick-invite-wa-btn" href="#" target="_blank" class="share-pill-btn share-pill-whatsapp" style="padding: 8px 14px; font-size: 12px;">
                    WhatsApp Friend &rarr;
                  </a>
                  <a id="quick-invite-mail-btn" href="#" class="share-pill-btn" style="padding: 8px 14px; font-size: 12px;">
                    Send via Email App &rarr;
                  </a>
                  <a id="quick-invite-open-btn" href="#" target="_blank" class="share-pill-btn" style="padding: 8px 14px; font-size: 12px; color: var(--accent-primary);">
                    Test Open in New Tab &rarr;
                  </a>
                </div>
              </div>
            </div>

            <div class="card-footer" style="justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
              <button type="submit" id="btn-quick-invite-submit" class="btn btn-primary">
                Generate &amp; Send Invite &rarr;
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
}

async function handleSendQuickInvite(e) {
    e.preventDefault();
    const groupId = document.getElementById('quick-invite-group').value;
    const email = document.getElementById('quick-invite-email').value.trim();
    const btn = document.getElementById('btn-quick-invite-submit');
    const resultArea = document.getElementById('quick-invite-result');
    const callout = document.getElementById('quick-invite-callout');
    const linkInput = document.getElementById('quick-invite-link-input');
    const waBtn = document.getElementById('quick-invite-wa-btn');
    const mailBtn = document.getElementById('quick-invite-mail-btn');
    const openBtn = document.getElementById('quick-invite-open-btn');

    btn.disabled = true;
    btn.innerText = 'Creating Invitation...';

    try {
        const res = await API.post(`/groups/${groupId}/invite`, { email });
        resultArea.style.display = 'block';

        let inviteUrl = res.invitation.inviteUrl;
        const currentOrigin = window.location.origin;
        if (currentOrigin && !currentOrigin.includes('localhost') && !currentOrigin.includes('127.0.0.1')) {
            const token = res.invitation.token || (inviteUrl.split('token=')[1] || '').split('&')[0];
            if (token) {
                inviteUrl = `${currentOrigin}${window.location.pathname}#/invite/accept?token=${token}`;
            }
        }

        linkInput.value = inviteUrl;

        // Populate sharing links
        const waText = encodeURIComponent(`Hey! Join our expense group on SplitSmart to track and settle bills: ${inviteUrl}`);
        waBtn.href = `https://api.whatsapp.com/send?text=${waText}`;

        const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Join our expense group on SplitSmart')}&body=${encodeURIComponent(`Hi,\n\nI created an expense group on SplitSmart so we can easily track and split our bills.\n\nClick the link below to join:\n${inviteUrl}\n\nBest,\n${AppState.user?.name || 'Your friend'}`)}`;
        mailBtn.href = mailtoUrl;

        openBtn.href = inviteUrl;

        callout.innerHTML = `
          <div class="callout-title" style="color: var(--accent-emerald); font-weight: 700; margin-bottom: 4px;">
            ${Icons.checkCircle(14)} Invitation Ready!
          </div>
          <div style="font-size: 13px; color: var(--text-secondary);">
            The invitation has been registered. You can immediately copy the direct join link or send it to your friend via WhatsApp or email:
          </div>
        `;

        showToast('Invitation generated successfully!', 'success');
        btn.innerText = 'Invite Another Friend';
        btn.disabled = false;

        // Auto refresh dashboard in background if active
        if (window.location.hash === '#/dashboard') {
            setTimeout(renderDashboardView, 1200);
        }
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.innerText = 'Generate & Send Invite →';
    }
}

function copyQuickInviteLink() {
    const input = document.getElementById('quick-invite-link-input');
    if (!input) return;
    copyInviteLinkText(input.value, event.target);
}

function formatActionName(action) {
    switch (action) {
        case 'EXPENSE_CREATED': return `${Icons.plus(13)} Added expense`;
        case 'EXPENSE_DELETED': return `${Icons.trash(13)} Deleted expense`;
        case 'SETTLEMENT_RECORDED': return `${Icons.check(13)} Recorded settlement`;
        case 'SETTLEMENT_PAID': return `${Icons.creditCard(13)} Settle payment completed`;
        case 'GROUP_CREATED': return `${Icons.folder(13)} Created group`;
        case 'GROUP_INVITE_SENT': return `${Icons.mail(13)} Sent group invite`;
        case 'GROUP_INVITE_ACCEPTED': return `${Icons.users(13)} Joined group`;
        case 'USER_SIGNUP': return `${Icons.user(13)} Joined SplitSmart`;
        default: return action.replace(/_/g, ' ').toLowerCase();
    }
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

window.renderDashboardView = renderDashboardView;
window.showQuickInviteModal = showQuickInviteModal;
window.handleSendQuickInvite = handleSendQuickInvite;
window.copyInviteLinkText = copyInviteLinkText;
window.copyQuickInviteLink = copyQuickInviteLink;
