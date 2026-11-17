/*
 * Made in Lo — client d'authentification.
 * Inclure avec : <script src="auth-client.js" data-role="admin"></script>  (ou data-role="shop")
 * Ajoute automatiquement le jeton de session aux appels vers /api/ de ce site.
 */
(function () {
    'use strict';

    var script = document.currentScript;
    var role = script && script.dataset ? script.dataset.role : null;
    var ADMIN_KEY = 'mil_admin_session';
    var SHOP_KEY = 'mil_shop_session';
    var nativeFetch = window.fetch.bind(window);
    var refreshing = null;

    var store = {
        get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
        set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
        del: function (k) { try { localStorage.removeItem(k); } catch (e) { } }
    };

    function postJson(url, body) {
        return nativeFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    function refreshAdmin() {
        var s = store.get(ADMIN_KEY);
        if (!s || !s.refresh_token) return Promise.resolve(null);
        if (!refreshing) {
            refreshing = postJson('api/admin-auth', { action: 'refresh', refresh_token: s.refresh_token })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (d) {
                    refreshing = null;
                    if (d && d.access_token) { store.set(ADMIN_KEY, d); return d; }
                    store.del(ADMIN_KEY);
                    return null;
                })
                .catch(function () { refreshing = null; return null; });
        }
        return refreshing;
    }

    async function adminToken() {
        var s = store.get(ADMIN_KEY);
        if (!s) return null;
        if (s.expires_at && s.expires_at * 1000 < Date.now() + 60000) s = await refreshAdmin();
        return s ? s.access_token : null;
    }

    function shopToken() {
        var s = store.get(SHOP_KEY);
        return s ? s.token : null;
    }

    function isOwnApi(url) {
        try {
            var u = new URL(url, location.href);
            return u.origin === location.origin && u.pathname.indexOf('/api/') === 0;
        } catch (e) { return false; }
    }

    function isAuthEndpoint(url) {
        return /api\/(admin-auth|shop-auth)/.test(url);
    }

    function onUnauthorized() {
        if (role === 'admin') {
            store.del(ADMIN_KEY);
            if (typeof window.MILAuth.showLogin === 'function') window.MILAuth.showLogin();
        } else if (role === 'shop') {
            store.del(SHOP_KEY);
            location.href = 'partner-login.html';
        }
    }

    if (role) {
        window.fetch = async function (input, init) {
            var url = typeof input === 'string' ? input : (input && input.url) || '';
            if (!isOwnApi(url)) return nativeFetch(input, init);

            init = Object.assign({}, init || {});
            var headers = new Headers(init.headers || (typeof input !== 'string' && input.headers) || undefined);
            if (typeof init.body === 'string' && !headers.has('Content-Type')) {
                headers.set('Content-Type', 'application/json');
            }
            var token = role === 'admin' ? await adminToken() : shopToken();
            if (token) headers.set('Authorization', 'Bearer ' + token);
            init.headers = headers;

            var res = await nativeFetch(input, init);

            if (res.status === 401 && role === 'admin' && !isAuthEndpoint(url)) {
                var s = await refreshAdmin();
                if (s) {
                    headers.set('Authorization', 'Bearer ' + s.access_token);
                    res = await nativeFetch(input, init);
                }
            }
            if (res.status === 401 && !isAuthEndpoint(url)) onUnauthorized();
            return res;
        };
    }

    window.MILAuth = {
        role: role,
        showLogin: null,

        // Échappe du texte avant insertion dans du HTML (protection XSS)
        escape: function (value) {
            return String(value === undefined || value === null ? '' : value)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        },

        // ----- Admin (Supabase Auth) -----
        adminLogin: async function (email, password) {
            try {
                var r = await postJson('api/admin-auth', { action: 'login', email: email, password: password });
                var d = await r.json().catch(function () { return {}; });
                if (r.ok && d.access_token) { store.set(ADMIN_KEY, d); return { ok: true }; }
                return { ok: false, error: d.error || 'Connexion impossible' };
            } catch (e) {
                return { ok: false, error: 'Erreur réseau' };
            }
        },
        hasAdminSession: function () { return !!store.get(ADMIN_KEY); },
        adminEmail: function () { var s = store.get(ADMIN_KEY); return s ? s.email : ''; },
        verifyAdmin: async function () {
            if (!store.get(ADMIN_KEY)) return false;
            try {
                var r = await window.fetch('api/admin-auth', { method: 'POST', body: JSON.stringify({ action: 'me' }) });
                if (r.status === 401) {
                    var s = await refreshAdmin();
                    if (!s) return false;
                    r = await window.fetch('api/admin-auth', { method: 'POST', body: JSON.stringify({ action: 'me' }) });
                }
                return r.ok;
            } catch (e) { return false; }
        },
        adminLogout: function () { store.del(ADMIN_KEY); location.reload(); },

        // ----- Partenaires -----
        setShopSession: function (d) { store.set(SHOP_KEY, { token: d.token, shop_id: d.shop_id, shop_name: d.shop_name }); },
        shopSession: function () { return store.get(SHOP_KEY); },
        shopLogout: function () { store.del(SHOP_KEY); }
    };
})();
