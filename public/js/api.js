/**
 * SplitSmart AI - Enterprise API Client
 */

const API = {
    getToken() {
        return localStorage.getItem('splitsmart_token');
    },

    setToken(token) {
        if (token) {
            localStorage.setItem('splitsmart_token', token);
        } else {
            localStorage.removeItem('splitsmart_token');
        }
    },

    getUser() {
        try {
            const raw = localStorage.getItem('splitsmart_user');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    setUser(user) {
        if (user) {
            localStorage.setItem('splitsmart_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('splitsmart_user');
        }
    },

    setAuth(token, user) {
        this.setToken(token);
        this.setUser(user);
        if (window.AppState && typeof window.AppState.setUser === 'function') {
            window.AppState.setUser(user);
        }
    },

    clearAuth() {
        localStorage.removeItem('splitsmart_token');
        localStorage.removeItem('splitsmart_user');
    },

    async request(endpoint, options = {}) {
        const url = `/api${endpoint}`;
        const headers = options.headers || {};

        const token = this.getToken();
        if (token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const config = {
            ...options,
            headers
        };

        try {
            const res = await fetch(url, config);
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const err = new Error(data.message || data.error || `HTTP ${res.status}`);
                err.status = res.status;
                err.code = data.error;
                err.data = data;
                throw err;
            }

            return data;
        } catch (err) {
            // Handle 401 unauthenticated
            if (err.status === 401 && !endpoint.includes('/auth/login')) {
                this.clearAuth();
                window.location.hash = '#/login';
            }
            throw err;
        }
    },

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
    },

    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

window.API = API;
