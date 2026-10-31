/**
 * View 15: Group Invitation Acceptance Landing Page
 * Handles public invitation inspection, owner safety protection, and seamless onboarding
 */

async function renderInviteAcceptView(token) {
    const content = document.getElementById('app-content');
    if (!content) return;

    if (!token) {
        showToast('Invitation token missing.', 'error');
        window.location.hash = '#/';
        return;
    }

    content.innerHTML = `
      <div style="text-align: center; padding: 60px 0; color: var(--text-muted);">
        Verifying secure invitation token...
      </div>
    `;

    try {
        // Fetch public invitation preview (no auth required)
        const preview = await API.get(`/groups/invitations/preview/${token}`);

        if (!preview.valid) {
            content.innerHTML = `
              <div class="card" style="max-width: 500px; margin: 40px auto; text-align: center; padding: 40px 28px;">
                <div style="width: 54px; height: 54px; border-radius: 50%; background: rgba(240, 68, 0, 0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: var(--accent-orange);">
                  ${Icons.x(26)}
                </div>
                <h3 style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">Invitation Expired or Invalid</h3>
                <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 24px;">
                  This invitation link has either already been used, expired, or was revoked. Please ask the group administrator for a fresh invite.
                </p>
                <a href="#/dashboard" class="btn btn-secondary">Go to Dashboard</a>
              </div>
            `;
            return;
        }

        // Store pending invite token in sessionStorage so post-auth redirect triggers
        sessionStorage.setItem('pending_invite_token', token);

        const currentUserId = AppState.user?.id;
        const isOwner = currentUserId && (currentUserId === preview.ownerId);

        // CASE 1: Current user is the GROUP OWNER
        if (isOwner) {
            content.innerHTML = `
              <div class="card" style="max-width: 520px; margin: 40px auto; text-align: center; padding: 40px 32px; box-shadow: var(--shadow-lg);">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: #EFF6FF; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px auto; color: #0070BA;">
                  ${Icons.shield(30)}
                </div>
                <span class="badge badge-blue" style="margin-bottom: 12px;">Group Owner</span>
                <h2 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
                  You are the Owner of this Group
                </h2>
                <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 24px;">
                  You created <strong>${escapeHtml(preview.groupName)}</strong>. Your role is strictly preserved as <strong>Owner</strong>.
                </p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <a href="#/groups/${preview.groupId}" class="btn btn-primary btn-block btn-lg">
                    Open ${escapeHtml(preview.groupName)} Group &rarr;
                  </a>
                  <a href="#/dashboard" class="btn btn-secondary btn-block">
                    Back to Main Dashboard
                  </a>
                </div>
              </div>
            `;
            return;
        }

        // CASE 2: Current user is logged in as another user (the invited friend)
        if (AppState.user) {
            content.innerHTML = `
              <div class="card" style="max-width: 520px; margin: 40px auto; text-align: center; padding: 40px 32px; box-shadow: var(--shadow-lg);">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: #EFF6FF; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px auto; color: #0070BA;">
                  ${Icons.users(30)}
                </div>
                <span class="badge badge-amber" style="margin-bottom: 12px;">Group Invitation</span>
                <h2 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
                  Join ${escapeHtml(preview.groupName)}
                </h2>
                <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 20px;">
                  <strong>${escapeHtml(preview.inviterName)}</strong> invited you to track and split expenses together in <strong>${escapeHtml(preview.groupName)}</strong>.
                </p>

                <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 24px; text-align: left;">
                  <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 4px;">Joining as:</div>
                  <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">${escapeHtml(AppState.user.name)}</div>
                  <div style="font-size: 13px; color: #0284C7;">${escapeHtml(AppState.user.email)}</div>
                </div>

                <button class="btn btn-primary btn-block btn-lg" id="btn-accept-invite" onclick="handleAcceptInviteDirect('${token}')">
                  Accept Invitation &amp; Join Group &rarr;
                </button>
              </div>
            `;
            return;
        }

        // CASE 3: User is NOT logged in yet
        content.innerHTML = `
          <div class="card" style="max-width: 520px; margin: 40px auto; padding: 36px 30px; box-shadow: var(--shadow-lg);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 58px; height: 58px; border-radius: 50%; background: #EFF6FF; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: #0070BA;">
                ${Icons.users(28)}
              </div>
              <span class="badge badge-blue" style="margin-bottom: 10px;">Friends &amp; Family Invite</span>
              <h2 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
                You're Invited to Join ${escapeHtml(preview.groupName)}
              </h2>
              <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5;">
                <strong>${escapeHtml(preview.inviterName)}</strong> invited you to split and track shared expenses easily.
              </p>
            </div>

            <!-- Invitation Target Banner -->
            <div style="background: #F8FAFC; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 20px;">
              <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 2px;">Invited Email:</div>
              <div style="font-size: 14px; font-weight: 700; color: #0284C7;">
                ${escapeHtml(preview.inviteeEmail)}
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <button class="btn btn-primary btn-lg btn-block" onclick="startInviteSignup('${escapeJs(preview.inviteeEmail)}')">
                Create Account to Join &rarr;
              </button>
              <button class="btn btn-secondary btn-block" onclick="startInviteLogin('${escapeJs(preview.inviteeEmail)}')">
                Already have an account? Sign In
              </button>
            </div>
          </div>
        `;
    } catch (err) {
        content.innerHTML = `
          <div class="card" style="max-width: 500px; margin: 40px auto; text-align: center; padding: 40px 28px;">
            <p style="color: var(--danger-primary); margin-bottom: 16px;">${err.message}</p>
            <a href="#/" class="btn btn-secondary">Go to Home</a>
          </div>
        `;
    }
}

async function handleAcceptInviteDirect(token) {
    const btn = document.getElementById('btn-accept-invite');
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Joining Group...';
    }

    try {
        const res = await API.post('/groups/invitations/accept', { token });
        sessionStorage.removeItem('pending_invite_token');
        showToast(res.message || 'You joined the group successfully!', 'success');
        window.location.hash = `#/groups/${res.groupId}`;
    } catch (err) {
        showToast(err.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Accept Invitation & Join Group →';
        }
    }
}

function startInviteSignup(email) {
    if (typeof authState !== 'undefined') {
        authState.pendingEmail = email || '';
    }
    window.location.hash = '#/signup';
}

function startInviteLogin(email) {
    if (typeof authState !== 'undefined') {
        authState.pendingEmail = email || '';
    }
    window.location.hash = '#/login';
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

window.renderInviteAcceptView = renderInviteAcceptView;
window.handleAcceptInviteDirect = handleAcceptInviteDirect;
window.startInviteSignup = startInviteSignup;
window.startInviteLogin = startInviteLogin;

