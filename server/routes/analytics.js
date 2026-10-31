const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireGroupMembership } = require('../middleware/groupAuth');

/**
 * GET /api/analytics/dashboard
 * Aggregated dashboard metrics across all user groups
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. User groups count
        const groupsRes = await query(`
            SELECT g.id, g.currency
            FROM group_members gm
            JOIN groups g ON gm.group_id = g.id
            WHERE gm.user_id = $1 AND gm.membership_status = 'active'
        `, [userId]);

        const groupIds = groupsRes.rows.map(g => g.id);

        if (groupIds.length === 0) {
            return res.json({
                hasGroups: false,
                summary: {
                    totalSpentAcrossGroups: 0,
                    amountPaidByUser: 0,
                    amountOwedByUser: 0,
                    amountReceivableByUser: 0,
                    pendingSettlementsCount: 0,
                    pendingSettlementsSum: 0
                },
                recentExpenses: [],
                recentActivity: []
            });
        }

        const gIds = groupIds.join(',');

        // 2. Total expenses in user's groups
        const totalExpensesRes = await query(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM expenses
            WHERE group_id IN (${gIds}) AND deleted_at IS NULL
        `);

        // 3. Amount paid by user (incorporating multi-payer co-funding & single payer fallback)
        const paidByUserRes = await query(`
            SELECT COALESCE(SUM(ep.amount_paid), 0) as paid
            FROM expense_payers ep
            JOIN expenses e ON ep.expense_id = e.id
            WHERE ep.user_id = $1 AND e.group_id IN (${gIds}) AND e.deleted_at IS NULL
        `, [userId]);

        let totalPaid = Number(paidByUserRes.rows[0].paid);
        if (totalPaid === 0) {
            // Fallback for legacy single-payer rows
            const legacyPaidRes = await query(`
                SELECT COALESCE(SUM(amount), 0) as paid
                FROM expenses
                WHERE payer_id = $1 AND group_id IN (${gIds}) AND deleted_at IS NULL
            `, [userId]);
            totalPaid = Number(legacyPaidRes.rows[0].paid);
        }

        // 4. Amount user owes (their shares in active expenses)
        const userSharesRes = await query(`
            SELECT COALESCE(SUM(es.share_amount), 0) as share
            FROM expense_splits es
            JOIN expenses e ON es.expense_id = e.id
            WHERE es.participant_id = $1 AND e.group_id IN (${gIds}) AND e.deleted_at IS NULL
        `, [userId]);

        // 5. Settlements paid and received by user
        const settlementsPaidRes = await query(`
            SELECT COALESCE(SUM(amount), 0) as paid
            FROM settlements
            WHERE payer_id = $1 AND status = 'paid' AND group_id IN (${gIds}) AND deleted_at IS NULL
        `, [userId]);

        const settlementsRecvRes = await query(`
            SELECT COALESCE(SUM(amount), 0) as recv
            FROM settlements
            WHERE payee_id = $1 AND status = 'paid' AND group_id IN (${gIds}) AND deleted_at IS NULL
        `, [userId]);

        const totalShare = Number(userSharesRes.rows[0].share);
        const stPaid = Number(settlementsPaidRes.rows[0].paid);
        const stRecv = Number(settlementsRecvRes.rows[0].recv);

        const netPosition = (totalPaid - totalShare) + (stPaid - stRecv);
        const amountReceivable = netPosition > 0 ? netPosition : 0;
        const amountOwed = netPosition < 0 ? Math.abs(netPosition) : 0;

        // 6. Pending settlements
        const pendingStRes = await query(`
            SELECT COUNT(id) as count, COALESCE(SUM(amount), 0) as sum
            FROM settlements
            WHERE (payer_id = $1 OR payee_id = $1) AND status = 'pending' AND group_id IN (${gIds}) AND deleted_at IS NULL
        `, [userId]);

        // 7. Recent 5 active expenses (exclude soft-deleted)
        const recentExpensesRes = await query(`
            SELECT e.id, e.description, e.amount, e.currency, e.category, e.date, g.name as group_name, u.name as payer_name
            FROM expenses e
            JOIN groups g ON e.group_id = g.id
            JOIN users u ON e.payer_id = u.id
            WHERE e.group_id IN (${gIds}) AND e.deleted_at IS NULL
            ORDER BY e.created_at DESC LIMIT 5
        `);

        // 8. Recent 5 activity logs
        const recentActivityRes = await query(`
            SELECT al.id, al.action, al.target_record, al.timestamp, al.audit_metadata, u.name as actor_name, g.name as group_name
            FROM activity_logs al
            LEFT JOIN users u ON al.actor_id = u.id
            LEFT JOIN groups g ON al.group_id = g.id
            WHERE al.group_id IN (${gIds}) OR al.actor_id = $1
            ORDER BY al.timestamp DESC LIMIT 6
        `, [userId]);

        return res.json({
            hasGroups: true,
            summary: {
                totalSpentAcrossGroups: Number(totalExpensesRes.rows[0].total),
                amountPaidByUser: totalPaid,
                amountOwedByUser: Number(amountOwed.toFixed(2)),
                amountReceivableByUser: Number(amountReceivable.toFixed(2)),
                pendingSettlementsCount: parseInt(pendingStRes.rows[0].count, 10),
                pendingSettlementsSum: Number(pendingStRes.rows[0].sum)
            },
            recentExpenses: recentExpensesRes.rows,
            recentActivity: recentActivityRes.rows
        });
    } catch (err) {
        console.error('Dashboard analytics error:', err);
        return res.status(500).json({ error: 'Failed to retrieve dashboard metrics.' });
    }
});

/**
 * GET /api/analytics/charts/:groupId
 * Returns structured datasets for Chart.js (Categories, Trends, Member shares)
 */
router.get('/charts/:groupId', authenticateToken, requireGroupMembership, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);

        // 1. Spending by Category (Doughnut Chart)
        const categoryRes = await query(`
            SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(id) as count
            FROM expenses
            WHERE group_id = $1 AND deleted_at IS NULL
            GROUP BY category
            ORDER BY total DESC
        `, [groupId]);

        // 2. Spending Trend Over Time (Line Chart)
        const trendRes = await query(`
            SELECT date, COALESCE(SUM(amount), 0) as day_total
            FROM expenses
            WHERE group_id = $1 AND deleted_at IS NULL
            GROUP BY date
            ORDER BY date ASC
            LIMIT 30
        `, [groupId]);

        const formattedTrend = trendRes.rows.map(r => ({
            day: r.date ? (typeof r.date === 'string' ? r.date.slice(0, 10) : new Date(r.date).toISOString().slice(0, 10)) : 'Unknown',
            day_total: r.day_total
        }));

        // 3. Member contributions: Paid vs Share (Grouped Bar Chart)
        const membersRes = await query(`
            SELECT u.id, u.name
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = $1 AND gm.membership_status = 'active'
        `, [groupId]);

        const memberShares = [];
        for (const m of membersRes.rows) {
            const paidRes = await query(`
                SELECT COALESCE(SUM(amount), 0) as paid FROM expenses WHERE group_id = $1 AND payer_id = $2 AND deleted_at IS NULL
            `, [groupId, m.id]);

            const shareRes = await query(`
                SELECT COALESCE(SUM(es.share_amount), 0) as share
                FROM expense_splits es
                JOIN expenses e ON es.expense_id = e.id
                WHERE e.group_id = $1 AND es.participant_id = $2 AND e.deleted_at IS NULL
            `, [groupId, m.id]);

            memberShares.push({
                memberId: m.id,
                memberName: m.name,
                totalPaid: Number(paidRes.rows[0].paid),
                totalShare: Number(shareRes.rows[0].share)
            });
        }

        return res.json({
            categories: {
                labels: categoryRes.rows.map(r => r.category),
                data: categoryRes.rows.map(r => Number(r.total)),
                counts: categoryRes.rows.map(r => parseInt(r.count, 10))
            },
            trends: {
                labels: formattedTrend.map(r => r.day),
                data: formattedTrend.map(r => Number(r.day_total))
            },
            members: {
                labels: memberShares.map(m => m.memberName),
                paidData: memberShares.map(m => m.totalPaid),
                shareData: memberShares.map(m => m.totalShare)
            }
        });
    } catch (err) {
        console.error('Chart analytics error:', err);
        return res.status(500).json({ error: 'Failed to retrieve chart analytics.' });
    }
});

module.exports = router;
