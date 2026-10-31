const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireGroupMembership } = require('../middleware/groupAuth');
const { validateRealEmail } = require('../services/emailValidator');
const { sendMail } = require('../services/mailer');
const { getGroupInviteTemplate } = require('../services/emailTemplates');

/**
 * Intelligently resolve the public application base URL for invites and links.
 * Always prefers the active Cloudflare Tunnel, public custom domain, or request host over localhost.
 */
function resolveAppUrl(req) {
    if (process.env.PUBLIC_APP_URL && !process.env.PUBLIC_APP_URL.includes('localhost')) {
        return process.env.PUBLIC_APP_URL.trim().replace(/\/+$/, '');
    }
    if (req) {
        const forwardedHost = req.get('x-forwarded-host');
        const host = forwardedHost || req.get('host');
        const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
        if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
            return `${proto}://${host}`.replace(/\/+$/, '');
        }
        const origin = req.get('origin') || req.get('referer');
        if (origin) {
            try {
                const u = new URL(origin);
                if (!u.hostname.includes('localhost') && !u.hostname.includes('127.0.0.1')) {
                    return `${u.protocol}//${u.host}`.replace(/\/+$/, '');
                }
            } catch (_) {}
        }
    }
    if (process.env.APP_URL && !process.env.APP_URL.includes('localhost')) {
        return process.env.APP_URL.trim().replace(/\/+$/, '');
    }
    return 'https://cooler-processors-exhibition-heard.trycloudflare.com';
}

/**
 * POST /api/groups
 * Create a new expense group
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, purpose = 'General Expenses', currency = 'USD', budget = null } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Group name is required.' });
        }

        const cleanName = name.trim();
        const cleanCurrency = (currency || 'USD').trim().toUpperCase();
        const cleanBudget = budget ? Number(budget) : null;

        // Insert group
        const groupRes = await query(`
            INSERT INTO groups (name, owner_id, purpose, currency, budget)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, owner_id, purpose, currency, budget, created_at
        `, [cleanName, req.user.id, purpose, cleanCurrency, cleanBudget]);

        const group = groupRes.rows[0];

        // Add creator as owner in group_members
        await query(`
            INSERT INTO group_members (group_id, user_id, role, membership_status)
            VALUES ($1, $2, 'owner', 'active')
        `, [group.id, req.user.id]);

        // Audit log
        await query(`
            INSERT INTO activity_logs (actor_id, action, target_record, group_id, audit_metadata)
            VALUES ($1, 'GROUP_CREATED', $2, $3, $4)
        `, [req.user.id, `group:${group.id}`, group.id, JSON.stringify({ name: group.name, currency: group.currency })]);

        return res.status(201).json({
            message: 'Expense group created successfully.',
            group
        });
    } catch (err) {
        console.error('Create group error:', err);
        return res.status(500).json({ error: 'Failed to create group.' });
    }
});

/**
 * GET /api/groups
 * List all groups the current user belongs to
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const groupsRes = await query(`
            SELECT 
                g.id, g.name, g.owner_id, g.purpose, g.currency, g.budget, COALESCE(g.is_archived, false) as is_archived, g.created_at,
                gm.role, gm.joined_at, u.name as owner_name
            FROM group_members gm
            JOIN groups g ON gm.group_id = g.id
            JOIN users u ON g.owner_id = u.id
            WHERE gm.user_id = $1 AND gm.membership_status = 'active'
            ORDER BY g.created_at DESC
        `, [req.user.id]);

        const fullGroups = [];
        for (const g of groupsRes.rows) {
            const countRes = await query(`
                SELECT COUNT(user_id)::int as count FROM group_members WHERE group_id = $1 AND membership_status = 'active'
            `, [g.id]);
            const expRes = await query(`
                SELECT COALESCE(SUM(amount), 0)::numeric as total FROM expenses WHERE group_id = $1 AND deleted_at IS NULL
            `, [g.id]);

            fullGroups.push({
                ...g,
                member_count: parseInt(countRes.rows[0]?.count || 1, 10),
                total_expenses: Number(expRes.rows[0]?.total || 0)
            });
        }

        return res.json({
            groups: fullGroups
        });
    } catch (err) {
        console.error('List groups error:', err);
        return res.status(500).json({ error: 'Failed to retrieve groups.' });
    }
});

/**
 * GET /api/groups/invitations/all
 * List all active pending invitations sent from user's groups
 */
router.get('/invitations/all', authenticateToken, async (req, res) => {
    try {
        const appUrl = resolveAppUrl(req);
        const result = await query(`
            SELECT 
                gi.id, gi.group_id, gi.invitee_email, gi.token, gi.expires_at, gi.created_at, gi.status,
                g.name as group_name, g.currency as group_currency
            FROM group_invitations gi
            JOIN groups g ON gi.group_id = g.id
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = $1 AND gi.status = 'pending' AND gi.expires_at > NOW()
            ORDER BY gi.created_at DESC
        `, [req.user.id]);

        const invitations = result.rows.map(inv => ({
            id: inv.id,
            groupId: inv.group_id,
            groupName: inv.group_name,
            groupCurrency: inv.group_currency,
            email: inv.invitee_email,
            expiresAt: inv.expires_at,
            createdAt: inv.created_at,
            inviteUrl: `${appUrl}/#/invite/accept?token=${inv.token}`
        }));

        return res.json({ invitations });
    } catch (err) {
        console.error('Fetch all invitations error:', err);
        return res.status(500).json({ error: 'Failed to fetch invitations.' });
    }
});

/**
 * GET /api/groups/:groupId
 * Get details, members, and high-level stats for a specific group
 */
router.get('/:groupId', authenticateToken, requireGroupMembership, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);

        // Fetch group info
        const groupRes = await query(`
            SELECT g.id, g.name, g.owner_id, g.purpose, g.currency, g.budget, COALESCE(g.simplify_debts, true) as simplify_debts, COALESCE(g.is_archived, false) as is_archived, g.created_at, u.name as owner_name, u.email as owner_email
            FROM groups g
            JOIN users u ON g.owner_id = u.id
            WHERE g.id = $1
        `, [groupId]);

        if (groupRes.rows.length === 0) {
            return res.status(404).json({ error: 'Group not found.' });
        }

        const group = groupRes.rows[0];

        // Fetch members
        const membersRes = await query(`
            SELECT u.id, u.name, u.email, gm.role, gm.joined_at, gm.membership_status
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = $1 AND gm.membership_status = 'active'
            ORDER BY gm.role = 'owner' DESC, u.name ASC
        `, [groupId]);

        // Fetch spending summary (active non-deleted expenses only)
        const statsRes = await query(`
            SELECT 
                COALESCE(SUM(amount), 0)::numeric as total_spent,
                COUNT(id)::int as total_expense_count
            FROM expenses WHERE group_id = $1 AND deleted_at IS NULL
        `, [groupId]);

        // Pending settlements count
        const settlementsRes = await query(`
            SELECT COUNT(id)::int as pending_settlements_count, COALESCE(SUM(amount), 0)::numeric as pending_settlement_sum
            FROM settlements WHERE group_id = $1 AND status = 'pending' AND deleted_at IS NULL
        `, [groupId]);

        // Pending Invitations
        const appUrl = resolveAppUrl(req);
        const pendingInvitesRes = await query(`
            SELECT id, invitee_email, token, expires_at, created_at, status
            FROM group_invitations
            WHERE group_id = $1 AND status = 'pending' AND expires_at > NOW()
            ORDER BY created_at DESC
        `, [groupId]);

        const pendingInvitations = pendingInvitesRes.rows.map(inv => ({
            id: inv.id,
            email: inv.invitee_email,
            expiresAt: inv.expires_at,
            createdAt: inv.created_at,
            inviteUrl: `${appUrl}/#/invite/accept?token=${inv.token}`
        }));

        return res.json({
            group,
            members: membersRes.rows,
            pendingInvitations,
            stats: {
                totalSpent: Number(statsRes.rows[0].total_spent),
                expenseCount: statsRes.rows[0].total_expense_count,
                pendingSettlementsCount: settlementsRes.rows[0].pending_settlements_count,
                pendingSettlementSum: Number(settlementsRes.rows[0].pending_settlement_sum)
            }
        });
    } catch (err) {
        console.error('Get group details error:', err);
        return res.status(500).json({ error: 'Failed to retrieve group details.' });
    }
});

/**
 * PATCH /api/groups/:groupId/settings
 * Update group settings such as simplify_debts, budget, or name
 */
router.patch('/:groupId/settings', authenticateToken, requireGroupMembership, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);
        const { simplifyDebts, budget, name } = req.body;

        const updates = [];
        const values = [];
        let pIdx = 1;

        if (simplifyDebts !== undefined) {
            updates.push(`simplify_debts = $${pIdx++}`);
            values.push(Boolean(simplifyDebts));
        }
        if (budget !== undefined) {
            updates.push(`budget = $${pIdx++}`);
            values.push(budget ? Number(budget) : null);
        }
        if (name && name.trim()) {
            updates.push(`name = $${pIdx++}`);
            values.push(name.trim());
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid setting updates provided.' });
        }

        values.push(groupId);
        const updateSql = `UPDATE groups SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${pIdx} RETURNING id, name, currency, budget, simplify_debts`;
        const updatedRes = await query(updateSql, values);

        return res.json({
            message: 'Group settings updated successfully.',
            group: updatedRes.rows[0]
        });
    } catch (err) {
        console.error('Update group settings error:', err);
        return res.status(500).json({ error: 'Failed to update group settings.' });
    }
});

/**
 * POST /api/groups/:groupId/invite
 * Invites a user via real email with MX validation and signed acceptance token
 */
router.post('/:groupId/invite', authenticateToken, requireGroupMembership, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Invitee email address is required.' });
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

        // 2. Fetch group info
        const groupRes = await query('SELECT name, currency FROM groups WHERE id = $1', [groupId]);
        const group = groupRes.rows[0];

        // 3. Check if user is already a member
        const existingMember = await query(`
            SELECT gm.user_id 
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = $1 AND u.email = $2 AND gm.membership_status = 'active'
        `, [groupId, normalizedEmail]);

        if (existingMember.rows.length > 0) {
            return res.status(400).json({
                error: 'ALREADY_MEMBER',
                message: 'This user is already an active member of this group.'
            });
        }

        // 4. Generate cryptographic token and 7-day expiration
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Save invitation record
        const invRes = await query(`
            INSERT INTO group_invitations (group_id, inviter_id, invitee_email, token, expires_at, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING id, group_id, invitee_email, token, expires_at, created_at
        `, [groupId, req.user.id, normalizedEmail, token, expiresAt]);

        const invitation = invRes.rows[0];

        // 5. Construct Invitation URL
        const appUrl = resolveAppUrl(req);
        const inviteUrl = `${appUrl}/#/invite/accept?token=${token}`;
        const shortInviteUrl = `${appUrl}/s/inv_${token}`;

        // 6. Send Invitation Email
        const htmlContent = getGroupInviteTemplate({
            inviterName: req.user.name,
            groupName: group.name,
            inviteUrl,
            expiresDays: 7
        });

        let isRealDelivery = false;
        let isVirtualPreview = false;
        let previewUrl = null;
        let isSandboxRestricted = false;
        let deliveryNotice = '';
        try {
            const mailResult = await sendMail({
                to: normalizedEmail,
                subject: `SplitSmart - ${req.user.name} invited you to join ${group.name}`,
                html: htmlContent
            });
            isRealDelivery = Boolean(mailResult && mailResult.isRealDelivery);
            isVirtualPreview = Boolean(mailResult && mailResult.isVirtualPreview);
            previewUrl = mailResult?.previewUrl || null;
            isSandboxRestricted = Boolean(mailResult && mailResult.isSandboxRestricted);
            if (!isRealDelivery && mailResult?.error) {
                deliveryNotice = mailResult.error;
            }
        } catch (mailErr) {
            console.warn('[INVITE] Email dispatch error:', mailErr.message);
            isRealDelivery = false;
            deliveryNotice = mailErr.message;
        }

        // Log audit trail
        await query(`
            INSERT INTO activity_logs (actor_id, action, target_record, group_id, audit_metadata)
            VALUES ($1, 'GROUP_INVITE_SENT', $2, $3, $4)
        `, [req.user.id, `invite:${invitation.id}`, groupId, JSON.stringify({ inviteeEmail: normalizedEmail, isRealDelivery, isVirtualPreview })]);

        return res.status(201).json({
            isRealDelivery,
            isVirtualPreview,
            previewUrl,
            isSandboxRestricted,
            deliveryNotice,
            message: isRealDelivery
                ? `Invitation email successfully delivered to ${normalizedEmail}!`
                : `Invitation link generated! You can copy and share it directly below.`,
            invitation: {
                id: invitation.id,
                email: normalizedEmail,
                expiresAt: invitation.expires_at,
                inviteUrl,
                shortInviteUrl,
                token
            }
        });
    } catch (err) {
        console.error('Invite member error:', err);
        return res.status(500).json({ error: 'Failed to process group invitation.' });
    }
});

/**
 * DELETE /api/groups/:groupId/invitations/:inviteId
 * Cancels a pending invitation
 */
router.delete('/:groupId/invitations/:inviteId', authenticateToken, requireGroupMembership, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);
        const inviteId = parseInt(req.params.inviteId, 10);

        await query('DELETE FROM group_invitations WHERE id = $1 AND group_id = $2', [inviteId, groupId]);
        return res.json({ message: 'Invitation cancelled.' });
    } catch (err) {
        console.error('Cancel invitation error:', err);
        return res.status(500).json({ error: 'Failed to cancel invitation.' });
    }
});

/**
 * GET /api/groups/invitations/preview/:token
 * Public endpoint to inspect invitation details before accepting (no login required)
 */
router.get('/invitations/preview/:token', async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ error: 'Invitation token is required.' });
        }

        const invRes = await query(`
            SELECT gi.id, gi.group_id, gi.inviter_id, gi.invitee_email, gi.status, gi.expires_at,
                   g.name as group_name, g.purpose as group_purpose, g.currency as group_currency, g.owner_id,
                   u.name as inviter_name, u.email as inviter_email
            FROM group_invitations gi
            JOIN groups g ON gi.group_id = g.id
            LEFT JOIN users u ON gi.inviter_id = u.id
            WHERE gi.token = $1
        `, [token]);

        if (invRes.rows.length === 0) {
            return res.status(404).json({
                error: 'INVITATION_NOT_FOUND',
                message: 'This invitation link is invalid or has expired.'
            });
        }

        const inv = invRes.rows[0];
        const isExpired = new Date() > new Date(inv.expires_at);

        return res.json({
            valid: !isExpired && inv.status === 'pending',
            id: inv.id,
            groupId: inv.group_id,
            groupName: inv.group_name,
            groupPurpose: inv.group_purpose,
            groupCurrency: inv.group_currency,
            ownerId: inv.owner_id,
            inviterName: inv.inviter_name || 'Group Member',
            inviteeEmail: inv.invitee_email,
            status: isExpired ? 'expired' : inv.status,
            expiresAt: inv.expires_at
        });
    } catch (err) {
        console.error('Preview invitation error:', err);
        return res.status(500).json({ error: 'Failed to inspect invitation.' });
    }
});

/**
 * POST /api/groups/invitations/accept
 * Accepts an invitation token and links the authenticated user to group_members.
 * PRESERVES group owner/admin roles - never demotes the group creator!
 */
router.post('/invitations/accept', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Invitation token is required.' });
        }

        // 1. Find invitation and group
        const invRes = await query(`
            SELECT gi.id, gi.group_id, gi.inviter_id, gi.invitee_email, gi.status, gi.expires_at,
                   g.name as group_name, g.owner_id
            FROM group_invitations gi
            JOIN groups g ON gi.group_id = g.id
            WHERE gi.token = $1
        `, [token]);

        if (invRes.rows.length === 0) {
            return res.status(404).json({
                error: 'INVITATION_NOT_FOUND',
                message: 'This invitation token is invalid or has expired.'
            });
        }

        const invitation = invRes.rows[0];

        // 2. SAFETY CHECK: Is current authenticated user the GROUP OWNER?
        if (invitation.owner_id === req.user.id) {
            // Group owner opened their own invite. NEVER downgrade or alter owner role!
            // Ensure owner is recorded as 'owner' in group_members
            await query(`
                INSERT INTO group_members (group_id, user_id, role, membership_status)
                VALUES ($1, $2, 'owner', 'active')
                ON CONFLICT (group_id, user_id) 
                DO UPDATE SET membership_status = 'active', role = 'owner'
            `, [invitation.group_id, req.user.id]);

            return res.json({
                message: `You are the owner and administrator of ${invitation.group_name}. Welcome back!`,
                groupId: invitation.group_id,
                groupName: invitation.group_name,
                isOwner: true
            });
        }

        // 3. Check invitation status
        if (invitation.status !== 'pending') {
            // Check if user is already a member
            const memberCheck = await query(`
                SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2
            `, [invitation.group_id, req.user.id]);

            if (memberCheck.rows.length > 0) {
                return res.json({
                    message: `You are already a member of ${invitation.group_name}!`,
                    groupId: invitation.group_id,
                    groupName: invitation.group_name,
                    role: memberCheck.rows[0].role
                });
            }

            return res.status(400).json({
                error: 'INVITATION_ALREADY_USED',
                message: `This invitation has already been ${invitation.status}.`
            });
        }

        if (new Date() > new Date(invitation.expires_at)) {
            await query("UPDATE group_invitations SET status = 'expired' WHERE id = $1", [invitation.id]);
            return res.status(400).json({
                error: 'INVITATION_EXPIRED',
                message: 'This invitation has expired. Please ask the group administrator for a new invite.'
            });
        }

        // 4. Check if user already has an existing membership in this group
        const existingMember = await query(`
            SELECT role, membership_status FROM group_members WHERE group_id = $1 AND user_id = $2
        `, [invitation.group_id, req.user.id]);

        if (existingMember.rows.length > 0) {
            const currentRole = existingMember.rows[0].role;
            // NEVER demote an existing owner or admin!
            const preservedRole = (currentRole === 'owner' || currentRole === 'admin') ? currentRole : 'member';

            await query(`
                UPDATE group_members 
                SET membership_status = 'active', role = $1 
                WHERE group_id = $2 AND user_id = $3
            `, [preservedRole, invitation.group_id, req.user.id]);
        } else {
            // Brand new member joining
            await query(`
                INSERT INTO group_members (group_id, user_id, role, membership_status)
                VALUES ($1, $2, 'member', 'active')
            `, [invitation.group_id, req.user.id]);
        }

        // 5. Mark invitation accepted
        await query(`
            UPDATE group_invitations 
            SET status = 'accepted'
            WHERE id = $1
        `, [invitation.id]);

        // 6. Notify inviter
        if (invitation.inviter_id && invitation.inviter_id !== req.user.id) {
            await query(`
                INSERT INTO notifications (user_id, type, title, message, action_url)
                VALUES ($1, 'INVITE_ACCEPTED', 'Invitation Accepted', $2, $3)
            `, [invitation.inviter_id, `${req.user.name} accepted your invitation to join ${invitation.group_name}.`, `/#/groups/${invitation.group_id}`]);
        }

        // Log activity
        await query(`
            INSERT INTO activity_logs (actor_id, action, target_record, group_id, audit_metadata)
            VALUES ($1, 'GROUP_INVITE_ACCEPTED', $2, $3, $4)
        `, [req.user.id, `group:${invitation.group_id}`, invitation.group_id, JSON.stringify({ inviterId: invitation.inviter_id })]);

        return res.json({
            message: `You have successfully joined ${invitation.group_name}!`,
            groupId: invitation.group_id,
            groupName: invitation.group_name
        });
    } catch (err) {
        console.error('Accept invitation error:', err);
        return res.status(500).json({ error: 'Failed to accept invitation.' });
    }
});

/**
 * DELETE /api/groups/:groupId
 * Permanently deletes an expense group and all associated data
 * Restricted to group owner
 */
router.delete('/:groupId', authenticateToken, requireGroupMembership, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);

        if (req.groupRole !== 'owner' && req.group.owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the group owner has permission to delete this group.' });
        }

        const groupName = req.group.group_name || 'Expense Group';

        // Log deletion in audit activity logs
        await query(`
            INSERT INTO activity_logs (actor_id, action, target_record, group_id, audit_metadata)
            VALUES ($1, 'GROUP_DELETED', $2, $3, $4)
        `, [req.user.id, `group:${groupId}`, groupId, JSON.stringify({ name: groupName })]);

        // Cascading deletion removes group_members, expenses, settlements, expense_splits, etc.
        await query('DELETE FROM groups WHERE id = $1', [groupId]);

        return res.json({
            message: `Group "${groupName}" and all associated records have been permanently deleted.`,
            groupId
        });
    } catch (err) {
        console.error('Delete group error:', err);
        return res.status(500).json({ error: 'Failed to delete group.' });
    }
});

/**
 * POST /api/groups/:groupId/archive
 * Toggles archival status of a settled or completed group
 * Preserves all financial history and tabular ledgers in read-only mode
 */
router.post('/:groupId/archive', authenticateToken, requireGroupMembership, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);
        const { archived = true } = req.body;

        if (req.groupRole !== 'owner' && req.groupRole !== 'admin') {
            return res.status(403).json({ error: 'Only group owners and admins can archive or unarchive this group.' });
        }

        const groupName = req.group.group_name || 'Expense Group';
        const isArchived = Boolean(archived);

        await query(`
            UPDATE groups 
            SET is_archived = $1, updated_at = NOW()
            WHERE id = $2
        `, [isArchived, groupId]);

        // Audit log
        await query(`
            INSERT INTO activity_logs (actor_id, action, target_record, group_id, audit_metadata)
            VALUES ($1, $2, $3, $4, $5)
        `, [req.user.id, isArchived ? 'GROUP_ARCHIVED' : 'GROUP_UNARCHIVED', `group:${groupId}`, groupId, JSON.stringify({ name: groupName })]);

        return res.json({
            message: isArchived
                ? `Group "${groupName}" has been safely archived. All itemized bills, receipts, and audit history are permanently preserved.`
                : `Group "${groupName}" has been unarchived and reactivated for new expenses.`,
            groupId,
            isArchived
        });
    } catch (err) {
        console.error('Archive group error:', err);
        return res.status(500).json({ error: 'Failed to archive group.' });
    }
});

/**
 * POST /api/groups/:groupId/leave
 * Allows an active non-owner member to leave a settled group
 */
router.post('/:groupId/leave', authenticateToken, requireGroupMembership, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);

        if (req.groupRole === 'owner') {
            return res.status(400).json({ error: 'Group owners cannot leave their own group. You may archive or delete the group instead.' });
        }

        const groupName = req.group.group_name || 'Expense Group';

        await query(`
            DELETE FROM group_members 
            WHERE group_id = $1 AND user_id = $2
        `, [groupId, req.user.id]);

        await query(`
            INSERT INTO activity_logs (actor_id, action, target_record, group_id, audit_metadata)
            VALUES ($1, 'MEMBER_LEFT', $2, $3, $4)
        `, [req.user.id, `user:${req.user.id}`, groupId, JSON.stringify({ userName: req.user.name, groupName })]);

        return res.json({
            message: `You have successfully left "${groupName}".`,
            groupId
        });
    } catch (err) {
        console.error('Leave group error:', err);
        return res.status(500).json({ error: 'Failed to leave group.' });
    }
});

module.exports = router;
