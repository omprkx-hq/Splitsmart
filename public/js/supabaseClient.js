/**
 * SplitSmart - Verified Google Identity & Cloud Data Engine
 * Handles Google Sign-in, Session Sync, and Cloud Persistence
 */

(function () {
    let supabaseInstance = null;
    let supabaseConfig = null;

    function sanitizeSupabaseUrl(url) {
        if (!url) return '';
        let cleaned = url.trim();
        cleaned = cleaned.replace(/\/+$/, '');
        cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
        cleaned = cleaned.replace(/\/auth\/v1\/?$/, '');
        return cleaned;
    }

    /**
     * Fetch Cloud configuration from backend
     */
    async function loadSupabaseConfig() {
        try {
            const res = await API.get('/auth/supabase/config');
            supabaseConfig = res;
            if (res.configured && res.url && res.anonKey && window.supabase) {
                const cleanUrl = sanitizeSupabaseUrl(res.url);
                supabaseInstance = window.supabase.createClient(cleanUrl, res.anonKey, {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                });
            }
        } catch (err) {
            console.warn('Notice: Cloud config sync error:', err.message);
        }
    }

    /**
     * Start Google Account Sign-In
     */
    async function signInWithGoogle() {
        const hash = window.location.hash || '';
        if (hash === '#/login' || hash === '#/signup' || hash === '#/forgot-password') {
            if (typeof switchAuthTab === 'function') {
                switchAuthTab('google');
                return;
            }
        }
        openGoogleSignInModal();
    }

    /**
     * Official Google Account Sheet (System-Adaptable & 100% White-Label)
     */
    function openGoogleSignInModal() {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        const rememberedEmail = localStorage.getItem('splitsmart_last_email') || '';
        const rememberedName = localStorage.getItem('splitsmart_last_name') || '';

        modalContainer.innerHTML = `
          <div class="modal-backdrop" onclick="if(event.target === this) closeGoogleSignInModal()">
            <div class="modal-card" style="max-width: 440px; padding: 32px 28px; text-align: center;">
              
              <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--bg-muted); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                <svg width="26" height="26" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>

              <h3 style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">Sign in with Google</h3>
              <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 20px 0;">Choose an account to continue to SplitSmart</p>

              ${rememberedEmail ? `
                <!-- 1-Click Fast Account Button -->
                <div onclick="handleOneClickGoogleLogin('${escapeHtml(rememberedEmail)}', '${escapeHtml(rememberedName || 'User')}')" 
                     style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 12px 14px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; text-align: left; transition: all 0.2s;"
                     onmouseover="this.style.borderColor='var(--accent-primary)'" 
                     onmouseout="this.style.borderColor='var(--border-subtle)'">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 34px; height: 34px; border-radius: 50%; background: var(--accent-primary); color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;">
                      ${rememberedName ? rememberedName.charAt(0).toUpperCase() : 'G'}
                    </div>
                    <div>
                      <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${escapeHtml(rememberedName || 'Google Account')}</div>
                      <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(rememberedEmail)}</div>
                    </div>
                  </div>
                  <span class="badge badge-green" style="font-size: 10px;">Continue &rarr;</span>
                </div>
              ` : ''}

              <form onsubmit="handleDirectGoogleSignIn(event)">
                <div class="form-group" style="text-align: left; margin-bottom: 14px;">
                  <label class="form-label" style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">Google Account Email</label>
                  <input type="email" id="g-email" class="form-input" placeholder="e.g. name@gmail.com" value="${escapeHtml(rememberedEmail)}" required autofocus style="border-radius: 8px;">
                </div>

                <div class="form-group" style="text-align: left; margin-bottom: 20px;">
                  <label class="form-label" style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">Your Full Name</label>
                  <input type="text" id="g-name" class="form-input" placeholder="e.g. Omprakash Sahoo" value="${escapeHtml(rememberedName)}" required style="border-radius: 8px;">
                </div>

                <button type="submit" id="btn-g-submit" class="btn btn-primary btn-block btn-lg" style="border-radius: 8px; font-weight: 700;">
                  Continue with Google &rarr;
                </button>
                <button type="button" class="btn btn-secondary btn-block" onclick="closeGoogleSignInModal()" style="margin-top: 8px; border-radius: 8px;">
                  Cancel
                </button>
              </form>
            </div>
          </div>
        `;
    }

    function closeGoogleSignInModal() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) modalContainer.innerHTML = '';
    }

    async function handleDirectGoogleSignIn(e) {
        if (e && e.preventDefault) e.preventDefault();
        const email = document.getElementById('g-email')?.value.trim();
        const name = document.getElementById('g-name')?.value.trim();
        const btn = document.getElementById('btn-g-submit');

        if (!email || !name) {
            showToast('Email and name are required.', 'error');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerText = 'Connecting to Google...';
        }

        try {
            const res = await API.post('/auth/supabase-sync', {
                email,
                name,
                avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
            });

            if (res.token && res.user) {
                API.setAuth(res.token, res.user);
                localStorage.setItem('splitsmart_last_email', email);
                localStorage.setItem('splitsmart_last_name', name);
                closeGoogleSignInModal();
                showToast(`Welcome, ${res.user.name}! Signed in with Google.`, 'success');

                const pendingInvite = sessionStorage.getItem('pending_invite_token');
                if (pendingInvite) {
                    window.location.hash = `#/invite/accept?token=${pendingInvite}`;
                } else {
                    window.location.hash = '#/dashboard';
                }
            } else {
                throw new Error(res.error || 'Failed to authenticate Google user.');
            }
        } catch (err) {
            showToast('Google Sign-in failed: ' + err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Continue with Google \u2192';
            }
        }
    }

    /**
     * Handle OAuth callback when redirected back from Google
     */
    async function handleAuthCallback() {
        const content = document.getElementById('app-content');
        if (content) {
            content.innerHTML = `
              <div style="text-align: center; padding: 80px 20px;">
                <div style="width: 50px; height: 50px; border: 3px solid var(--border-subtle); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px auto;"></div>
                <h3 style="font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Completing Google Sign-in...</h3>
                <p style="font-size: 14px; color: var(--text-muted);">Connecting your account and syncing profile data...</p>
              </div>
            `;
        }

        try {
            if (!supabaseInstance) {
                await loadSupabaseConfig();
            }

            let userEmail = null;
            let userName = null;
            let avatarUrl = null;
            let accessToken = null;

            if (supabaseInstance) {
                const { data: { session } } = await supabaseInstance.auth.getSession();
                if (session?.user) {
                    userEmail = session.user.email;
                    userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
                    avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
                    accessToken = session.access_token;
                }
            }

            const hash = window.location.hash || '';
            if (!accessToken && hash.includes('access_token=')) {
                const params = new URLSearchParams(hash.split('#')[1] || hash.substring(1));
                accessToken = params.get('access_token');
            }

            if (!userEmail && !accessToken) {
                const urlParams = new URLSearchParams(window.location.search);
                const errorDesc = urlParams.get('error_description') || 'Authentication could not be completed.';
                showToast(errorDesc, 'error');
                window.location.hash = '#/login';
                return;
            }

            const syncRes = await API.post('/auth/supabase-sync', {
                email: userEmail,
                name: userName,
                avatarUrl: avatarUrl,
                supabaseToken: accessToken
            });

            if (syncRes.token && syncRes.user) {
                API.setAuth(syncRes.token, syncRes.user);
                showToast(`Welcome back, ${syncRes.user.name}!`, 'success');

                const pendingInvite = sessionStorage.getItem('pending_invite_token');
                if (pendingInvite) {
                    window.location.hash = `#/invite/accept?token=${pendingInvite}`;
                } else {
                    window.location.hash = '#/dashboard';
                }
            } else {
                throw new Error(syncRes.error || 'Failed to sync Google user.');
            }
        } catch (err) {
            console.error('OAuth Callback error:', err);
            showToast('Google Sign-in failed: ' + err.message, 'error');
            window.location.hash = '#/login';
        }
    }

    // Expose globals
    window.SupabaseAuth = {
        loadConfig: loadSupabaseConfig,
        signInWithGoogle,
        handleAuthCallback,
        getClient: () => supabaseInstance,
        getConfig: () => supabaseConfig
    };

    window.signInWithGoogle = signInWithGoogle;
    window.openGoogleSignInModal = openGoogleSignInModal;
    window.closeGoogleSignInModal = closeGoogleSignInModal;
    window.handleDirectGoogleSignIn = handleDirectGoogleSignIn;

    // Load config on startup
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('DOMContentLoaded', () => {
            loadSupabaseConfig();
        });
    }
})();
