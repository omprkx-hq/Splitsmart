const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/notifications
 * Get user notifications and unread count
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const notifsRes = await query(`
            SELECT id, type, title, message, read_status, action_url, metadata, created_at
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.user.id]);

        const unreadCountRes = await query(`
            SELECT COUNT(id)::int as unread_count
            FROM notifications
            WHERE user_id = $1 AND read_status = false
        `, [req.user.id]);

        return res.json({
            notifications: notifsRes.rows,
            unreadCount: unreadCountRes.rows[0].unread_count
        });
    } catch (err) {
        console.error('Get notifications error:', err);
        return res.status(500).json({ error: 'Failed to retrieve notifications.' });
    }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notifId = parseInt(req.params.id, 10);
        await query(`
            UPDATE notifications SET read_status = true WHERE id = $1 AND user_id = $2
        `, [notifId, req.user.id]);

        return res.json({ success: true });
    } catch (err) {
        console.error('Mark read error:', err);
        return res.status(500).json({ error: 'Failed to update notification status.' });
    }
});

/**
 * PUT /api/notifications/read-all
 * Mark all user notifications as read
 */
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        await query(`
            UPDATE notifications SET read_status = true WHERE user_id = $1
        `, [req.user.id]);

        return res.json({ success: true });
    } catch (err) {
        console.error('Mark all read error:', err);
        return res.status(500).json({ error: 'Failed to update notifications.' });
    }
});

module.exports = router;
