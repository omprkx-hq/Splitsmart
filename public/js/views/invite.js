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
              <!-- 1-Click Google Sign-in to Join -->
              <button type="button" class="btn btn-block btn-lg" onclick="signInWithGoogle()" style="display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 600; background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); box-shadow: var(--shadow-xs); border-radius: 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Join in 1-Click with Google
              </button>

              <div style="display: flex; align-items: center; margin: 6px 0; color: var(--text-muted); font-size: 11px; font-weight: 700; text-transform: uppercase;">
                <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
                <span style="padding: 0 10px;">or</span>
                <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
              </div>

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

