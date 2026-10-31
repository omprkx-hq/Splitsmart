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
        if (typeof showToast === 'function') {
            showToast('Please sign in with your email and password below.', 'info', 3000);
        }
        if (typeof switchAuthTab === 'function') {
            switchAuthTab('login');
        } else {
            window.location.hash = '#/login';
        }
    }

    function openGoogleSignInModal() {
        signInWithGoogle();
    }

    function closeGoogleSignInModal() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) modalContainer.innerHTML = '';
    }

    async function handleDirectGoogleSignIn(e) {
        if (e && e.preventDefault) e.preventDefault();
        signInWithGoogle();
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
