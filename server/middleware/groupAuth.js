const { query } = require('../db');

/**
 * Validates that req.user is a verified active member of the specified group
 */
async function requireGroupMembership(req, res, next) {
    const groupId = req.params.groupId || req.body.groupId || req.query.groupId;

    if (!groupId) {
        return res.status(400).json({ error: 'Group ID is required.' });
    }

    try {
        const check = await query(`
            SELECT gm.role, gm.membership_status, g.name as group_name, g.currency, g.owner_id
            FROM group_members gm
            JOIN groups g ON gm.group_id = g.id
            WHERE gm.group_id = $1 AND gm.user_id = $2 AND gm.membership_status = 'active'
        `, [groupId, req.user.id]);

        if (check.rows.length === 0) {
            return res.status(403).json({
                error: 'FORBIDDEN_GROUP_ACCESS',
                message: 'You do not have active access permissions for this expense group.'
            });
        }

        req.groupRole = check.rows[0].role;
        req.group = check.rows[0];
        next();
    } catch (err) {
        console.error('Group membership check error:', err.message);
        return res.status(500).json({ error: 'Failed to authorize group access.' });
    }
}

module.exports = {
    requireGroupMembership
};
