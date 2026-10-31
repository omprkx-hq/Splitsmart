/**
 * View 12: In-App Notifications Center
 */

let notificationsState = {
  notifications: [],
  unreadCount: 0
};

async function renderNotificationsView() {
  const content = document.getElementById('app-content');
  if (!content) return;

  content.innerHTML = `
      <div style="text-align: center; padding: 48px 0; color: #64748B;">
        Loading notifications...
      </div>
    `;

  try {
    const res = await API.get('/notifications');
    notificationsState.notifications = res.notifications || [];
    notificationsState.unreadCount = res.unreadCount || 0;
    AppState.setUnreadNotifications(notificationsState.unreadCount);

    renderNotificationsUI();
  } catch (err) {
    content.innerHTML = `
          <div class="card" style="padding: 32px; text-align: center;">
            <p style="color: #DC2626;">${err.message}</p>
          </div>
        `;
  }
}

function renderNotificationsUI() {
  const content = document.getElementById('app-content');
  if (!content) return;

  const list = notificationsState.notifications;

  content.innerHTML = `
      <div style="max-width: 680px; margin: 0 auto;">
        
        <div class="page-header" style="margin-bottom: 20px;">
          <div>
            <h1 class="page-title">Notification Center</h1>
            <p class="page-subtitle">Real-time alerts for expenses, invitations, and verified payments.</p>
          </div>
          ${notificationsState.unreadCount > 0 ? `
            <button class="btn btn-secondary btn-sm" onclick="handleMarkAllRead()">
              Mark All as Read
            </button>
          ` : ''}
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Activity Feed</span>
            <span class="badge ${notificationsState.unreadCount > 0 ? 'badge-red' : 'badge-green'}">
              ${notificationsState.unreadCount} Unread
            </span>
          </div>

          <div class="card-body" style="padding: 0;">
            ${list.length === 0 ? `
              <div style="padding: 48px; text-align: center; color: var(--text-muted);">
                <div style="margin-bottom: 8px; color: var(--text-muted);">${Icons.bell(32)}</div>
                <h4 style="font-size: 16px; color: var(--text-primary); margin-bottom: 4px;">No notifications yet</h4>
                <p style="font-size: 13px;">You are completely caught up.</p>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column;">
                ${list.map(n => `
                  <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); background: ${n.read_status ? 'var(--bg-surface)' : 'var(--bg-muted)'}; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        ${!n.read_status ? '<span style="width: 8px; height: 8px; border-radius: 9999px; background: var(--accent-emerald);"></span>' : ''}
                        <strong style="font-size: 14px; color: var(--text-primary);">${n.title}</strong>
                        <span class="badge badge-slate" style="font-size: 10px;">${n.type}</span>
                      </div>
                      <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 6px 0; line-height: 1.4;">
                        ${n.message}
                      </p>
                      <div style="font-size: 11px; color: var(--text-muted);">
                        ${new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                      ${n.action_url ? `
                        <a href="${n.action_url}" class="btn btn-secondary btn-sm" onclick="handleMarkSingleRead(${n.id})">
                          View &rarr;
                        </a>
                      ` : ''}
                      ${!n.read_status ? `
                        <button class="btn btn-secondary btn-sm" onclick="handleMarkSingleRead(${n.id})" title="Mark read">
                          ${Icons.check(13)}
                        </button>
                      ` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

      </div>
    `;
}

async function handleMarkSingleRead(id) {
  try {
    await API.put(`/notifications/${id}/read`, {});
    const n = notificationsState.notifications.find(item => item.id === id);
    if (n && !n.read_status) {
      n.read_status = true;
      notificationsState.unreadCount = Math.max(0, notificationsState.unreadCount - 1);
      AppState.setUnreadNotifications(notificationsState.unreadCount);
      renderNotificationsUI();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleMarkAllRead() {
  try {
    await API.put('/notifications/read-all', {});
    notificationsState.notifications.forEach(n => n.read_status = true);
    notificationsState.unreadCount = 0;
    AppState.setUnreadNotifications(0);
    showToast('All notifications marked as read.', 'info');
    renderNotificationsUI();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.renderNotificationsView = renderNotificationsView;
window.handleMarkSingleRead = handleMarkSingleRead;
window.handleMarkAllRead = handleMarkAllRead;
