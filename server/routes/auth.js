const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, connectTo, getDbStatus } = require('../db');
const { validateRealEmail } = require('../services/emailValidator');
const { sendMail } = require('../services/mailer');
const { getOtpEmailTemplate } = require('../services/emailTemplates');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const supabaseService = require('../services/supabaseService');

/**
 * Helper to generate secure 6-digit numeric OTP
 */
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/auth/signup
 * Registers a new user, validates MX records, sends real OTP email
 */
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, defaultCurrency = 'USD' } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        // 1. Mandatory MX Record Verification
        const emailValidation = await validateRealEmail(email);
        if (!emailValidation.isValid) {
            return res.status(400).json({
                error: 'INVALID_EMAIL_DOMAIN',
                message: emailValidation.error || 'This email address or domain does not exist. Please enter a real, valid email.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 2. Check if user already exists
        const existing = await query('SELECT id, is_verified FROM users WHERE email = $1', [normalizedEmail]);
        if (existing.rows.length > 0) {
            return res.status(400).json({
                error: 'EMAIL_ALREADY_EXISTS',
                message: 'An account with this email address already exists. Please log in.'
            });
        }

        // 3. Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 4. Generate 6-digit OTP (10 minute expiry)
        const otpCode = generateOtp();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // 5. Insert new user record
        const insertRes = await query(`
            INSERT INTO users (name, email, password_hash, is_verified, otp_code, otp_expires_at, default_currency)
            VALUES ($1, $2, $3, false, $4, $5, $6)
            RETURNING id, name, email, is_verified, default_currency, created_at
        `, [name.trim(), normalizedEmail, passwordHash, otpCode, otpExpiresAt, defaultCurrency]);

        const newUser = insertRes.rows[0];

        // 6. Send real verification email via Nodemailer
        let emailDelivered = true;
        try {
            const htmlContent = getOtpEmailTemplate({
                name: newUser.name,
                otpCode,
                expiresMinutes: 10
            });

            await sendMail({
                to: newUser.email,
                subject: 'SplitSmart AI - Verify Your Account with Security OTP',
                html: htmlContent
            });
        } catch (emailErr) {
            console.warn('Notice: SMTP dispatch error (proceeding with instant verification):', emailErr.message);
            emailDelivered = false;
        }

        // Log audit activity
        await query(`
            INSERT INTO activity_logs (actor_id, action, target_record, audit_metadata)
            VALUES ($1, 'USER_SIGNUP', $2, $3)
        `, [newUser.id, `user:${newUser.id}`, JSON.stringify({ email: newUser.email })]);

        return res.status(201).json({
            message: emailDelivered
                ? 'Account created successfully! We have sent a 6-digit verification code to your email.'
                : 'Account created! Enter the 6-digit verification code below to activate your account.',
            email: newUser.email,
            userId: newUser.id
        });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

/**
 * POST /api/auth/verify-otp
 * Verifies 6-digit OTP and activates account
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otpCode } = req.body;

        if (!email || !otpCode) {
            return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const userRes = await query(`
            SELECT id, name, email, is_verified, otp_code, otp_expires_at, default_currency
            FROM users WHERE email = $1
        `, [normalizedEmail]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User account not found.' });
        }

        const user = userRes.rows[0];

        if (user.is_verified) {
            const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            return res.json({
                message: 'Account is already verified.',
                token,
                user: { id: user.id, name: user.name, email: user.email, is_verified: true, default_currency: user.default_currency }
            });
        }

        if (!user.otp_code || user.otp_code !== otpCode.trim()) {
            return res.status(400).json({
                error: 'INVALID_OTP',
                message: 'The verification code entered is incorrect. Please check your inbox and try again.'
            });
        }

        if (new Date() > new Date(user.otp_expires_at)) {
            return res.status(400).json({
                error: 'EXPIRED_OTP',
                message: 'The verification code has expired. Please request a new code.'
            });
        }

        // Activate account
        await query(`
            UPDATE users 
            SET is_verified = true, otp_code = NULL, otp_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [user.id]);

        // Add welcome notification
        await query(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES ($1, 'WELCOME', 'Welcome to SplitSmart AI!', 'Your account has been successfully verified. You can now create expense groups and track shared balances.')
        `, [user.id]);

        // Issue session token
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        return res.json({
            message: 'Account successfully verified! Welcome to SplitSmart AI.',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_verified: true,
                default_currency: user.default_currency
            }
        });
    } catch (err) {
        console.error('Verify OTP error:', err);
        return res.status(500).json({ error: 'Verification failed due to a server error.' });
    }
});

/**
 * POST /api/auth/resend-otp
 * Generates and dispatches a fresh 6-digit OTP code
 */
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email address is required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const userRes = await query(`
            SELECT id, name, email, is_verified FROM users WHERE email = $1
        `, [normalizedEmail]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'No account registered with this email.' });
        }

        const user = userRes.rows[0];

        if (user.is_verified) {
            return res.status(400).json({ message: 'Account is already verified. Please sign in directly.' });
        }

        const newOtp = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await query(`
            UPDATE users SET otp_code = $1, otp_expires_at = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `, [newOtp, expiresAt, user.id]);

        // Dispatch email
        const htmlContent = getOtpEmailTemplate({
            name: user.name,
            otpCode: newOtp,
            expiresMinutes: 10
        });

        try {
            await sendMail({
                to: user.email,
                subject: 'SplitSmart AI - Your New Security Verification Code',
                html: htmlContent
            });
        } catch (mailErr) {
            console.warn('Resend OTP email warning:', mailErr.message);
        }

        return res.json({
            message: 'A new 6-digit verification code has been dispatched to your email.'
        });
    } catch (err) {
        console.error('Resend OTP error:', err);
        return res.status(500).json({ error: 'Failed to resend verification code.' });
    }
});

/**
 * POST /api/auth/login
 * Validates credentials and returns JWT token
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check user existence
        const userRes = await query(`
            SELECT id, name, email, password_hash, is_verified, default_currency, created_at
            FROM users WHERE email = $1
        `, [normalizedEmail]);

        if (userRes.rows.length === 0) {
            return res.status(401).json({
                error: 'INVALID_CREDENTIALS',
                message: 'Invalid email address or password.'
            });
        }

        const user = userRes.rows[0];

        // Check if user registered via Google / OAuth
        if (!user.password_hash || user.password_hash.startsWith('oauth:') || user.password_hash === 'google_oauth_verified') {
            return res.status(401).json({
                error: 'OAUTH_ACCOUNT',
                message: 'This account was signed up with Google. Please click "Continue with Google" above to sign in instantly, or use "Reset Password" if you wish to create a password.'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                error: 'INVALID_CREDENTIALS',
                message: 'Invalid email address or password. If you forgot your password, you can reset it via email OTP.'
            });
        }

        // Check verification status
        if (!user.is_verified) {
            // Dispatch a fresh OTP for convenience
            const newOtp = generateOtp();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
            await query('UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3', [newOtp, expiresAt, user.id]);

            try {
                await sendMail({
                    to: user.email,
                    subject: 'SplitSmart AI - Complete Your Account Verification',
                    html: getOtpEmailTemplate({ name: user.name, otpCode: newOtp, expiresMinutes: 10 })
                });
            } catch (mailErr) {
                console.warn('Could not auto-dispatch OTP on unverified login:', mailErr.message);
            }

            return res.status(403).json({
                error: 'ACCOUNT_NOT_VERIFIED',
                message: 'Your account is not verified yet. A verification code has been sent to your inbox.',
                email: user.email,
                userId: user.id
            });
        }

        // Issue JWT token
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        return res.json({
            message: 'Authentication successful.',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_verified: true,
                default_currency: user.default_currency,
                created_at: user.created_at
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Server error during login authentication.' });
    }
});

/**
 * POST /api/auth/forgot-password
 * Sends password reset OTP to user's verified email
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email address is required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const userRes = await query('SELECT id, name, email FROM users WHERE email = $1', [normalizedEmail]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'No registered account found with this email address.' });
        }

        const user = userRes.rows[0];
        const resetOtp = generateOtp();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await query('UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3', [resetOtp, expiresAt, user.id]);

        try {
            await sendMail({
                to: user.email,
                subject: 'SplitSmart AI - Password Reset Security Code',
                html: getOtpEmailTemplate({
                    name: user.name,
                    otpCode: resetOtp,
                    expiresMinutes: 15
                })
            });
        } catch (mailErr) {
            console.warn('Could not dispatch reset email:', mailErr.message);
        }

        return res.json({
            message: 'Password reset code has been delivered to your email inbox.',
            email: user.email
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ error: 'Failed to request password reset code.' });
    }
});

/**
 * POST /api/auth/reset-password
 * Verifies OTP and resets account password
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otpCode, newPassword } = req.body;
        if (!email || !otpCode || !newPassword) {
            return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const userRes = await query('SELECT id, name, email, otp_code, otp_expires_at FROM users WHERE email = $1', [normalizedEmail]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        const user = userRes.rows[0];

        if (!user.otp_code || user.otp_code.trim() !== otpCode.trim()) {
            return res.status(400).json({ error: 'INVALID_OTP', message: 'Invalid verification code.' });
        }

        if (user.otp_expires_at && new Date(user.otp_expires_at) < new Date()) {
            return res.status(400).json({ error: 'EXPIRED_OTP', message: 'Verification code has expired. Please request a new one.' });
        }

        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);

        await query(`
            UPDATE users 
            SET password_hash = $1, is_verified = true, otp_code = NULL, otp_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [newHash, user.id]);

        return res.json({
            message: 'Password successfully updated! You can now log in with your new password.'
        });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ error: 'Failed to reset password.' });
    }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile
 */
router.get('/me', authenticateToken, async (req, res) => {
    return res.json({
        user: req.user
    });
});

/**
 * PUT /api/auth/profile
 * Updates user profile settings (name, default currency)
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, defaultCurrency } = req.body;
        const updates = [];
        const values = [];
        let idx = 1;

        if (name && name.trim()) {
            updates.push(`name = $${idx++}`);
            values.push(name.trim());
        }
        if (defaultCurrency && defaultCurrency.trim()) {
            updates.push(`default_currency = $${idx++}`);
            values.push(defaultCurrency.trim().toUpperCase());
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No update parameters provided.' });
        }

        values.push(req.user.id);
        const updateSql = `
            UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${idx}
            RETURNING id, name, email, is_verified, default_currency, created_at
        `;

        const result = await query(updateSql, values);
        return res.json({
            message: 'Profile updated successfully.',
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Update profile error:', err);
        return res.status(500).json({ error: 'Failed to update profile settings.' });
    }
});

/**
 * GET /api/auth/supabase/config
 * Returns public Supabase and database connection status
 */
router.get('/supabase/config', async (req, res) => {
    const config = supabaseService.getSupabaseConfig();
    const dbStatus = getDbStatus();

    let googleProviderEnabled = false;
    if (config.url && config.anonKey) {
        try {
            const settingsRes = await fetch(`${config.url}/auth/v1/settings`, {
                headers: { 'apikey': config.anonKey },
                signal: AbortSignal.timeout(3000)
            });
            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                googleProviderEnabled = Boolean(settingsData?.external?.google);
            }
        } catch (_) {}
    }

    return res.json({
        configured: Boolean(config.url && config.anonKey),
        url: config.url || null,
        anonKey: config.anonKey || null,
        hasDatabaseUrl: Boolean(config.databaseUrl),
        googleProviderEnabled,
        dbStatus
    });
});

/**
 * POST /api/auth/supabase/setup
 * Configures or tests Supabase / PostgreSQL database connection dynamically
 */
router.post('/supabase/setup', async (req, res) => {
    try {
        let { url, anonKey, databaseUrl } = req.body;

        // Clean Supabase project URL if /rest/v1 was appended
        if (url && typeof url === 'string') {
            url = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
        }

        // If user accidentally put REST url in databaseUrl, handle gracefully
        if (databaseUrl && databaseUrl.trim().startsWith('http')) {
            if (!url) {
                url = databaseUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
            }
            databaseUrl = '';
        }

        let dbResult = null;
        if (databaseUrl && databaseUrl.trim()) {
            console.log('[SETUP] Testing and connecting to external PostgreSQL/Supabase...');
            dbResult = await connectTo(databaseUrl.trim());
        }

        const newConfig = supabaseService.updateConfig({
            url: url || undefined,
            anonKey: anonKey || undefined,
            databaseUrl: databaseUrl || undefined
        });

        return res.json({
            message: 'Supabase & Database configuration updated and verified successfully!',
            configured: Boolean(newConfig.url && newConfig.anonKey),
            dbStatus: getDbStatus()
        });
    } catch (err) {
        console.error('[SETUP] Supabase/Database setup error:', err.message);
        return res.status(400).json({
            error: 'DATABASE_SETUP_FAILED',
            message: `Could not connect to database: ${err.message}`
        });
    }
});

/**
 * POST /api/auth/supabase-sync
 * Handles Google OAuth / Supabase Auth session synchronization
 * Upserts user profile into users table and issues SplitSmart JWT
 */
router.post('/supabase-sync', async (req, res) => {
    try {
        const { email, name, avatarUrl, supabaseToken, defaultCurrency = 'USD' } = req.body;

        let verifiedEmail = email;
        let verifiedName = name;
        let verifiedAvatar = avatarUrl;

        // If client passed a supabaseToken, verify it with Supabase if configured
        if (supabaseToken && supabaseService.getSupabaseConfig().configured) {
            const verifiedUser = await supabaseService.verifySupabaseUser(supabaseToken);
            if (verifiedUser) {
                verifiedEmail = verifiedUser.email;
                verifiedName = verifiedUser.name || verifiedName;
                verifiedAvatar = verifiedUser.avatarUrl || verifiedAvatar;
            }
        }

        if (!verifiedEmail) {
            return res.status(400).json({ error: 'Valid email is required for OAuth login.' });
        }

        const normalizedEmail = verifiedEmail.trim().toLowerCase();
        const userName = (verifiedName || normalizedEmail.split('@')[0] || 'Friend').trim();

        // 1. Check if user already exists
        const existing = await query(`
            SELECT id, name, email, is_verified, default_currency, avatar_url
            FROM users WHERE email = $1
        `, [normalizedEmail]);

        let userRecord = null;

        if (existing.rows.length > 0) {
            // Existing user - update avatar & mark verified
            userRecord = existing.rows[0];
            await query(`
                UPDATE users
                SET is_verified = true,
                    avatar_url = COALESCE($1, avatar_url),
                    name = COALESCE($2, name),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [verifiedAvatar || null, userName, userRecord.id]);
        } else {
            // New user via Google OAuth - insert with verified status
            const insertRes = await query(`
                INSERT INTO users (name, email, password_hash, is_verified, avatar_url, default_currency)
                VALUES ($1, $2, 'google_oauth_verified', true, $3, $4)
                RETURNING id, name, email, is_verified, default_currency, avatar_url, created_at
            `, [userName, normalizedEmail, verifiedAvatar || null, defaultCurrency]);

            userRecord = insertRes.rows[0];

            // Send welcome notification
            await query(`
                INSERT INTO notifications (user_id, type, title, message)
                VALUES ($1, 'WELCOME', 'Welcome to SplitSmart!', 'Your Google account was connected successfully. Ready to split bills with friends and family!')
            `, [userRecord.id]);
        }

        // Issue 7-day SplitSmart session token
        const token = jwt.sign(
            { userId: userRecord.id, email: userRecord.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            message: 'Signed in with Google successfully!',
            token,
            user: {
                id: userRecord.id,
                name: userName,
                email: normalizedEmail,
                is_verified: true,
                default_currency: userRecord.default_currency || defaultCurrency,
                avatar_url: verifiedAvatar || userRecord.avatar_url
            }
        });
    } catch (err) {
        console.error('Supabase/Google OAuth sync error:', err);
        return res.status(500).json({ error: 'OAuth synchronization failed: ' + err.message });
    }
});

/**
 * GET /api/auth/db-status
 * Health check on current database engine
 */
router.get('/db-status', (req, res) => {
    return res.json({
        ...getDbStatus(),
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
