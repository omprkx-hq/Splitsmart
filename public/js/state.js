/**
 * SplitSmart AI - Application State
 */

const AppState = {
    user: null,
    groups: [],
    activeGroupId: null,
    unreadNotifications: 0,
    listeners: [],

    init() {
        this.user = API.getUser();
        const savedGroupId = localStorage.getItem('splitsmart_active_group');
        if (savedGroupId) {
            this.activeGroupId = parseInt(savedGroupId, 10);
        }
    },

    setUser(user) {
        this.user = user;
        API.setUser(user);
        this.notify();
    },

    setActiveGroup(groupId) {
        this.activeGroupId = groupId ? parseInt(groupId, 10) : null;
        if (groupId) {
            localStorage.setItem('splitsmart_active_group', String(groupId));
        } else {
            localStorage.removeItem('splitsmart_active_group');
        }
        this.notify();
    },

    setUnreadNotifications(count) {
        this.unreadNotifications = count;
        this.notify();
    },

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    },

    notify() {
        this.listeners.forEach(fn => fn(this));
    }
};

window.AppState = AppState;
