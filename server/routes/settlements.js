const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { query, getClient } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireGroupMembership } = require('../middleware/groupAuth');
const { computeGroupBalances, computePairwiseDirectDebts, optimizeSettlements } = require('../services/settlementOptimizer');
const { createOrder, captureAndVerifyOrder, verifyWebhookSignature, getAccessToken } = require('../services/paypalService');
const { sendMail } = require('../services/mailer');
const { getReceiptEmailTemplate } = require('../services/emailTemplates');

/**
 * GET /api/settlements/group/:groupId/balances
 * Computes individual net balances, simplified transfers, and direct pairwise debts
 */
router.get('/group/:groupId/balances', authenticateToken, requireGroupMembership, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);

        // Fetch group info & settings
        const groupRes = await query(`
            SELECT id, name, currency, COALESCE(simplify_debts, true) as simplify_debts
            FROM groups WHERE id = $1
        `, [groupId]);
        const groupInfo = groupRes.rows[0] || { simplify_debts: true };

        // Fetch active members
        const membersRes = await query(`
            SELECT u.id, u.name, u.email
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = $1 AND gm.membership_status = 'active'
        `, [groupId]);

        // Fetch all active expenses
        const expensesRes = await query(`
            SELECT id, payer_id, amount FROM expenses 
            WHERE group_id = $1 AND deleted_at IS NULL
        `, [groupId]);

        // Fetch all splits for active expenses
        const splitsRes = await query(`
            SELECT es.expense_id, es.participant_id, es.share_amount
            FROM expense_splits es
            JOIN expenses e ON es.expense_id = e.id
            WHERE e.group_id = $1 AND e.deleted_at IS NULL
        `, [groupId]);

        // Fetch co-funding payers for active expenses
        const expensePayersRes = await query(`
            SELECT ep.expense_id, ep.user_id, ep.amount_paid
            FROM expense_payers ep
            JOIN expenses e ON ep.expense_id = e.id
            WHERE e.group_id = $1 AND e.deleted_at IS NULL
        `, [groupId]);

        // Fetch all verified settlements
        const settlementsRes = await query(`
            SELECT id, payer_id, payee_id, amount, status
            FROM settlements
            WHERE group_id = $1 AND deleted_at IS NULL
        `, [groupId]);

        // Compute balances with multi-payer awareness
        const balances = computeGroupBalances(
            membersRes.rows,
            expensesRes.rows,
            splitsRes.rows,
            settlementsRes.rows,
            expensePayersRes.rows
        );

        // 1. Minimized Simplified Transfers (Subset-sum optimized greedy algorithm)
        const proposedTransfers = optimizeSettlements(balances);

        // 2. Direct Pairwise Debts (Exact 1:1 who owes whom without proxy re-routing)
        const directPairwiseDebts = computePairwiseDirectDebts(
            membersRes.rows,
            expensesRes.rows,
            splitsRes.rows,
            settlementsRes.rows,
            expensePayersRes.rows
        );

        // Existing settlements
        const fullSettlementsRes = await query(`
            SELECT 
                s.id, s.group_id, s.payer_id, s.payee_id, s.amount, s.currency, s.status, s.created_at, s.settled_at,
                up.name as payer_name, up.email as payer_email,
                ue.name as payee_name, ue.email as payee_email,
                p.provider_reference as payment_reference
            FROM settlements s
            JOIN users up ON s.payer_id = up.id
            JOIN users ue ON s.payee_id = ue.id
            LEFT JOIN payments p ON p.settlement_id = s.id AND p.verified_status = 'COMPLETED'
            WHERE s.group_id = $1 AND s.deleted_at IS NULL
            ORDER BY s.created_at DESC
        `, [groupId]);

        return res.json({
            balances,
            proposedTransfers,
            directPairwiseDebts,
            simplifyDebts: Boolean(groupInfo.simplify_debts !== false),
            settlements: fullSettlementsRes.rows
        });
    } catch (err) {
        console.error('Compute balances error:', err);
        return res.status(500).json({ error: 'Failed to compute group balances.' });
    }
});

/**
 * POST /api/settlements
 * Create a new pending settlement record
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { groupId, payerId, payeeId, amount, currency = 'USD' } = req.body;

        if (!groupId || !payerId || !payeeId || !amount) {
            return res.status(400).json({ error: 'Group ID, payer, payee, and amount are required.' });
        }

        if (payerId === payeeId) {
            return res.status(400).json({ error: 'Payer and payee cannot be the same user.' });
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than zero.' });
        }

        // Check active membership
        const memberCheck = await query(`
            SELECT user_id FROM group_members 
            WHERE group_id = $1 AND user_id IN ($2, $3) AND membership_status = 'active'
        `, [groupId, payerId, payeeId]);

        if (memberCheck.rows.length < 2) {
            return res.status(400).json({ error: 'Both payer and payee must be active members of the group.' });
        }

        const insertRes = await query(`
            INSERT INTO settlements (group_id, payer_id, payee_id, amount, currency, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING id, group_id, payer_id, payee_id, amount, currency, status, created_at
        `, [groupId, payerId, payeeId, numericAmount, currency.toUpperCase()]);

        const settlement = insertRes.rows[0];

        // Audit log
        await query(`
            INSERT INTO activity_logs (actor_id, action, target_record, group_id, audit_metadata)
            VALUES ($1, 'SETTLEMENT_PROPOSED', $2, $3, $4)
        `, [req.user.id, `settlement:${settlement.id}`, groupId, JSON.stringify({ payerId, payeeId, amount: numericAmount })]);

        return res.status(201).json({
            message: 'Settlement created successfully.',
            settlement
        });
    } catch (err) {
        console.error('Create settlement error:', err);
        return res.status(500).json({ error: 'Failed to create settlement.' });
    }
});

/**
 * GET /api/settlements/paypal/config
 * Exposes PayPal public configuration for frontend checkout rendering
 */
router.get('/paypal/config', (req, res) => {
    const clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
    const hasSecret = Boolean((process.env.PAYPAL_CLIENT_SECRET || '').trim());
    const mode = process.env.PAYPAL_MODE || 'sandbox';

    return res.json({
        configured: Boolean(clientId && hasSecret),
        clientId: clientId || 'sb', // 'sb' is standard PayPal default test client-id
        mode
    });
});

/**
 * POST /api/settlements/paypal/setup
 * Configures real PayPal credentials (Sandbox or Live) and persists to .env
 */
router.post('/paypal/setup', authenticateToken, async (req, res) => {
    try {
        const { clientId, clientSecret, mode = 'sandbox' } = req.body;

        if (!clientId || !clientId.trim() || !clientSecret || !clientSecret.trim()) {
            return res.status(400).json({ error: 'Both PayPal Client ID and Client Secret are required.' });
        }

        const cleanClientId = clientId.trim();
        const cleanClientSecret = clientSecret.trim();
        const cleanMode = (mode || 'sandbox').trim().toLowerCase();

        // Test credentials against PayPal API
        const previousClientId = process.env.PAYPAL_CLIENT_ID;
        const previousClientSecret = process.env.PAYPAL_CLIENT_SECRET;
        const previousMode = process.env.PAYPAL_MODE;

        process.env.PAYPAL_CLIENT_ID = cleanClientId;
        process.env.PAYPAL_CLIENT_SECRET = cleanClientSecret;
        process.env.PAYPAL_MODE = cleanMode;

        let token = null;
        try {
            token = await getAccessToken();
        } catch (testErr) {
            // Revert
            process.env.PAYPAL_CLIENT_ID = previousClientId;
            process.env.PAYPAL_CLIENT_SECRET = previousClientSecret;
            process.env.PAYPAL_MODE = previousMode;
            return res.status(400).json({
                error: 'PAYPAL_AUTH_VERIFICATION_FAILED',
                message: `Failed to authenticate with PayPal ${cleanMode}: ${testErr.message}. Please check your Client ID & Secret.`
            });
        }

        if (!token) {
            process.env.PAYPAL_CLIENT_ID = previousClientId;
            process.env.PAYPAL_CLIENT_SECRET = previousClientSecret;
            process.env.PAYPAL_MODE = previousMode;
            return res.status(400).json({
                error: 'PAYPAL_AUTH_FAILED',
                message: 'PayPal did not return an access token. Please verify your credentials.'
            });
        }

        // Persist to .env file
        const envPath = path.resolve(__dirname, '../../.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        const updateOrAppend = (content, key, val) => {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(content)) {
                return content.replace(regex, `${key}=${val}`);
            }
            return content + `\n${key}=${val}`;
        };

        envContent = updateOrAppend(envContent, 'PAYPAL_CLIENT_ID', cleanClientId);
        envContent = updateOrAppend(envContent, 'PAYPAL_CLIENT_SECRET', cleanClientSecret);
        envContent = updateOrAppend(envContent, 'PAYPAL_MODE', cleanMode);
        fs.writeFileSync(envPath, envContent, 'utf8');

        return res.json({
            success: true,
            message: `PayPal ${cleanMode.toUpperCase()} credentials verified and saved successfully! Real payments are now fully active.`,
            mode: cleanMode
        });
    } catch (err) {
        console.error('PayPal setup error:', err);
        return res.status(500).json({ error: 'Failed to configure PayPal credentials.' });
    }
});

/**
 * POST /api/settlements/:id/paypal/create-order
 * Creates a real PayPal Sandbox Order for this settlement with dynamic payee routing
 */
router.post('/:id/paypal/create-order', authenticateToken, async (req, res) => {
    try {
        const settlementId = parseInt(req.params.id, 10);

        const stRes = await query(`
            SELECT s.id, s.group_id, s.payer_id, s.payee_id, s.amount, s.currency, s.status,
                   g.name as group_name,
                   ue.name as payee_name, ue.email as payee_email
            FROM settlements s
            JOIN groups g ON s.group_id = g.id
            JOIN users ue ON s.payee_id = ue.id
            WHERE s.id = $1 AND s.deleted_at IS NULL
        `, [settlementId]);

        if (stRes.rows.length === 0) {
            return res.status(404).json({ error: 'Settlement record not found.' });
        }

        const settlement = stRes.rows[0];

        if (settlement.status === 'paid') {
            return res.status(400).json({ error: 'This settlement has already been settled and paid.' });
        }

        if (settlement.payer_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the designated debtor can initiate payment for this settlement.' });
        }

        const description = `SplitSmart Settlement #${settlement.id} to ${settlement.payee_name} in ${settlement.group_name}`;

        // Call PayPal Sandbox API with dynamic payee routing
        const order = await createOrder({
            amount: settlement.amount,
            currency: settlement.currency,
            settlementId: settlement.id,
            description,
            payeeEmail: settlement.payee_email
        });

        return res.json({
            orderId: order.id,
            order
        });
    } catch (err) {
        console.error('PayPal create order error:', err);
        return res.status(500).json({
            error: 'PAYPAL_ORDER_CREATION_FAILED',
            message: err.message
        });
    }
});

/**
 * POST /api/settlements/:id/paypal/verify-capture
 * Captures and verifies PayPal payment on server side, marks settlement paid, dispatches formatted receipt
 */
router.post('/:id/paypal/verify-capture', authenticateToken, async (req, res) => {
    const settlementId = parseInt(req.params.id, 10);
    const { orderId } = req.body;

    if (!orderId) {
        return res.status(400).json({ error: 'PayPal Order ID is required for verification.' });
    }

    try {
        // 1. Fetch settlement details
        const stRes = await query(`
            SELECT s.id, s.group_id, s.payer_id, s.payee_id, s.amount, s.currency, s.status,
                   g.name as group_name,
                   up.name as payer_name, up.email as payer_email,
                   ue.name as payee_name, ue.email as payee_email
            FROM settlements s
            JOIN groups g ON s.group_id = g.id
            JOIN users up ON s.payer_id = up.id
            JOIN users ue ON s.payee_id = ue.id
            WHERE s.id = $1 AND s.deleted_at IS NULL
        `, [settlementId]);

        if (stRes.rows.length === 0) {
            return res.status(404).json({ error: 'Settlement record not found.' });
        }

        const settlement = stRes.rows[0];

        if (settlement.status === 'paid') {
            return res.status(400).json({ error: 'This settlement has already been settled.' });
        }

        // 2. Call PayPal Sandbox API to capture and verify payment server-side
        const verification = await captureAndVerifyOrder(orderId);

        if (!verification.verified || verification.status !== 'COMPLETED') {
            return res.status(400).json({
                error: 'PAYMENT_VERIFICATION_FAILED',
                message: `PayPal reported capture status '${verification.status}'. Payment not verified.`
            });
        }

        // 3. Prevent duplicate capture / idempotency check
        const existingPayment = await query(`
            SELECT id FROM payments WHERE provider_reference = $1
        `, [verification.captureId]);

        if (existingPayment.rows.length > 0) {
            return res.status(400).json({
                error: 'DUPLICATE_PAYMENT',
                message: 'This PayPal transaction reference has already been processed.'
            });
        }

        // 4. Safe PostgreSQL Transaction to update status and record payment
        const client = await getClient();
        try {
            await client.query('BEGIN');

            // Record verified payment
            await client.query(`
                INSERT INTO payments (settlement_id, provider, provider_reference, payer_id, payee_id, amount, currency, verified_status, raw_payload, verified_at)
                VALUES ($1, 'paypal', $2, $3, $4, $5, $6, 'COMPLETED', $7, CURRENT_TIMESTAMP)
            `, [settlement.id, verification.captureId, settlement.payer_id, settlement.payee_id, verification.amount, verification.currency, JSON.stringify(verification.raw)]);

            // Update settlement status
            await client.query(`
                UPDATE settlements
                SET status = 'paid', settled_at = CURRENT_TIMESTAMP, related_references = $1
                WHERE id = $2
            `, [JSON.stringify({ captureId: verification.captureId, provider: 'paypal' }), settlement.id]);

            // Audit log
            await client.query(`
                INSERT INTO activity_logs (actor_id, action, target_record, group_id, audit_metadata)
                VALUES ($1, 'PAYMENT_VERIFIED_PAYPAL', $2, $3, $4)
            `, [req.user.id, `payment:${verification.captureId}`, settlement.group_id, JSON.stringify({ amount: verification.amount, currency: verification.currency })]);

            await client.query('COMMIT');
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }

        // 5. In-App Notifications
        await query(`
            INSERT INTO notifications (user_id, type, title, message, action_url)
            VALUES 
            ($1, 'SETTLEMENT_PAID', 'Settlement Payment Confirmed', $2, $3),
            ($4, 'SETTLEMENT_RECEIVED', 'Settlement Received via PayPal', $5, $3)
        `, [
            settlement.payer_id,
            `Your payment of ${settlement.currency} ${Number(settlement.amount).toFixed(2)} to ${settlement.payee_name} was verified via PayPal Sandbox.`,
            `/#/groups/${settlement.group_id}`,
            settlement.payee_id,
            `${settlement.payer_name} paid you ${settlement.currency} ${Number(settlement.amount).toFixed(2)} via PayPal Sandbox.`,
        ]);

        // 6. Send Formatted HTML Settlement Receipts via Nodemailer to both parties
        const appUrl = process.env.APP_URL || 'http://localhost:5000';
        const dashboardUrl = `${appUrl}/#/groups/${settlement.group_id}`;

        const receiptHtml = getReceiptEmailTemplate({
            receiptId: `PAYPAL-${verification.captureId}`,
            title: 'PayPal Settlement Verified',
            groupName: settlement.group_name,
            description: `Settlement Payment: ${settlement.payer_name} -> ${settlement.payee_name}`,
            category: 'Settlement',
            currency: settlement.currency,
            totalAmount: settlement.amount,
            payerName: settlement.payer_name,
            paymentRef: verification.captureId,
            isSettlement: true,
            splits: [
                {
                    participant_name: settlement.payee_name,
                    participant_email: settlement.payee_email,
                    split_method: 'Direct Settlement',
                    share_amount: settlement.amount
                }
            ],
            dashboardUrl
        });

        // Send to payer
        sendMail({
            to: settlement.payer_email,
            subject: `SplitSmart AI - PayPal Settlement Receipt #${verification.captureId}`,
            html: receiptHtml
        }).catch(err => console.warn('Payer receipt send error:', err.message));

        // Send to payee
        sendMail({
            to: settlement.payee_email,
            subject: `SplitSmart AI - Settlement Payment Received from ${settlement.payer_name}`,
            html: receiptHtml
        }).catch(err => console.warn('Payee receipt send error:', err.message));

        return res.json({
            success: true,
            message: 'PayPal Sandbox payment verified and settlement marked as paid!',
            settlementId: settlement.id,
            captureId: verification.captureId,
            status: 'paid'
        });
    } catch (err) {
        console.error('Verify PayPal capture error:', err);
        return res.status(500).json({
            error: 'PAYPAL_CAPTURE_VERIFICATION_FAILED',
            message: err.message
        });
    }
});

/**
 * POST /api/settlements/paypal/webhook
 * PayPal Webhook listener for asynchronous event reconciliation
 */
router.post('/paypal/webhook', async (req, res) => {
    try {
        const headers = req.headers;
        const body = req.body;

        const verification = await verifyWebhookSignature({
            headers,
            rawBody: body
        });

        if (!verification.verified) {
            console.warn('⚠️ Rejected unauthorized PayPal webhook payload');
            return res.status(400).json({ error: 'WEBHOOK_SIGNATURE_VERIFICATION_FAILED' });
        }

        const eventType = body.event_type;
        console.log(`✅ [PayPal Webhook] Received verified event: ${eventType}`);

        if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
            const capture = body.resource;
            const customId = capture.custom_id;
            if (customId) {
                const settlementId = parseInt(customId, 10);
                if (!isNaN(settlementId)) {
                    await query(`
                        UPDATE settlements 
                        SET status = 'paid', settled_at = CURRENT_TIMESTAMP
                        WHERE id = $1 AND status != 'paid'
                    `, [settlementId]);
                }
            }
        }

        return res.status(200).json({ status: 'success' });
    } catch (webhookErr) {
        console.error('PayPal webhook error:', webhookErr);
        return res.status(500).json({ error: 'Webhook processing error' });
    }
});

/**
 * POST /api/settlements/:id/cash-settle
 * Record a manual / direct cash settlement
 */
router.post('/:id/cash-settle', authenticateToken, async (req, res) => {
    try {
        const settlementId = parseInt(req.params.id, 10);

        const stRes = await query(`
            SELECT s.id, s.group_id, s.payer_id, s.payee_id, s.amount, s.currency, s.status,
                   g.name as group_name,
                   up.name as payer_name, up.email as payer_email,
                   ue.name as payee_name, ue.email as payee_email
            FROM settlements s
            JOIN groups g ON s.group_id = g.id
            JOIN users up ON s.payer_id = up.id
            JOIN users ue ON s.payee_id = ue.id
            WHERE s.id = $1 AND s.deleted_at IS NULL
        `, [settlementId]);

        if (stRes.rows.length === 0) {
            return res.status(404).json({ error: 'Settlement record not found.' });
        }

        const settlement = stRes.rows[0];

        if (settlement.status === 'paid') {
            return res.status(400).json({ error: 'Settlement has already been paid.' });
        }

        if (req.user.id !== settlement.payee_id && req.user.id !== settlement.payer_id) {
            return res.status(403).json({ error: 'Only the payer or payee can mark this settlement as paid in cash.' });
        }

        const manualRef = `CASH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        await query(`
            UPDATE settlements
            SET status = 'paid', settled_at = CURRENT_TIMESTAMP, related_references = $1
            WHERE id = $2
        `, [JSON.stringify({ method: 'cash', confirmedBy: req.user.id, reference: manualRef }), settlement.id]);

        await query(`
            INSERT INTO activity_logs (actor_id, action, target_record, group_id, audit_metadata)
            VALUES ($1, 'SETTLEMENT_PAID_CASH', $2, $3, $4)
        `, [req.user.id, `settlement:${settlement.id}`, settlement.group_id, JSON.stringify({ amount: settlement.amount, currency: settlement.currency })]);

        await query(`
            INSERT INTO notifications (user_id, type, title, message, action_url)
            VALUES ($1, 'SETTLEMENT_PAID', 'Settlement Marked as Paid in Cash', $2, $3)
        `, [
            req.user.id === settlement.payee_id ? settlement.payer_id : settlement.payee_id,
            `Settlement of ${settlement.currency} ${Number(settlement.amount).toFixed(2)} between ${settlement.payer_name} and ${settlement.payee_name} was marked as settled.`,
            `/#/groups/${settlement.group_id}`
        ]);

        return res.json({
            message: 'Settlement successfully marked as settled.',
            settlementId: settlement.id,
            status: 'paid'
        });
    } catch (err) {
        console.error('Cash settle error:', err);
        return res.status(500).json({ error: 'Failed to record cash settlement.' });
    }
});

module.exports = router;
