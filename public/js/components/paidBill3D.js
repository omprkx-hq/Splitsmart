/**
 * SplitSmart AI - Official 3D Financial Clearance Certificate Engine
 * Features:
 * - 3D Perspective Card with executive security paper stock, guilloche seal, and holographic strip
 * - Heavy-impact official debossed banking stamp in PayPal Navy & Banking Emerald
 * - Multi-particle celebratory confetti burst in brand corporate palette
 * - Interactive 3D mouse/touch tilt physics
 * - Audio haptic stamp chime (Web Audio API)
 * - Automatic Group Clearance detection & post-clearance actions (Archive / Delete / Keep)
 */

function playStampSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        // 1. Bass thud (Stamp impact)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.23);

        // 2. High chime (Fintech success)
        const chime = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(880, ctx.currentTime + 0.05); // A5
        chime.frequency.setValueAtTime(1320, ctx.currentTime + 0.12); // E6
        chimeGain.gain.setValueAtTime(0.001, ctx.currentTime);
        chimeGain.gain.setValueAtTime(0.18, ctx.currentTime + 0.06);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        chime.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chime.start(ctx.currentTime + 0.05);
        chime.stop(ctx.currentTime + 0.65);
    } catch (e) {
        // AudioContext autoplay restrictions are handled gracefully
    }
}

/**
 * Spawns 40 dynamic 3D confetti particles in PayPal enterprise palette
 */
function createConfettiBurst(container) {
    const colors = ['#003087', '#0070BA', '#FFC439', '#10B981', '#64748B'];
    const particleCount = 42;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'bill-confetti-particle';

        const color = colors[Math.floor(Math.random() * colors.length)];
        const width = 8 + Math.random() * 8;
        const height = 12 + Math.random() * 14;

        // Angle & distance
        const angle = Math.random() * Math.PI * 2;
        const distance = 170 + Math.random() * 280;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        particle.style.backgroundColor = color;
        particle.style.width = `${width}px`;
        particle.style.height = `${height}px`;
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.borderRadius = Math.random() > 0.5 ? '2px' : '999px';
        particle.style.animationDelay = `${Math.random() * 0.15}s`;

        container.appendChild(particle);
    }
}

/**
 * Universal 3D Paid Bill Modal
 * @param {Object} data
 * @param {number} data.groupId - Group database ID
 * @param {string} data.title - e.g. "SETTLEMENT RECEIPT" or "GROUP CLEARANCE"
 * @param {string} data.stampText - e.g. "PAID IN FULL" or "ALL SETTLED"
 * @param {string} data.groupName - Name of group
 * @param {string} data.payerName - Name of payer
 * @param {string} data.payeeName - Name of payee
 * @param {number} data.amount - Total amount settled
 * @param {string} data.currency - ISO Currency
 * @param {string} data.paymentRef - PayPal capture ID or Cash ref
 * @param {string} data.date - Date string
 * @param {boolean} data.isAllSettled - If all balances in group are zero
 * @param {Array<string>} data.members - List of group member names
 * @param {number} data.totalSpent - Total volume spent in group
 * @param {boolean} data.isOwner - Whether current user owns the group
 */
function show3DBillModal(data = {}) {
    // Remove any existing overlay
    const existing = document.getElementById('bill-3d-modal-overlay');
    if (existing) existing.remove();

    const groupId = data.groupId || null;
    const title = data.title || (data.isAllSettled ? 'OFFICIAL GROUP CLEARANCE CERTIFICATE' : 'SETTLEMENT PAYMENT RECEIPT');
    const stampText = data.stampText || (data.isAllSettled ? 'ALL SETTLED' : 'PAID IN FULL');
    const groupName = data.groupName || 'Expense Group';
    const payerName = data.payerName || 'Payer';
    const payeeName = data.payeeName || 'Recipient';
    const amount = Number(data.amount || 0).toFixed(2);
    const currency = data.currency || 'USD';
    const paymentRef = data.paymentRef || `TX-${Date.now().toString().slice(-8)}`;
    const dateStr = data.date || new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const isAllSettled = Boolean(data.isAllSettled);
    const members = Array.isArray(data.members) ? data.members : [];
    const totalSpent = Number(data.totalSpent || 0).toFixed(2);
    const isOwner = Boolean(data.isOwner);

    const overlay = document.createElement('div');
    overlay.id = 'bill-3d-modal-overlay';
    overlay.className = 'bill-3d-overlay';

    // Generate random barcode bars
    const barcodeBars = Array.from({ length: 30 }).map(() => {
        const w = Math.floor(Math.random() * 4) + 1;
        return `<div class="bill-bar" style="width: ${w}px;"></div>`;
    }).join('');

    overlay.innerHTML = `
      <div class="bill-3d-stage" id="bill-stage">
        
        <!-- 3D Paper Bill Card -->
        <div class="bill-3d-card" id="bill-card">
          
          <!-- Serrated Perforations -->
          <div class="bill-perforation-top"></div>
          <div class="bill-perforation-bottom"></div>

          <!-- Tactile Paper Fold Crease & Gloss Sheen -->
          <div class="bill-fold-crease"></div>
          <div class="bill-sheen"></div>

          <!-- Hologram Security Sweep -->
          <div class="bill-hologram-strip"></div>

          <!-- Subtle Watermark -->
          <div class="bill-watermark">SPLITSMART</div>

          <!-- Rubber Stamp with Glow -->
          <div class="bill-stamp-wrap">
            <div class="bill-ink-splatter"></div>
            <div class="bill-stamp">${stampText}</div>
          </div>

          ${isAllSettled ? `
            <!-- Gold / Neon Clearance Ribbon -->
            <div class="bill-clearance-ribbon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              OFFICIAL FINANCIAL CLEARANCE CERTIFICATE
            </div>
          ` : ''}

          <!-- Bill Header -->
          <div class="bill-header">
            <div>
              <div class="bill-brand-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Verified Ledger Audit
              </div>
              <h3 style="font-size: 19px; font-weight: 800; color: var(--text-primary); margin: 8px 0 2px 0; letter-spacing: -0.3px;">
                ${escapeHtml(groupName)}
              </h3>
              <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-code);">
                REF #${escapeHtml(paymentRef)} &bull; ${dateStr}
              </div>
            </div>

            <button type="button" class="btn-close-modal" onclick="close3DBillModal()" style="background: var(--bg-muted); border: 1px solid var(--border-subtle); color: var(--text-secondary); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" title="Close Modal">
              &times;
            </button>
          </div>

          <!-- Bill Body -->
          <div class="bill-body">
            
            ${!isAllSettled ? `
              <!-- Single Settlement Breakdown -->
              <table class="bill-table">
                <thead>
                  <tr>
                    <th>Party</th>
                    <th style="text-align: right;">Role</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>${escapeHtml(payerName)}</strong></td>
                    <td style="text-align: right; color: var(--accent-primary); font-weight: 700;">Payer / Settled</td>
                  </tr>
                  <tr>
                    <td><strong>${escapeHtml(payeeName)}</strong></td>
                    <td style="text-align: right; color: var(--accent-emerald); font-weight: 700;">Payee / Creditor</td>
                  </tr>
                </tbody>
              </table>

              <div class="bill-total-row">
                <span style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary);">
                  Amount Settled:
                </span>
                <span class="bill-total-amount">
                  ${currency} ${amount}
                </span>
              </div>
            ` : `
              <!-- Group All-Clear Clearance Certificate -->
              <div style="padding: 6px 0;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--accent-emerald); font-weight: 800; letter-spacing: 0.5px; margin-bottom: 6px;">
                  Group Financial Audit Status:
                </div>
                <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); line-height: 1.4; margin-bottom: 10px;">
                  All recorded expenses, debts, and balances in <strong>${escapeHtml(groupName)}</strong> have been completely settled.
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-size: 12px;">
                  <span style="color: var(--text-secondary);">Total Volume Processed:</span>
                  <strong style="color: var(--accent-primary); font-family: var(--font-code); font-size: 14px;">${currency} ${totalSpent}</strong>
                </div>

                ${members.length > 0 ? `
                  <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
                    <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Fully Settled Members:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                      ${members.map(m => `
                        <span style="background: var(--accent-emerald-subtle); border: 1px solid var(--accent-emerald-border); color: var(--accent-emerald); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">
                          ✓ ${escapeHtml(m)}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}

                <div class="bill-total-row">
                  <span style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary);">
                    Outstanding Balance:
                  </span>
                  <span class="bill-total-amount" style="color: var(--accent-emerald);">
                    ${currency} 0.00
                  </span>
                </div>
              </div>
            `}

            <!-- Authenticity Barcode & Security Hash -->
            <div class="bill-barcode">
              ${barcodeBars}
            </div>
            <div style="text-align: center; font-size: 10px; color: var(--text-muted); font-family: var(--font-code); letter-spacing: 1px;">
              AUTHENTICATED VIA SPLITSMART ZERO-DRIFT SQL LEDGER
            </div>

            <!-- Post-Clearance Management Section -->
            ${isAllSettled && groupId ? `
              <div class="bill-post-actions">
                <div class="bill-post-actions-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  All Cleared &bull; Group Options
                </div>
                <div class="bill-btn-grid">
                  ${isOwner ? `
                    <button class="bill-btn-archive" onclick="handleArchiveGroupFromModal(${groupId})" title="Safe read-only archive">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                      Archive Group (Audit-Safe &bull; Recommended)
                    </button>
                    <button class="bill-btn-delete" onclick="handleDeleteGroupFromModal(${groupId}, '${escapeJs(groupName)}')" title="Purge group from database">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      Delete Group Permanently
                    </button>
                  ` : `
                    <button class="bill-btn-archive" onclick="handleLeaveGroupFromModal(${groupId}, '${escapeJs(groupName)}')" title="Leave settled group">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      Leave Settled Group
                    </button>
                  `}
                  <button class="bill-btn-keep" onclick="close3DBillModal()">
                    ✓ Keep Group Active &amp; Close
                  </button>
                </div>
              </div>
            ` : `
              <!-- Standard Action Button -->
              <div class="bill-actions">
                <button class="bill-action-btn bill-action-btn-primary" onclick="close3DBillModal()">
                  Done &amp; Keep Ledger &rarr;
                </button>
              </div>
            `}

          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Audio & Shake trigger
    setTimeout(() => {
        playStampSound();
        const card = document.getElementById('bill-card');
        if (card) {
            card.classList.add('bill-camera-shake');
            setTimeout(() => card.classList.remove('bill-camera-shake'), 500);
        }
        createConfettiBurst(overlay);
    }, 450);

    // Interactive 3D Mouse Tilt Physics
    const card = document.getElementById('bill-card');
    function handleMouseMove(e) {
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const cardCenterY = rect.top + rect.height / 2;

        const mouseX = e.clientX - cardCenterX;
        const mouseY = e.clientY - cardCenterY;

        // Max tilt +/- 14 degrees
        const tiltX = (-(mouseY / (rect.height / 2)) * 12).toFixed(2);
        const tiltY = ((mouseX / (rect.width / 2)) * 14).toFixed(2);

        card.style.transform = `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
    }

    function handleMouseLeave() {
        if (!card) return;
        card.style.transform = 'perspective(1200px) rotateX(4deg) rotateY(-2deg) scale(1)';
    }

    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('mouseleave', handleMouseLeave);

    // Close on click outside card
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            close3DBillModal();
        }
    });

    // Close on Escape key
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            close3DBillModal();
            document.removeEventListener('keydown', handleKeyDown);
        }
    }
    document.addEventListener('keydown', handleKeyDown);
}

function close3DBillModal() {
    const overlay = document.getElementById('bill-3d-modal-overlay');
    if (overlay) {
        overlay.style.transition = 'opacity 0.25s ease-out, transform 0.25s ease-out';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 260);
    }
}

async function handleArchiveGroupFromModal(groupId) {
    if (!groupId) return;
    try {
        await API.post(`/groups/${groupId}/archive`, { archived: true });
        showToast('Group archived! All expenses and receipts are safely preserved.', 'success');
        close3DBillModal();
        if (window.location.hash.startsWith('#/groups/')) {
            window.location.hash = '#/groups';
        } else if (typeof renderSettlementsView === 'function') {
            renderSettlementsView();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleDeleteGroupFromModal(groupId, groupName) {
    if (!groupId) return;
    const cleanName = groupName || 'this group';
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE "${cleanName}"?\n\nAll recorded expenses, itemized splits, and history will be completely erased from the database.`)) {
        return;
    }

    try {
        await API.delete(`/groups/${groupId}`);
        showToast(`Group "${cleanName}" was permanently deleted.`, 'info');
        close3DBillModal();
        window.location.hash = '#/groups';
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleLeaveGroupFromModal(groupId, groupName) {
    if (!groupId) return;
    if (!confirm(`Leave "${groupName || 'this group'}"? You have $0.00 outstanding debt.`)) {
        return;
    }

    try {
        await API.post(`/groups/${groupId}/leave`, {});
        showToast(`You have left "${groupName || 'group'}".`, 'info');
        close3DBillModal();
        window.location.hash = '#/groups';
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'");
}

window.show3DBillModal = show3DBillModal;
window.close3DBillModal = close3DBillModal;
window.handleArchiveGroupFromModal = handleArchiveGroupFromModal;
window.handleDeleteGroupFromModal = handleDeleteGroupFromModal;
window.handleLeaveGroupFromModal = handleLeaveGroupFromModal;
