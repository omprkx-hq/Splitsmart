/**
 * SplitSmart AI - Supabase Cloud Database & OAuth Service
 * Manages Supabase client initialization, token verification, and dynamic configuration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let supabaseClient = null;

function sanitizeUrl(rawUrl) {
    if (!rawUrl) return '';
    return rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

function getSupabaseConfig() {
    return {
        url: sanitizeUrl(process.env.SUPABASE_URL),
        anonKey: (process.env.SUPABASE_ANON_KEY || '').trim(),
        serviceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
        databaseUrl: (process.env.DATABASE_URL || '').trim(),
        configured: Boolean(
            (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) ||
            process.env.DATABASE_URL
        )
    };
}

function initSupabase() {
    const config = getSupabaseConfig();
    if (config.url && (config.serviceRoleKey || config.anonKey)) {
        const key = config.serviceRoleKey || config.anonKey;
        try {
            supabaseClient = createClient(config.url, key, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
            console.log('✅ [SUPABASE] Supabase JS Client initialized successfully.');
        } catch (err) {
            console.warn('⚠️ [SUPABASE] Initialization error:', err.message);
            supabaseClient = null;
        }
    } else {
        supabaseClient = null;
    }
    return supabaseClient;
}

// Initialize on module load
initSupabase();

/**
 * Verify a Supabase access token (JWT) from client-side Google OAuth
 */
async function verifySupabaseUser(token) {
    if (!token) return null;
    const client = supabaseClient || initSupabase();
    if (!client) return null;

    try {
        const { data: { user }, error } = await client.auth.getUser(token);
        if (error || !user) {
            console.warn('[SUPABASE] Auth token verification failed:', error?.message);
            return null;
        }
        return {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
            avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            emailConfirmed: user.email_confirmed_at != null
        };
    } catch (err) {
        console.error('[SUPABASE] Token verification exception:', err.message);
        return null;
    }
}

/**
 * Update Supabase / Database configuration and write to .env
 */
function updateConfig({ url, anonKey, databaseUrl }) {
    const envPath = path.join(__dirname, '..', '..', '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    function setEnvVar(key, val) {
        if (!val) return;
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${val}`);
        } else {
            envContent += `\n${key}=${val}`;
        }
        process.env[key] = val;
    }

    if (url) setEnvVar('SUPABASE_URL', sanitizeUrl(url));
    if (anonKey) setEnvVar('SUPABASE_ANON_KEY', anonKey.trim());
    if (databaseUrl) setEnvVar('DATABASE_URL', databaseUrl.trim());

    fs.writeFileSync(envPath, envContent, 'utf8');
    initSupabase();

    return getSupabaseConfig();
}

module.exports = {
    getSupabaseClient: () => supabaseClient,
    getSupabaseConfig,
    initSupabase,
    verifySupabaseUser,
    updateConfig
};

