/**
 * SplitSmart AI - Client-Side Hash Router (14-Page Architecture)
 */

const Router = {
    async handleRoute() {
        const hash = window.location.hash || '#/';
        const [path, queryString] = hash.split('?');
        const params = new URLSearchParams(queryString || '');

        // Re-render navbar to reflect active navigation item
        renderNavbar();
        if (typeof closeMobileNavMenu === 'function') {
            closeMobileNavMenu();
        }

        // 0. Supabase & Google OAuth Callback Route
        if (path === '#/auth/callback' || hash.startsWith('#access_token=') || hash.startsWith('#/access_token=')) {
            if (window.SupabaseAuth && window.SupabaseAuth.handleAuthCallback) {
                window.SupabaseAuth.handleAuthCallback();
            }
            return;
        }

        // 1. Invitation Acceptance Route: #/invite/accept?token=...
        if (path === '#/invite/accept') {
            const token = params.get('token');
            if (!token) {
                showToast('Invitation token missing.', 'error');
                window.location.hash = '#/';
                return;
            }
            renderInviteAcceptView(token);
            return;
        }

        // 2. Landing & Marketing Pages
        if (path === '#/' || path === '#/features' || path === '#/how-it-works' || path === '#/about') {
            if (AppState.user && path === '#/') {
                window.location.hash = '#/dashboard';
                return;
            }
            renderHomeView();
            if (path === '#/features' || path === '#/how-it-works' || path === '#/about') {
                const target = document.getElementById(path.slice(2));
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            }
            return;
        }

        // 3. Auth Pages
        if (path === '#/login') {
            if (AppState.user) {
                window.location.hash = '#/dashboard';
                return;
            }
            renderAuthView('login');
            return;
        }

        if (path === '#/signup') {
            if (AppState.user) {
                window.location.hash = '#/dashboard';
                return;
            }
            renderAuthView('signup');
            return;
        }

        if (path === '#/forgot-password' || path === '#/reset-password') {
            if (AppState.user) {
                window.location.hash = '#/dashboard';
                return;
            }
            renderAuthView('forgot');
            return;
        }

        if (path === '#/auth/google') {
            if (AppState.user) {
                window.location.hash = '#/dashboard';
                return;
            }
            window.location.hash = '#/login';
            return;
        }

        // 4. Privacy & Help FAQ
        if (path === '#/privacy' || path === '#/help') {
            renderPrivacyView();
            return;
        }

        // 4b. Public Standalone Digital Receipt (Zero Login Required for Recipients!)
        if (path === '#/receipt' || path === '#/view-receipt') {
            if (window.renderPublicReceiptView) {
                renderPublicReceiptView();
            }
            return;
        }

        // --- AUTH PROTECTED ROUTES ---
        if (!AppState.user) {
            showToast('Please sign in to access this feature.', 'warning');
            window.location.hash = '#/login';
            return;
        }

        // 4c. AI Bill Calculator Studio (Logged-in Users Only)
        if (path === '#/calculator' || path === '#/quick-split' || path === '#/split-calc') {
            renderCalculatorView();
            return;
        }

        // 5. Dashboard
        if (path === '#/dashboard') {
            renderDashboardView();
            return;
        }

        // 6. My Groups & Group Details
        if (path === '#/groups') {
            renderGroupsView();
            return;
        }

        const groupMatch = path.match(/^#\/groups\/(\d+)$/);
        if (groupMatch) {
            renderGroupDetailsView(parseInt(groupMatch[1], 10));
            return;
        }

        // 7. Add Expense
        if (path === '#/add-expense') {
            renderAddExpenseView();
            return;
        }

        // 8. AI Assistant
        if (path === '#/ai-assistant') {
            renderAiAssistantView();
            return;
        }

        // 9. Settlements
        if (path === '#/settlements') {
            renderSettlementsView();
            return;
        }

        // 10. Checkout / PayPal
        const checkoutMatch = path.match(/^#\/checkout\/(\d+)$/);
        if (checkoutMatch) {
            renderCheckoutView(parseInt(checkoutMatch[1], 10));
            return;
        }

        // 11. Transaction History
        if (path === '#/history') {
            renderHistoryView();
            return;
        }

        // 12. Analytics
        if (path === '#/analytics') {
            renderAnalyticsView();
            return;
        }

        // 13. Notifications
        if (path === '#/notifications') {
            renderNotificationsView();
            return;
        }

        // 14. Profile & Settings
        if (path === '#/profile') {
            renderProfileView();
            return;
        }

        // Default 404 fallback
        window.location.hash = '#/dashboard';
    }
};

window.Router = Router;
window.addEventListener('hashchange', () => Router.handleRoute());
