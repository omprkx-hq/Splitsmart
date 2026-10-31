const express = require('express');
const router = express.Router();
const { query, getClient } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireGroupMembership } = require('../middleware/groupAuth');
const { calculateDeterministicSplits } = require('../services/settlementOptimizer');
const { sendMail } = require('../services/mailer');
const { getReceiptEmailTemplate } = require('../services/emailTemplates');

/**
 * POST /api/expenses
 * Create an expense with deterministic itemized splits and email receipts.
 * Supports single payer or multi-payer co-funded expenses.
 */
router.post('/', authenticateToken, async (req, res) => {
    const {
        groupId,
        description,
        amount,
        currency = 'USD',
        payerId,
        payers = [], // Optional Array of { userId, amount } for multi-payer co-funding
        splitMethod = 'EQUAL',
        category = 'General',
        date = new Date().toISOString().slice(0, 10),
        receiptUrl = null,
        notes = null,
        participants = [] // Array of { userId, shareAmount?, percentage?, shares?, adjustment? }
    } = req.body;

    const normalizedSplitMethod = (splitMethod || 'EQUAL').toUpperCase();

    if (!groupId || !description || !amount) {
        return res.status(400).json({ error: 'Group ID, description, and amount are required.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    if (!participants || participants.length === 0) {
        return res.status(400).json({ error: 'At least one participant must be selected for the split.' });
    }

    const totalCents = Math.round(numericAmount * 100);

    // 1. Resolve payers (Multi-payer co-funding or single payer fallback)
    let resolvedPayers = [];
    if (Array.isArray(payers) && payers.length > 0) {
        let sumPayerCents = 0;
        for (const p of payers) {
            const pAmt = parseFloat(p.amount);
            if (isNaN(pAmt) || pAmt <= 0) {
                return res.status(400).json({ error: `Invalid paid amount for payer user ${p.userId}.` });
            }
            const pCents = Math.round(pAmt * 100);
            sumPayerCents += pCents;
            resolvedPayers.push({
                userId: p.userId,
                amount: pAmt,
                cents: pCents
            });
        }

        if (sumPayerCents !== totalCents) {
            return res.status(400).json({
                error: 'PAYER_AMOUNT_MISMATCH',
                message: `Sum of co-payer contributions (${(sumPayerCents / 100).toFixed(2)}) must exactly equal the total expense amount (${numericAmount.toFixed(2)}).`
            });
        }
    } else if (payerId) {
        resolvedPayers = [{
            userId: payerId,
            amount: numericAmount,
            cents: totalCents
        }];
    } else {
        return res.status(400).json({ error: 'At least one payer must be specified.' });
    }

    const primaryPayerId = resolvedPayers[0].userId;
    const payerUserIds = resolvedPayers.map(p => p.userId);

    // 2. Verify group membership of creator and all payers
    const allUsersToCheck = Array.from(new Set([req.user.id, ...payerUserIds]));
    const placeholders = allUsersToCheck.map((_, i) => `$${i + 2}`).join(',');
    const membershipCheck = await query(`
        SELECT user_id FROM group_members 
        WHERE group_id = $1 AND user_id IN (${placeholders}) AND membership_status = 'active'
    `, [groupId, ...allUsersToCheck]);

    const activeMemberIds = new Set(membershipCheck.rows.map(r => r.user_id));
    if (!activeMemberIds.has(req.user.id)) {
        return res.status(403).json({ error: 'You are not an active authorized member of this group.' });
    }
    for (const p of resolvedPayers) {
        if (!activeMemberIds.has(p.userId)) {
            return res.status(400).json({ error: `Payer ID ${p.userId} is not an active member of this group.` });
        }
    }

    // 3. Compute deterministic splits
    const splitCalculation = calculateDeterministicSplits(numericAmount, normalizedSplitMethod, participants);
    if (!splitCalculation.valid) {
        return res.status(400).json({
            error: 'SPLIT_CALCULATION_ERROR',
            message: splitCalculation.error
        });
    }

    const splitsToSave = splitCalculation.splits;

    // 4. PostgreSQL Transaction for safe atomic insertion
    const client = await getClient();
    try {
        await client.query('BEGIN');

        // Insert Expense
        const expenseRes = await client.query(`
            INSERT INTO expenses (group_id, description, amount, currency, payer_id, creator_id, split_method, category, date, receipt_url, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, group_id, description, amount, currency, payer_id, split_method, category, date, receipt_url, created_at
        `, [groupId, description.trim(), numericAmount, currency.trim().toUpperCase(), primaryPayerId, req.user.id, normalizedSplitMethod, category, date, receiptUrl, notes]);

        const newExpense = expenseRes.rows[0];

        // Insert co-funding payers into expense_payers table
        for (const p of resolvedPayers) {
            await client.query(`
                INSERT INTO expense_payers (expense_id, user_id, amount_paid)
                VALUES ($1, $2, $3)
            `, [newExpense.id, p.userId, p.amount]);
        }

        // Insert itemized splits
        for (const s of splitsToSave) {
            await client.query(`
                INSERT INTO expense_splits (expense_id, participant_id, share_amount, percentage)
                VALUES ($1, $2, $3, $4)
            `, [newExpense.id, s.userId, s.shareAmount, s.percentage || null]);
        }

        // Audit Log
        await client.query(`
            INSERT INTO activity_logs (actor_id, action, target_record, group_id, audit_metadata)
            VALUES ($1, 'EXPENSE_RECORDED', $2, $3, $4)
        `, [req.user.id, `expense:${newExpense.id}`, groupId, JSON.stringify({ description, amount: numericAmount, splitMethod, payersCount: resolvedPayers.length })]);

        await client.query('COMMIT');

        // 5. Send notifications and Formatted HTML Receipts
        const groupInfo = await query('SELECT name, currency FROM groups WHERE id = $1', [groupId]);
        const payerInfo = await query('SELECT name, email FROM users WHERE id = $1', [primaryPayerId]);
        const participantsRes = await query(`
            SELECT u.id, u.name, u.email, es.share_amount, es.percentage
            FROM expense_splits es
            JOIN users u ON es.participant_id = u.id
            WHERE es.expense_id = $1
        `, [newExpense.id]);

        const groupName = groupInfo.rows[0]?.name || 'Group';
        const payerName = resolvedPayers.length > 1 ? `${payerInfo.rows[0]?.name || 'Member'} + ${resolvedPayers.length - 1} co-payers` : (payerInfo.rows[0]?.name || 'Member');

        const splitRowsForEmail = participantsRes.rows.map(p => ({
            participant_name: p.name,
            participant_email: p.email,
            split_method: splitMethod,
            share_amount: p.share_amount
        }));

        const appUrl = process.env.APP_URL || 'http://localhost:5000';
        const dashboardUrl = `${appUrl}/#/groups/${groupId}`;

        for (const p of participantsRes.rows) {
            if (p.id !== req.user.id) {
                await query(`
                    INSERT INTO notifications (user_id, type, title, message, action_url)
                    VALUES ($1, 'EXPENSE_ADDED', 'New Expense Recorded', $2, $3)
                `, [p.id, `${payerName} recorded "${description}" for ${currency} ${numericAmount.toFixed(2)} in ${groupName}. Your share is ${currency} ${Number(p.share_amount).toFixed(2)}.`, `/#/groups/${groupId}`]);
            }

            try {
                const receiptHtml = getReceiptEmailTemplate({
                    receiptId: `EXP-${newExpense.id}`,
                    title: 'New Shared Expense Recorded',
                    groupName,
                    description,
                    category,
                    currency,
                    totalAmount: numericAmount,
                    payerName,
                    isSettlement: false,
                    splits: splitRowsForEmail,
                    recipientNetBalance: null,
                    dashboardUrl
                });

                await sendMail({
                    to: p.email,
                    subject: `SplitSmart AI Receipt: ${description} (${currency} ${numericAmount.toFixed(2)})`,
                    html: receiptHtml
                });
            } catch (mailErr) {
                console.warn(`Receipt email dispatch failed for ${p.email}:`, mailErr.message);
            }
        }

        return res.status(201).json({
            message: 'Expense successfully recorded and itemized receipts dispatched.',
            expense: newExpense,
            payers: resolvedPayers,
            splits: splitsToSave
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating expense:', err);
        return res.status(500).json({ error: 'Failed to record expense transaction.' });
    } finally {
        client.release();
    }
});

/**
 * GET /api/expenses/group/:groupId
 * Retrieve all active expenses for a group with itemized participant splits and co-funding payers
 */
router.get('/group/:groupId', authenticateToken, requireGroupMembership, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);

        const expensesRes = await query(`
            SELECT 
                e.id, e.group_id, e.description, e.amount, e.currency, e.payer_id, e.split_method,
                e.category, e.date, e.receipt_url, e.notes, e.created_at,
                u.name as payer_name, u.email as payer_email,
                c.name as creator_name
            FROM expenses e
            JOIN users u ON e.payer_id = u.id
            LEFT JOIN users c ON e.creator_id = c.id
            WHERE e.group_id = $1 AND e.deleted_at IS NULL
            ORDER BY e.date DESC, e.created_at DESC
        `, [groupId]);

        const expenseIds = expensesRes.rows.map(e => e.id);

        let splitsByExpense = {};
        let payersByExpense = {};

        if (expenseIds.length > 0) {
            const inPlaceholders = expenseIds.map((_, idx) => `$${idx + 1}`).join(',');
            
            // Fetch itemized splits
            const splitsRes = await query(`
                SELECT 
                    es.id, es.expense_id, es.participant_id, es.share_amount, es.percentage,
                    u.name as participant_name, u.email as participant_email
                FROM expense_splits es
                JOIN users u ON es.participant_id = u.id
                WHERE es.expense_id IN (${inPlaceholders})
            `, expenseIds);

            splitsRes.rows.forEach(s => {
                if (!splitsByExpense[s.expense_id]) splitsByExpense[s.expense_id] = [];
                splitsByExpense[s.expense_id].push(s);
            });

            // Fetch co-funding payers
            const payersRes = await query(`
                SELECT 
                    ep.id, ep.expense_id, ep.user_id, ep.amount_paid,
                    u.name as user_name, u.email as user_email
                FROM expense_payers ep
                JOIN users u ON ep.user_id = u.id
                WHERE ep.expense_id IN (${inPlaceholders})
            `, expenseIds);

            payersRes.rows.forEach(p => {
                if (!payersByExpense[p.expense_id]) payersByExpense[p.expense_id] = [];
                payersByExpense[p.expense_id].push({
                    userId: p.user_id,
                    name: p.user_name,
                    email: p.user_email,
                    amountPaid: Number(p.amount_paid)
                });
            });
        }

        const fullExpenses = expensesRes.rows.map(e => {
            const expensePayers = payersByExpense[e.id] && payersByExpense[e.id].length > 0
                ? payersByExpense[e.id]
                : [{ userId: e.payer_id, name: e.payer_name, email: e.payer_email, amountPaid: Number(e.amount) }];

            return {
                ...e,
                amount: Number(e.amount),
                payers: expensePayers,
                splits: splitsByExpense[e.id] || []
            };
        });

        return res.json({
            expenses: fullExpenses
        });
    } catch (err) {
        console.error('Get group expenses error:', err);
        return res.status(500).json({ error: 'Failed to retrieve expenses.' });
    }
});

/**
 * DELETE /api/expenses/:id
 * Soft delete an expense with immutable audit log preservation
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const expenseId = parseInt(req.params.id, 10);

        const expRes = await query(`
            SELECT e.id, e.group_id, e.payer_id, e.creator_id, g.owner_id
            FROM expenses e
            JOIN groups g ON e.group_id = g.id
            WHERE e.id = $1 AND e.deleted_at IS NULL
        `, [expenseId]);

        if (expRes.rows.length === 0) {
            return res.status(404).json({ error: 'Expense record not found or already deleted.' });
        }

        const expense = expRes.rows[0];

        // Authorization check: must be payer, creator, or group owner
        if (expense.payer_id !== req.user.id && expense.creator_id !== req.user.id && expense.owner_id !== req.user.id) {
            return res.status(403).json({ error: 'You are not authorized to delete this expense record.' });
        }

        // Soft delete preserving immutable audit ledger
        await query('UPDATE expenses SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [expenseId]);

        await query(`
            INSERT INTO activity_logs (actor_id, action, target_record, group_id)
            VALUES ($1, 'EXPENSE_SOFT_DELETED', $2, $3)
        `, [req.user.id, `expense:${expenseId}`, expense.group_id]);

        return res.json({ message: 'Expense record soft-deleted successfully.' });
    } catch (err) {
        console.error('Delete expense error:', err);
        return res.status(500).json({ error: 'Failed to delete expense record.' });
    }
});

module.exports = router;
