const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/activity
 * Search and filter complete transaction history and audit trail
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { groupId, category, search, limit = 50, offset = 0 } = req.query;

        // Fetch user groups
        const userGroups = await query(`
            SELECT group_id FROM group_members WHERE user_id = $1 AND membership_status = 'active'
        `, [userId]);

        const groupIds = userGroups.rows.map(g => g.group_id);

        if (groupIds.length === 0) {
            return res.json({ transactions: [], total: 0 });
        }

        const gIds = groupIds.join(',');

        // Build filtered query on active non-deleted expenses
        let filterConditions = [`e.group_id IN (${gIds})`, `e.deleted_at IS NULL`];
        let params = [];
        let pIdx = 1;

        if (groupId) {
            filterConditions.push(`e.group_id = $${pIdx++}`);
            params.push(parseInt(groupId, 10));
        }

        if (category && category !== 'ALL') {
            filterConditions.push(`e.category = $${pIdx++}`);
            params.push(category);
        }

        if (search && search.trim()) {
            filterConditions.push(`(e.description ILIKE $${pIdx} OR u.name ILIKE $${pIdx})`);
            params.push(`%${search.trim()}%`);
            pIdx++;
        }

        const sql = `
            SELECT 
                e.id, e.group_id, e.description, e.amount, e.currency, e.category, e.date, e.split_method, e.receipt_url, e.created_at,
                g.name as group_name,
                u.name as payer_name, u.email as payer_email
            FROM expenses e
            JOIN groups g ON e.group_id = g.id
            JOIN users u ON e.payer_id = u.id
            WHERE ${filterConditions.join(' AND ')}
            ORDER BY e.date DESC, e.created_at DESC
            LIMIT $${pIdx++} OFFSET $${pIdx++}
        `;

        params.push(parseInt(limit, 10), parseInt(offset, 10));

        const result = await query(sql, params);

        return res.json({
            transactions: result.rows
        });
    } catch (err) {
        console.error('Get transaction history error:', err);
        return res.status(500).json({ error: 'Failed to retrieve transaction history.' });
    }
});

module.exports = router;
