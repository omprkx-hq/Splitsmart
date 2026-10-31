/**
 * View 13: Profile & Settings
 * Includes account details, live system-adaptable theme engine, and Supabase cloud database management
 */

async function renderProfileView() {
    const content = document.getElementById('app-content');
    if (!content) return;

    const user = AppState.user;
    if (!user) {
        window.location.hash = '#/login';
        return;
    }

    const currentMode = (typeof getThemePreference === 'function') ? getThemePreference() : (localStorage.getItem('splitsmart_theme_mode') || 'system');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

    content.innerHTML = `
      <div style="max-width: 640px; margin: 0 auto;">
        
        <div class="page-header" style="margin-bottom: 24px;">
          <div>
            <h1 class="page-title">Profile &amp; Settings</h1>
            <p class="page-subtitle">Manage your personal credentials, ledger preferences, and system appearance.</p>
          </div>
        </div>

        <!-- User Details Card -->
        <div class="card" style="box-shadow: var(--shadow-md);">
          <div class="card-header">
            <span class="card-title">User Account Details</span>
            <span class="badge ${user.is_verified ? 'badge-green' : 'badge-red'}">
              ${user.is_verified ? `${Icons.shield(12)} Verified Email` : 'Unverified'}
            </span>
          </div>

          <form onsubmit="handleUpdateProfile(event)">
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="prof-name" class="form-input" value="${escapeHtml(user.name || '')}" required>
              </div>

              <div class="form-group">
                <label class="form-label">Registered Email</label>
                <input type="email" class="form-input" value="${escapeHtml(user.email || '')}" disabled style="background: var(--bg-muted); color: var(--text-muted);">
                <div class="form-hint">
                  Email addresses are permanently verified with direct email OTP verification.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Default Base Currency</label>
                <select id="prof-currency" class="form-select">
                  <option value="USD" ${user.default_currency === 'USD' ? 'selected' : ''}>USD ($) - US Dollar</option>
                  <option value="EUR" ${user.default_currency === 'EUR' ? 'selected' : ''}>EUR (€) - Euro</option>
                  <option value="GBP" ${user.default_currency === 'GBP' ? 'selected' : ''}>GBP (£) - British Pound</option>
                  <option value="INR" ${user.default_currency === 'INR' ? 'selected' : ''}>INR (₹) - Indian Rupee</option>
                  <option value="CAD" ${user.default_currency === 'CAD' ? 'selected' : ''}>CAD ($) - Canadian Dollar</option>
                  <option value="AUD" ${user.default_currency === 'AUD' ? 'selected' : ''}>AUD ($) - Australian Dollar</option>
                </select>
                <div class="form-hint">
                  Used for personal dashboard balance calculations. Group ledgers maintain their own isolated currency.
                </div>
              </div>

              <!-- Security Information -->
              <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px; margin-top: 20px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                  ${Icons.shield(14)} Fintech Security Specifications
                </div>
                <div style="font-size: 13px; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px;">
                  <div>• Password Protection: <strong style="color: var(--text-primary);">Bcrypt 10 rounds salt hashing</strong></div>
                  <div>• Session Verification: <strong style="color: var(--text-primary);">Signed JSON Web Tokens (JWT)</strong></div>
                  <div>• Real Email Delivery: <strong style="color: var(--accent-emerald);">Active Verified SMTP Relay</strong></div>
                  <div>• PayPal Mode: <strong style="color: var(--text-primary);">Official Sandbox Environment</strong></div>
                </div>
              </div>
            </div>

            <div class="card-footer" style="justify-content: space-between;">
              <button type="button" class="btn btn-secondary" onclick="handleLogout()" style="color: var(--danger-primary);">
                Sign Out
              </button>
              <button type="submit" id="btn-save-profile" class="btn btn-primary">
                Save Changes &rarr;
              </button>
            </div>
          </form>
        </div>

        <!-- Appearance & System-Adaptable Theme Engine -->
        <div class="card" style="box-shadow: var(--shadow-md); margin-top: 24px;">
          <div class="card-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--accent-primary);">${Icons.palette(18)}</span>
              <span class="card-title">System-Adaptable Appearance</span>
            </div>
            <span class="badge badge-primary">Auto-Sync</span>
          </div>

          <div class="card-body">
            <div style="margin-bottom: 20px;">
              <label class="form-label" style="margin-bottom: 10px;">Display Theme</label>
              
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                <!-- 1. System Mode -->
                <button type="button" class="theme-select-btn ${currentMode === 'system' ? 'active' : ''}" 
                  onclick="applyTheme('system', event)" 
                  style="padding: 14px 10px; border-radius: var(--radius-md); border: 2px solid ${currentMode === 'system' ? 'var(--accent-primary)' : 'var(--border-subtle)'}; background: var(--bg-surface); color: var(--text-primary); cursor: pointer; text-align: center; font-size: 13px; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.2s ease;">
                  <span style="font-size: 20px;">💻</span>
                  <span>System Auto</span>
                  <span style="font-size: 10px; font-weight: 400; color: var(--text-muted);">Adapts to OS</span>
                </button>

                <!-- 2. Light Mode -->
                <button type="button" class="theme-select-btn ${currentMode === 'light' ? 'active' : ''}" 
                  onclick="applyTheme('light', event)" 
                  style="padding: 14px 10px; border-radius: var(--radius-md); border: 2px solid ${currentMode === 'light' ? 'var(--accent-primary)' : 'var(--border-subtle)'}; background: #FFFFFF; color: #0F172A; cursor: pointer; text-align: center; font-size: 13px; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.2s ease;">
                  <span style="font-size: 20px;">☀️</span>
                  <span>Studio Light</span>
                  <span style="font-size: 10px; font-weight: 400; color: #64748B;">Crisp White</span>
                </button>

                <!-- 3. Dark Mode -->
                <button type="button" class="theme-select-btn ${currentMode === 'dark' ? 'active' : ''}" 
                  onclick="applyTheme('dark', event)" 
                  style="padding: 14px 10px; border-radius: var(--radius-md); border: 2px solid ${currentMode === 'dark' ? 'var(--accent-primary)' : 'var(--border-subtle)'}; background: #0A0E17; color: #F8FAFC; cursor: pointer; text-align: center; font-size: 13px; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.2s ease;">
                  <span style="font-size: 20px;">🌙</span>
                  <span>Midnight Navy</span>
                  <span style="font-size: 10px; font-weight: 400; color: #94A3B8;">Executive Slate</span>
                </button>
              </div>
            </div>

            <div>
              <label class="form-label" style="margin-bottom: 10px;">Brand Primary Palette</label>
              <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center;">
                <button type="button" class="accent-dot-btn" onclick="applyAccent('paypal-blue')" title="PayPal Blue (#0070BA)" style="background: #0070BA; width: 36px; height: 36px; border-radius: 9999px; border: 3px solid ${(document.documentElement.getAttribute('data-accent') || 'paypal-blue') === 'paypal-blue' ? 'var(--text-primary)' : 'transparent'}; cursor: pointer; transition: transform 0.2s;"></button>
                <button type="button" class="accent-dot-btn" onclick="applyAccent('paypal-navy')" title="PayPal Marine Navy (#003087)" style="background: #003087; width: 36px; height: 36px; border-radius: 9999px; border: 3px solid ${document.documentElement.getAttribute('data-accent') === 'paypal-navy' ? 'var(--text-primary)' : 'transparent'}; cursor: pointer; transition: transform 0.2s;"></button>
                <button type="button" class="accent-dot-btn" onclick="applyAccent('gold')" title="Warm Fintech Gold (#FFC439)" style="background: #FFC439; width: 36px; height: 36px; border-radius: 9999px; border: 3px solid ${document.documentElement.getAttribute('data-accent') === 'gold' ? 'var(--text-primary)' : 'transparent'}; cursor: pointer; transition: transform 0.2s;"></button>
                <button type="button" class="accent-dot-btn" onclick="applyAccent('emerald')" title="Banking Emerald (#059669)" style="background: #059669; width: 36px; height: 36px; border-radius: 9999px; border: 3px solid ${document.documentElement.getAttribute('data-accent') === 'emerald' ? 'var(--text-primary)' : 'transparent'}; cursor: pointer; transition: transform 0.2s;"></button>
                <button type="button" class="accent-dot-btn" onclick="applyAccent('indigo')" title="Royal Indigo (#4F46E5)" style="background: #4F46E5; width: 36px; height: 36px; border-radius: 9999px; border: 3px solid ${document.documentElement.getAttribute('data-accent') === 'indigo' ? 'var(--text-primary)' : 'transparent'}; cursor: pointer; transition: transform 0.2s;"></button>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    const name = document.getElementById('prof-name').value.trim();
    const defaultCurrency = document.getElementById('prof-currency').value;
    const btn = document.getElementById('btn-save-profile');

    btn.disabled = true;
    btn.innerText = 'Updating...';

    try {
        const res = await API.put('/auth/profile', { name, defaultCurrency });
        AppState.setUser(res.user);
        showToast('Profile updated successfully!', 'success');
        renderProfileView();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Save Changes →';
    }
}

window.renderProfileView = renderProfileView;
window.handleUpdateProfile = handleUpdateProfile;
