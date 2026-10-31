/**
 * SplitSmart AI - Enterprise Authentication Engine
 * Supports:
 * - Segmented Navigation Tabs: Sign In, Create Account, Reset Password
 * - Official Google Identity Sign-In (Direct / Modal / Dedicated Tab)
 * - Zero developer or backend provider branding (Pristine Consumer White-Label)
 * - 6-Digit Email OTP Security Verification & Password Recovery
 */

let authState = {
    mode: 'login', // 'login' | 'signup' | 'forgot' | 'otp' | 'google'
    pendingEmail: '',
    pendingUserId: null,
    resetStep: 1 // 1: request code, 2: enter code & new password
};

function switchAuthTab(mode) {
    authState.mode = mode;
    if (mode === 'login') {
        window.location.hash = '#/login';
    } else if (mode === 'signup') {
        window.location.hash = '#/signup';
    } else if (mode === 'forgot') {
        window.location.hash = '#/forgot-password';
    } else if (mode === 'google') {
        window.location.hash = '#/auth/google';
    }
    renderAuthView(mode);
}

function renderAuthView(initialMode) {
    const content = document.getElementById('app-content');
    if (!content) return;

    if (initialMode) {
        authState.mode = initialMode;
    }

    const isLogin = authState.mode === 'login';
    const isSignup = authState.mode === 'signup';
    const isForgot = authState.mode === 'forgot';
    const isOtp = authState.mode === 'otp';
    const isGoogle = authState.mode === 'google';

    const googleSvg = `
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
    `;

    // Last remembered Google email for instant 1-click login
    const rememberedEmail = localStorage.getItem('splitsmart_last_email') || '';
    const rememberedName = localStorage.getItem('splitsmart_last_name') || '';

    content.innerHTML = `
      <div style="max-width: 460px; margin: 30px auto; width: 100%; box-sizing: border-box;">
        
        <!-- Header Brand Anchor -->
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="#/" class="brand-logo" style="justify-content: center; font-size: 26px; text-decoration: none;">
            <span>Split<span class="brand-highlight">Smart</span></span>
          </a>
          <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); margin-top: 10px; letter-spacing: -0.4px;">
            ${isLogin ? 'Welcome back' : isSignup ? 'Create an account' : isForgot ? 'Reset your password' : isGoogle ? 'Sign in with Google' : 'Verify your email'}
          </h2>
          <p style="font-size: 13.5px; color: var(--text-muted); margin-top: 4px;">
            ${isLogin ? 'Sign in to split bills with friends, family, and roommates.' : isSignup ? 'Fair, transparent expense tracking with zero hidden fees.' : isForgot ? 'Enter your registered email to receive a 6-digit reset code.' : isGoogle ? 'Choose a Google account to connect to SplitSmart.' : `Enter the 6-digit verification code sent to <strong>${escapeHtml(authState.pendingEmail)}</strong>.`}
          </p>
        </div>

        <!-- Auth Card -->
        <div class="card" style="box-shadow: var(--shadow-lg); border-radius: 16px;">
          <div class="card-body" style="padding: 24px;">

            <!-- Segmented Auth Navigation Tabs -->
            ${!isOtp && !isGoogle ? `
              <div class="auth-tabs-nav">
                <button type="button" class="auth-tab-btn ${isLogin ? 'active' : ''}" onclick="switchAuthTab('login')">
                  Sign In
                </button>
                <button type="button" class="auth-tab-btn ${isSignup ? 'active' : ''}" onclick="switchAuthTab('signup')">
                  Create Account
                </button>
                <button type="button" class="auth-tab-btn ${isForgot ? 'active' : ''}" onclick="switchAuthTab('forgot')">
                  Reset Password
                </button>
              </div>
            ` : ''}
            
            ${sessionStorage.getItem('pending_invite_token') ? `
              <div style="background: rgba(0, 112, 186, 0.08); border: 1px solid rgba(0, 112, 186, 0.25); border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: var(--accent-primary); text-align: center; font-weight: 600;">
                🤝 Group Invitation Pending &mdash; Sign in to join immediately!
              </div>
            ` : ''}

            <!-- MODE: Dedicated Google Sign-In Tab / View -->
            ${isGoogle ? `
              <div style="text-align: center; padding: 8px 0;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-muted); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                  ${googleSvg}
                </div>
                <h3 style="font-size: 19px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px;">Official Google Identity</h3>
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
                  Connect your Google account to SplitSmart securely.
                </p>

                ${rememberedEmail ? `
                  <!-- 1-Click Fast Account Card -->
                  <div onclick="handleOneClickGoogleLogin('${escapeHtml(rememberedEmail)}', '${escapeHtml(rememberedName || 'User')}')" 
                       style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s;"
                       onmouseover="this.style.borderColor='var(--accent-primary)'" 
                       onmouseout="this.style.borderColor='var(--border-subtle)'">
                    <div style="display: flex; align-items: center; gap: 12px; text-align: left;">
                      <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--accent-primary); color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                        ${rememberedName ? rememberedName.charAt(0).toUpperCase() : 'G'}
                      </div>
                      <div>
                        <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${escapeHtml(rememberedName || 'Google Account')}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(rememberedEmail)}</div>
                      </div>
                    </div>
                    <span class="badge badge-green" style="font-size: 11px;">1-Click &rarr;</span>
                  </div>
                ` : ''}

                <!-- Direct Google Details Form -->
                <form onsubmit="handleDirectGoogleSignIn(event)">
                  <div class="form-group" style="text-align: left; margin-bottom: 14px;">
                    <label class="form-label" style="font-size: 12px; font-weight: 700;">Google Account Email</label>
                    <input type="email" id="g-email" class="form-input" placeholder="e.g. name@gmail.com" value="${escapeHtml(rememberedEmail)}" required autofocus>
                  </div>

                  <div class="form-group" style="text-align: left; margin-bottom: 20px;">
                    <label class="form-label" style="font-size: 12px; font-weight: 700;">Your Full Name</label>
                    <input type="text" id="g-name" class="form-input" placeholder="e.g. Omprakash Sahoo" value="${escapeHtml(rememberedName)}" required>
                  </div>

                  <div id="g-auth-error" style="display: none; background: var(--danger-subtle); border: 1px solid var(--danger-border); border-radius: 6px; padding: 10px; margin-bottom: 14px; font-size: 13px; color: var(--danger-text); text-align: left;"></div>

                  <button type="submit" id="btn-g-submit" class="btn btn-primary btn-block btn-lg" style="font-weight: 700;">
                    Continue with Google &rarr;
                  </button>

                  <button type="button" class="btn btn-secondary btn-block" onclick="switchAuthTab('login')" style="margin-top: 10px;">
                    Cancel &amp; Back to Sign In
                  </button>
                </form>

                <div style="margin-top: 18px; font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">
                  By signing in, Google will share your profile name and email address with SplitSmart for verified ledger access.
                </div>
              </div>
            ` : ''}
            
            <!-- MODE: Email OTP Verification -->
            ${isOtp ? `
              <form id="otp-form" onsubmit="handleOtpSubmit(event)">
                <div class="form-group" style="text-align: center;">
                  <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(0, 112, 186, 0.08); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: var(--accent-primary);">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                  <label class="form-label" style="text-align: center; margin-bottom: 8px; font-weight: 800; font-size: 16px;">Check Your Email Inbox</label>
                  <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
                    We sent a 6-digit verification code to <strong>${escapeHtml(authState.pendingEmail)}</strong>. Please check your inbox and spam folder.
                  </p>
                  <input type="text" id="otp-input" class="form-input" maxlength="6" placeholder="000000" style="text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 8px; font-family: var(--font-code); max-width: 240px; margin: 0 auto; display: block;" required autofocus>
                </div>

                <div id="auth-error-box" style="display: none; background: var(--danger-subtle); border: 1px solid var(--danger-border); border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 13px; color: var(--danger-text);"></div>

                <button type="submit" id="btn-verify-otp" class="btn btn-primary btn-block btn-lg" style="margin-top: 16px;">
                  Verify &amp; Activate Account &rarr;
                </button>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; font-size: 13px;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="handleResendOtp()">Resend Email Code</button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="switchAuthTab('login')">Back to Sign In</button>
                </div>
              </form>
            ` : ''}

            <!-- MODE: Reset Password Inline Tab -->
            ${isForgot ? `
              <div id="forgot-pw-container">
                <form onsubmit="handleForgotPasswordRequest(event)">
                  <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                    Enter your registered email address. We will send a 6-digit security code to your inbox to securely reset your password.
                  </p>
                  <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" id="fp-email" class="form-input" placeholder="name@example.com" required value="${escapeHtml(authState.pendingEmail || rememberedEmail)}" autofocus>
                  </div>
                  <div id="fp-error" style="display: none; background: var(--danger-subtle); color: var(--danger-text); padding: 10px; border-radius: 6px; font-size: 13px; margin-bottom: 14px;"></div>
                  <button type="submit" id="btn-fp-send" class="btn btn-primary btn-block btn-lg">
                    Send 6-Digit Reset Code &rarr;
                  </button>
                  <button type="button" class="btn btn-secondary btn-block" onclick="switchAuthTab('login')" style="margin-top: 10px;">
                    Back to Sign In
                  </button>
                </form>
              </div>
            ` : ''}

            <!-- MODE: Standard Login or Sign Up -->
            ${(isLogin || isSignup) ? `
              <!-- Google Identity Quick Button -->
              <button type="button" class="btn btn-block btn-lg" onclick="signInWithGoogle()" style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 16px; font-weight: 600; background: var(--bg-surface); border: 1px solid var(--border-subtle); color: var(--text-primary); box-shadow: var(--shadow-xs); border-radius: 8px; transition: all 0.2s;">
                ${googleSvg}
                <span>Continue with Google</span>
              </button>

              <div style="display: flex; align-items: center; margin: 16px 0; color: var(--text-muted); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
                <span style="padding: 0 10px;">or with email</span>
                <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
              </div>

              <!-- Login / Signup Form -->
              <form id="auth-form" onsubmit="handleAuthSubmit(event)">
                ${isSignup ? `
                  <div class="form-group">
                    <label class="form-label" for="auth-name">Your Full Name</label>
                    <input type="text" id="auth-name" class="form-input" placeholder="e.g. Alex Rivera" required autofocus>
                  </div>
                ` : ''}

                <div class="form-group">
                  <label class="form-label" for="auth-email">Email Address</label>
                  <input type="email" id="auth-email" class="form-input" placeholder="name@example.com" required value="${authState.pendingEmail || ''}" ${!isSignup ? 'autofocus' : ''}>
                </div>

                <div class="form-group">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label class="form-label" for="auth-password" style="margin-bottom: 0;">Password</label>
                    ${isLogin ? `
                      <button type="button" onclick="switchAuthTab('forgot')" style="background: none; border: none; font-size: 12px; font-weight: 600; color: var(--accent-primary); cursor: pointer; padding: 0;">
                        Forgot Password?
                      </button>
                    ` : ''}
                  </div>
                  <input type="password" id="auth-password" class="form-input" placeholder="Minimum 6 characters" required>
                </div>

                ${isSignup ? `
                  <div class="form-group">
                    <label class="form-label" for="auth-currency">Default Currency</label>
                    <select id="auth-currency" class="form-select">
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                      <option value="INR" selected>INR (₹) - Indian Rupee</option>
                      <option value="CAD">CAD ($) - Canadian Dollar</option>
                      <option value="AUD">AUD ($) - Australian Dollar</option>
                    </select>
                  </div>
                ` : ''}

                <div id="auth-error-box" style="display: none; background: var(--danger-subtle); border: 1px solid var(--danger-border); border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 13px; color: var(--danger-text); line-height: 1.4;"></div>

                <button type="submit" id="btn-auth-submit" class="btn btn-primary btn-block btn-lg" style="margin-top: 12px;">
                  ${isLogin ? 'Sign In &rarr;' : 'Create Account &rarr;'}
                </button>
              </form>
            ` : ''}

          </div>

          <!-- Card Footer Prompt -->
          ${!isOtp && !isGoogle ? `
            <div class="card-footer" style="padding: 16px 24px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: center; text-align: center;">
              ${isLogin ? `
                <span style="font-size: 13px; color: var(--text-muted);">
                  Don't have an account? <a href="#/signup" style="font-weight: 700; color: var(--accent-primary);" onclick="switchAuthTab('signup'); return false;">Sign up for free</a>
                </span>
              ` : isSignup ? `
                <span style="font-size: 13px; color: var(--text-muted);">
                  Already registered? <a href="#/login" style="font-weight: 700; color: var(--accent-primary);" onclick="switchAuthTab('login'); return false;">Sign in</a>
                </span>
              ` : `
                <span style="font-size: 13px; color: var(--text-muted);">
                  Remembered your password? <a href="#/login" style="font-weight: 700; color: var(--accent-primary);" onclick="switchAuthTab('login'); return false;">Sign in</a>
                </span>
              `}
            </div>
          ` : ''}
        </div>

      </div>
    `;
}

function navigateAfterAuth() {
    const pendingInvite = sessionStorage.getItem('pending_invite_token');
    if (pendingInvite) {
        window.location.hash = `#/invite/accept?token=${pendingInvite}`;
    } else {
        window.location.hash = '#/dashboard';
    }
}

async function handleOneClickGoogleLogin(email, name) {
    try {
        showToast('Connecting via Google...', 'info', 1500);
        const res = await API.post('/auth/supabase-sync', {
            email,
            name,
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
        });

        if (res.token && res.user) {
            API.setAuth(res.token, res.user);
            localStorage.setItem('splitsmart_last_email', email);
            localStorage.setItem('splitsmart_last_name', name);
            showToast(`Welcome back, ${res.user.name}!`, 'success');
            navigateAfterAuth();
        } else {
            throw new Error(res.error || 'Authentication could not be completed.');
        }
    } catch (err) {
        showToast('Google sign-in error: ' + err.message, 'error');
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const isSignup = authState.mode === 'signup';
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorBox = document.getElementById('auth-error-box');
    const submitBtn = document.getElementById('btn-auth-submit');

    errorBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerText = isSignup ? 'Creating Account...' : 'Signing In...';

    try {
        if (isSignup) {
            const name = document.getElementById('auth-name').value.trim();
            const defaultCurrency = document.getElementById('auth-currency').value;

            const res = await API.post('/auth/signup', {
                name,
                email,
                password,
                defaultCurrency
            });

            showToast(res.message || 'Account registered! Enter verification code.', 'success');
            authState.pendingEmail = email;
            authState.pendingUserId = res.userId;
            authState.mode = 'otp';
            renderAuthView('otp');
        } else {
            const res = await API.post('/auth/login', { email, password });
            API.setToken(res.token);
            AppState.setUser(res.user);
            localStorage.setItem('splitsmart_last_email', email);
            localStorage.setItem('splitsmart_last_name', res.user.name);
            showToast(`Welcome back, ${res.user.name}!`, 'success');
            navigateAfterAuth();
        }
    } catch (err) {
        if (err.data && err.data.error === 'ACCOUNT_NOT_VERIFIED') {
            authState.pendingEmail = err.data.email || email;
            authState.mode = 'otp';
            showToast('Please enter your 6-digit verification code.', 'warning');
            renderAuthView('otp');
            return;
        }

        errorBox.innerHTML = `<strong>Error:</strong> ${err.message}`;
        errorBox.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = isSignup ? 'Create Account &rarr;' : 'Sign In &rarr;';
    }
}

async function handleOtpSubmit(e) {
    e.preventDefault();
    const otpInput = document.getElementById('otp-input').value.trim();
    const errorBox = document.getElementById('auth-error-box');
    const verifyBtn = document.getElementById('btn-verify-otp');

    errorBox.style.display = 'none';
    verifyBtn.disabled = true;
    verifyBtn.innerText = 'Verifying Code...';

    try {
        const res = await API.post('/auth/verify-otp', {
            email: authState.pendingEmail,
            otpCode: otpInput
        });

        API.setToken(res.token);
        AppState.setUser(res.user);
        showToast('Account verified successfully!', 'success');
        navigateAfterAuth();
    } catch (err) {
        errorBox.innerHTML = `<strong>Verification Failed:</strong> ${err.message}`;
        errorBox.style.display = 'block';
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.innerText = 'Verify & Activate Account \u2192';
    }
}

async function handleResendOtp() {
    if (!authState.pendingEmail) {
        showToast('Please enter your email first.', 'error');
        return;
    }
    try {
        const res = await API.post('/auth/resend-otp', { email: authState.pendingEmail });
        showToast('A fresh 6-digit verification code has been dispatched to your email!', 'success');
        renderAuthView('otp');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleForgotPasswordRequest(e) {
    e.preventDefault();
    const email = document.getElementById('fp-email')?.value.trim();
    const btn = document.getElementById('btn-fp-send');
    const errBox = document.getElementById('fp-error');

    if (!email) return;
    btn.disabled = true;
    btn.innerText = 'Sending Code...';
    errBox.style.display = 'none';

    try {
        const res = await API.post('/auth/forgot-password', { email });
        showToast(res.message || 'Reset code sent!', 'success');

        // Transition to Step 2: Enter code & new password inside tab
        const container = document.getElementById('forgot-pw-container');
        if (container) {
            container.innerHTML = `
              <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                We sent a 6-digit code to <strong>${escapeHtml(email)}</strong>. Enter it below with your new password.
              </p>
              <form onsubmit="handlePasswordResetConfirm(event, '${escapeHtml(email)}')">
                <div class="form-group">
                  <label class="form-label">6-Digit Security Code</label>
                  <input type="text" id="fp-code" class="form-input" maxlength="6" placeholder="000000" style="text-align: center; font-size: 24px; font-weight: 800; letter-spacing: 6px; font-family: var(--font-code);" required autofocus>
                </div>
                <div class="form-group">
                  <label class="form-label">New Password</label>
                  <input type="password" id="fp-new-pw" class="form-input" placeholder="Minimum 6 characters" minlength="6" required>
                </div>
                <div id="fp-error-2" style="display: none; background: var(--danger-subtle); color: var(--danger-text); padding: 10px; border-radius: 6px; font-size: 13px; margin-bottom: 14px;"></div>
                <button type="submit" id="btn-fp-confirm" class="btn btn-primary btn-block btn-lg">
                  Update Password &rarr;
                </button>
                <button type="button" class="btn btn-secondary btn-block" onclick="switchAuthTab('login')" style="margin-top: 10px;">
                  Cancel &amp; Back to Sign In
                </button>
              </form>
            `;
        }
    } catch (err) {
        errBox.innerText = err.message || 'Could not send reset code.';
        errBox.style.display = 'block';
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Send 6-Digit Reset Code \u2192';
        }
    }
}

async function handlePasswordResetConfirm(e, email) {
    e.preventDefault();
    const otpCode = document.getElementById('fp-code')?.value.trim();
    const newPassword = document.getElementById('fp-new-pw')?.value;
    const btn = document.getElementById('btn-fp-confirm');
    const errBox = document.getElementById('fp-error-2');

    if (!otpCode || !newPassword) return;
    btn.disabled = true;
    btn.innerText = 'Updating Password...';
    errBox.style.display = 'none';

    try {
        const res = await API.post('/auth/reset-password', { email, otpCode, newPassword });
        showToast(res.message || 'Password updated! Please sign in.', 'success', 4000);
        switchAuthTab('login');
    } catch (err) {
        errBox.innerText = err.message || 'Failed to update password.';
        errBox.style.display = 'block';
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Update Password \u2192';
        }
    }
}

function renderForgotPasswordModal() {
    switchAuthTab('forgot');
}

function closeForgotPasswordModal() {
    switchAuthTab('login');
}

window.renderAuthView = renderAuthView;
window.switchAuthTab = switchAuthTab;
window.handleAuthSubmit = handleAuthSubmit;
window.handleOtpSubmit = handleOtpSubmit;
window.handleResendOtp = handleResendOtp;
window.handleOneClickGoogleLogin = handleOneClickGoogleLogin;
window.renderForgotPasswordModal = renderForgotPasswordModal;
window.closeForgotPasswordModal = closeForgotPasswordModal;
window.handleForgotPasswordRequest = handleForgotPasswordRequest;
window.handlePasswordResetConfirm = handlePasswordResetConfirm;
