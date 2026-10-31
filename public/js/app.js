/**
 * SplitSmart AI - Application Bootstrap
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize State
    AppState.init();

    // 2. Subscribe navbar to state changes
    AppState.subscribe(() => {
        renderNavbar();
    });

    // 3. Verify session if token exists
    const token = API.getToken();
    if (token) {
        try {
            const meRes = await API.get('/auth/me');
            AppState.setUser(meRes.user);

            // Fetch notifications count
            const notifRes = await API.get('/notifications');
            AppState.setUnreadNotifications(notifRes.unreadCount || 0);
        } catch (err) {
            console.warn('Session verification failed:', err.message);
            API.clearAuth();
            AppState.setUser(null);
        }
    }

    // 4. Initial Navigation
    Router.handleRoute();
});
