/**
 * SplitSmart AI - Top Navigation Bar Component & System-Adaptive Theme Engine
 * Binary Theme Model: Midnight Navy (#0A0E17) & Studio Light (#FAFAF9)
 * Supports dynamic OS prefers-color-scheme detection, explicit user toggle, and live navbar updates.
 */

// Global Theme Management Engine
function getThemePreference() {
    return localStorage.getItem('splitsmart_theme_mode') || 'dark';
}

function getEffectiveTheme() {
    const mode = getThemePreference();
    if (mode === 'system') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }
    return mode === 'dark' ? 'dark' : 'light';
}

function initThemeEngine() {
    const effectiveTheme = getEffectiveTheme();
    const mode = getThemePreference();
    
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.setAttribute('data-theme-mode', mode);

    // Accent color preference
    let savedAccent = localStorage.getItem('splitsmart_accent');
    const validAccents = ['paypal-blue', 'paypal-navy', 'emerald', 'gold', 'indigo'];
    if (!savedAccent || !validAccents.includes(savedAccent)) {
        savedAccent = 'paypal-blue';
        localStorage.setItem('splitsmart_accent', 'paypal-blue');
    }
    document.documentElement.setAttribute('data-accent', savedAccent);

    // Listen for OS-level theme changes when in 'system' mode
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = (e) => {
            const currentMode = getThemePreference();
            if (currentMode === 'system') {
                const newTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                renderNavbar();
                if (window.location.hash === '#/profile' && window.renderProfileView) {
                    window.renderProfileView();
                }
            }
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', listener);
        } else if (mediaQuery.addListener) {
            mediaQuery.addListener(listener);
        }
    }
}

function applyTheme(mode, e) {
    if (!['system', 'light', 'dark'].includes(mode)) {
        mode = 'system';
    }

    localStorage.setItem('splitsmart_theme_mode', mode);
    localStorage.setItem('splitsmart_theme', mode);

    const effective = (mode === 'system')
        ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : mode;

    document.documentElement.setAttribute('data-theme', effective);
    document.documentElement.setAttribute('data-theme-mode', mode);

    renderNavbar();

    if (window.location.hash === '#/profile' && window.renderProfileView) {
        window.renderProfileView();
    }
}

function applyThemeRaw(theme) {
    applyTheme(theme);
}

function toggleTheme(e) {
    const currentEffective = document.documentElement.getAttribute('data-theme') || getEffectiveTheme();
    const nextTheme = currentEffective === 'dark' ? 'light' : 'dark';
    
    if (typeof window.executeCircularThemeTransition === 'function') {
        window.executeCircularThemeTransition(e, nextTheme, () => {
            applyTheme(nextTheme, e);
        });
    } else {
        applyTheme(nextTheme, e);
    }

    if (typeof showToast === 'function') {
        showToast(nextTheme === 'dark' ? 'Switched to Obsidian Executive Dark' : 'Switched to Studio Light', 'info', 1800);
    }
}

function applyAccent(accent) {
    localStorage.setItem('splitsmart_accent', accent);
    document.documentElement.setAttribute('data-accent', accent);
    renderNavbar();

    if (window.location.hash === '#/profile' && window.renderProfileView) {
        window.renderProfileView();
    }
}

// Run Theme Initialization immediately
initThemeEngine();

function renderNavbar() {
    const navEl = document.getElementById('navbar');
    if (!navEl) return;

    const user = AppState.user;
    const currentHash = window.location.hash || '#/';
    const unread = AppState.unreadNotifications || 0;
    const currentTheme = document.documentElement.getAttribute('data-theme') || getEffectiveTheme();
    const isDark = currentTheme === 'dark';
    const themeMode = getThemePreference();

    // Clean Consumer Monogram & Brand
    const brandIcon = `
      <div style="width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #0070BA 0%, #003087 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.25);">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      </div>
    `;
    const bellIcon = Icons.bell(15);
    const themeToggleBtn = `
      <button type="button" class="btn btn-secondary btn-sm" onclick="toggleTheme(event)" 
        title="${isDark ? 'Currently Dark (Click for Light Mode)' : 'Currently Light (Click for Dark Mode)'}" 
        style="padding: 7px 11px; display: inline-flex; align-items: center; justify-content: center;">
        ${isDark ? Icons.sun(15) : Icons.moon(15)}
      </button>
    `;

    // Format display name and avatar initial
    const rawName = user?.name || user?.email?.split('@')[0] || 'User';
    const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const userInitial = displayName.charAt(0).toUpperCase();

    const mobileMenuBtn = `
      <button type="button" class="mobile-menu-btn" onclick="toggleMobileNavMenu(event)" aria-label="Toggle navigation">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    `;

    if (user) {
        navEl.innerHTML = `
          <div class="nav-container">
            <div style="display: flex; align-items: center; gap: 20px;">
              <a href="#/dashboard" class="brand-logo" style="display: flex; align-items: center; gap: 8px; text-decoration: none;">
                ${brandIcon}
                <span>Split<span class="brand-highlight">Smart</span></span>
              </a>
              <ul class="nav-links">
                <li class="nav-item"><a href="#/dashboard" class="${currentHash === '#/dashboard' ? 'active' : ''}">Dashboard</a></li>
                <li class="nav-item"><a href="#/groups" class="${currentHash.startsWith('#/groups') ? 'active' : ''}">Groups</a></li>
                <li class="nav-item"><a href="#/add-expense" class="${currentHash === '#/add-expense' ? 'active' : ''}">+ Expense</a></li>
                <li class="nav-item"><a href="#/calculator" class="${currentHash.startsWith('#/calculator') ? 'active' : ''}">AI Split</a></li>
                <li class="nav-item"><a href="#/settlements" class="${currentHash === '#/settlements' ? 'active' : ''}">Settle Up</a></li>
                <li class="nav-item"><a href="#/history" class="${currentHash === '#/history' ? 'active' : ''}">Activity</a></li>
                <li class="nav-item"><a href="#/analytics" class="${currentHash === '#/analytics' ? 'active' : ''}">Analytics</a></li>
              </ul>
            </div>

            <div class="nav-actions">
              ${themeToggleBtn}
              <a href="#/notifications" class="btn btn-secondary btn-sm" style="position: relative; padding: 7px 12px;" title="Notifications">
                ${bellIcon}
                ${unread > 0 ? `<span style="position: absolute; top: -4px; right: -4px; background: var(--danger-primary); color: #FFF; font-size: 10px; font-weight: 700; width: 18px; height: 18px; border-radius: 9999px; display: flex; align-items: center; justify-content: center;">${unread}</span>` : ''}
              </a>
              <a href="#/profile" class="nav-user-pill" title="Profile & Settings: ${escapeHtml(displayName)}">
                <div class="nav-user-avatar">${escapeHtml(userInitial)}</div>
                <span class="nav-user-name">${escapeHtml(displayName)}</span>
              </a>
              <button class="btn btn-secondary btn-sm" onclick="handleLogout()" style="color: var(--text-muted);">Log Out</button>
              ${mobileMenuBtn}
            </div>
          </div>

          <!-- Mobile Slide-Down Drawer Navigation -->
          <div class="mobile-nav-drawer" id="mobile-nav-drawer">
            <a href="#/dashboard" class="mobile-drawer-link ${currentHash === '#/dashboard' ? 'active' : ''}" onclick="closeMobileNavMenu()">
              ${Icons.chart(16)} <span>Dashboard</span>
            </a>
            <a href="#/groups" class="mobile-drawer-link ${currentHash.startsWith('#/groups') ? 'active' : ''}" onclick="closeMobileNavMenu()">
              ${Icons.users(16)} <span>Groups</span>
            </a>
            <a href="#/add-expense" class="mobile-drawer-link ${currentHash === '#/add-expense' ? 'active' : ''}" onclick="closeMobileNavMenu()">
              ${Icons.plus(16)} <span>+ Add Expense</span>
            </a>
            <a href="#/calculator" class="mobile-drawer-link ${currentHash.startsWith('#/calculator') ? 'active' : ''}" onclick="closeMobileNavMenu()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>AI Quick Split</span>
            </a>
            <a href="#/settlements" class="mobile-drawer-link ${currentHash === '#/settlements' ? 'active' : ''}" onclick="closeMobileNavMenu()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <span>Settle Up</span>
            </a>
            <a href="#/history" class="mobile-drawer-link ${currentHash === '#/history' ? 'active' : ''}" onclick="closeMobileNavMenu()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
              <span>Activity Log</span>
            </a>
            <a href="#/analytics" class="mobile-drawer-link ${currentHash === '#/analytics' ? 'active' : ''}" onclick="closeMobileNavMenu()">
              ${Icons.chart(16)} <span>Spending Analytics</span>
            </a>
            <div class="mobile-drawer-divider"></div>
            <a href="#/profile" class="mobile-drawer-link" onclick="closeMobileNavMenu()">
              <div class="nav-user-avatar" style="width: 20px; height: 20px; font-size: 10px;">${escapeHtml(userInitial)}</div>
              <span>Profile &amp; Settings</span>
            </a>
            <button type="button" class="btn btn-secondary btn-block btn-sm" onclick="closeMobileNavMenu(); handleLogout()" style="margin-top: 8px; color: var(--danger-text);">
              Log Out
            </button>
          </div>

          <!-- Mobile Native Bottom Bar (Pinned Thumb Navigation) -->
          <nav class="mobile-bottom-nav">
            <a href="#/dashboard" class="${currentHash === '#/dashboard' ? 'active' : ''}">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span>Home</span>
            </a>
            <a href="#/groups" class="${currentHash.startsWith('#/groups') ? 'active' : ''}">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Groups</span>
            </a>
            <a href="#/add-expense" class="mobile-tab-action" title="Add Expense">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.6"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </a>
            <a href="#/calculator" class="${currentHash.startsWith('#/calculator') ? 'active' : ''}">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
              <span>AI Split</span>
            </a>
            <a href="#/settlements" class="${currentHash === '#/settlements' ? 'active' : ''}">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <span>Settle</span>
            </a>
          </nav>
        `;
    } else {
        navEl.innerHTML = `
          <div class="nav-container">
            <a href="#/" class="brand-logo" style="display: flex; align-items: center; gap: 8px; text-decoration: none;">
              ${brandIcon}
              <span>Split<span class="brand-highlight">Smart</span></span>
            </a>

            <ul class="nav-links">
              <li class="nav-item"><a href="#/" class="${currentHash === '#/' ? 'active' : ''}">Home</a></li>
              <li class="nav-item"><a href="#/features" class="${currentHash === '#/features' ? 'active' : ''}">Features</a></li>
              <li class="nav-item"><a href="#/how-it-works" class="${currentHash === '#/how-it-works' || currentHash === '#/about' ? 'active' : ''}">About &amp; How It Works</a></li>
              <li class="nav-item"><a href="#/help" class="${currentHash === '#/help' ? 'active' : ''}">Help &amp; FAQ</a></li>
            </ul>

            <div class="nav-actions">
              ${themeToggleBtn}
              <a href="#/login" class="btn btn-secondary btn-sm">Log In</a>
              <a href="#/signup" class="btn btn-primary btn-sm">Get Started Free</a>
              ${mobileMenuBtn}
            </div>
          </div>

          <!-- Mobile Drawer for Logged-Out Visitors -->
          <div class="mobile-nav-drawer" id="mobile-nav-drawer">
            <a href="#/" class="mobile-drawer-link ${currentHash === '#/' ? 'active' : ''}" onclick="closeMobileNavMenu()">Home</a>
            <a href="#/features" class="mobile-drawer-link" onclick="closeMobileNavMenu()">Features</a>
            <a href="#/how-it-works" class="mobile-drawer-link" onclick="closeMobileNavMenu()">About &amp; How It Works</a>
            <a href="#/help" class="mobile-drawer-link" onclick="closeMobileNavMenu()">Help &amp; FAQ</a>
            <div class="mobile-drawer-divider"></div>
            <a href="#/login" class="mobile-drawer-link" onclick="closeMobileNavMenu()">Log In</a>
            <a href="#/signup" class="btn btn-primary btn-block btn-sm" onclick="closeMobileNavMenu()" style="margin-top: 6px;">Get Started Free</a>
          </div>
        `;
    }
}

function handleLogout() {
    API.clearAuth();
    AppState.setUser(null);
    closeMobileNavMenu();
    showToast('You have been signed out.', 'info');
    window.location.hash = '#/';
}

function toggleMobileNavMenu(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const drawer = document.getElementById('mobile-nav-drawer');
    if (drawer) {
        drawer.classList.toggle('open');
    }
}

function closeMobileNavMenu() {
    const drawer = document.getElementById('mobile-nav-drawer');
    if (drawer) {
        drawer.classList.remove('open');
    }
}

// Close mobile drawer when clicking anywhere outside
window.addEventListener('click', (e) => {
    if (!e.target.closest('#navbar') && !e.target.closest('#mobile-nav-drawer')) {
        closeMobileNavMenu();
    }
});

window.renderNavbar = renderNavbar;
window.handleLogout = handleLogout;
window.toggleMobileNavMenu = toggleMobileNavMenu;
window.closeMobileNavMenu = closeMobileNavMenu;
window.applyTheme = applyTheme;
window.applyThemeRaw = applyThemeRaw;
window.applyAccent = applyAccent;
window.toggleTheme = toggleTheme;
window.getThemePreference = getThemePreference;
window.getEffectiveTheme = getEffectiveTheme;
