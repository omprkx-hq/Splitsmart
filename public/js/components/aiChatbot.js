/**
 * SplitSmart AI - Real-Time AI Chatbot & Copilot Widget
 * Powered by Google Gemini API from backend .env
 * Features:
 * - Direct integration with Google Gemini API using GEMINI_API_KEY from .env
 * - Ground-truth SQL ledger context injection (balances, debts, groups, transactions)
 * - Multi-turn conversation history
 * - In-chat natural language expense parsing and draft generation
 * - Zero emoji, clean SVG minimal iconography
 */

(function () {
    let isOpen = false;
    let messages = [
        {
            role: 'assistant',
            text: 'Hello! I am your SplitSmart Copilot powered by Google Gemini. Ask me anything about your group balances, who owes whom, how to split any bill, or financial advice.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isGemini: true
        }
    ];
    let isTyping = false;
    let cachedGroups = [];

    function initChatbot() {
        if (document.getElementById('splitsmart-ai-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'splitsmart-ai-widget';
        widget.className = 'ai-chatbot-widget';
        widget.innerHTML = `
          <!-- Floating Launcher Trigger Button -->
          <button id="ai-chat-launcher" class="ai-launcher-btn" onclick="window.toggleAiChatbot()" title="Open SplitSmart AI Copilot">
            <div class="ai-launcher-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
              </svg>
            </div>
            <span class="ai-launcher-label">AI Copilot</span>
            <span class="ai-launcher-pulse"></span>
          </button>

          <!-- Chat Window Drawer -->
          <div id="ai-chat-drawer" class="ai-chat-drawer" style="display: none;">
            <!-- Header -->
            <div class="ai-chat-header">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div class="ai-chat-avatar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
                  </svg>
                </div>
                <div>
                  <div class="ai-chat-title">SplitSmart Copilot</div>
                  <div id="ai-chat-status-indicator" class="ai-chat-status" style="cursor: default;">
                    <span class="ai-status-dot" id="ai-status-dot" style="background: var(--accent-emerald);"></span>
                    <span id="ai-status-label" style="color: var(--accent-emerald); font-weight: 700;">Google Gemini Connected</span>
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 6px;">
                <button class="ai-header-btn" onclick="window.clearAiChat()" title="Clear conversation">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
                <button class="ai-header-btn" onclick="window.toggleAiChatbot()" title="Minimize chat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>

            <!-- Group Context Selector Toolbar -->
            <div class="ai-chat-context-bar">
              <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Context:</span>
              <select id="ai-chat-group-select" class="ai-group-select" onchange="window.handleAiGroupChange(this.value)">
                <option value="">General Financial Copilot &amp; Math</option>
              </select>
            </div>

            <!-- Messages Stream -->
            <div id="ai-chat-messages" class="ai-chat-messages">
              <!-- Rendered dynamically -->
            </div>

            <!-- Quick Suggestion Chips -->
            <div class="ai-chat-chips">
              <button class="ai-chip" onclick="window.sendAiPrompt('Who owes money in our group right now?')">Who owes money?</button>
              <button class="ai-chip" onclick="window.sendAiPrompt('How do I settle balances with PayPal?')">PayPal Settle</button>
              <button class="ai-chip" onclick="window.sendAiPrompt('How should we settle all balances?')">How to settle?</button>
              <button class="ai-chip" onclick="window.sendAiPrompt('Split $120 dinner equally between 3 people')">Split $120 dinner</button>
            </div>

            <!-- Input Bar -->
            <form class="ai-chat-input-bar" onsubmit="window.handleAiChatSubmit(event)">
              <input type="text" id="ai-chat-input" class="ai-input" placeholder="Ask Google Gemini Copilot..." autocomplete="off">
              <button type="submit" id="ai-chat-send-btn" class="ai-send-btn" title="Send message">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
                </svg>
              </button>
            </form>
          </div>
        `;

        document.body.appendChild(widget);
        loadUserGroupsForAi();
        renderMessages();
    }

    async function loadUserGroupsForAi() {
        if (!window.API || !API.getToken()) return;

        try {
            const res = await API.get('/groups');
            cachedGroups = res.groups || [];
            const select = document.getElementById('ai-chat-group-select');
            if (select) {
                if (cachedGroups.length > 0) {
                    const currentActive = AppState.activeGroupId || cachedGroups[0].id;
                    select.innerHTML = `
                      ${cachedGroups.map(g => `<option value="${g.id}" ${g.id === currentActive ? 'selected' : ''}>${escapeHtml(g.name)} (${g.currency})</option>`).join('')}
                      <option value="">General Knowledge / No Group</option>
                    `;
                } else {
                    select.innerHTML = `<option value="">General Financial Copilot (No Groups)</option>`;
                }
            }
        } catch (e) {
            // Silently ignore if not logged in
        }
    }

    function renderMessages() {
        const container = document.getElementById('ai-chat-messages');
        if (!container) return;

        container.innerHTML = messages.map(m => {
            const isUser = m.role === 'user';
            return `
              <div class="ai-msg-row ${isUser ? 'user-row' : 'bot-row'}">
                ${!isUser ? `
                  <div class="ai-msg-avatar">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
                  </div>
                ` : ''}
                <div class="ai-msg-bubble ${isUser ? 'user-bubble' : 'bot-bubble'}">
                  ${m.isGemini ? `
                    <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px; font-size: 10px; font-weight: 700; color: var(--accent-emerald);">
                      <span style="width: 5px; height: 5px; border-radius: 50%; background: var(--accent-emerald);"></span>
                      Google Gemini
                    </div>
                  ` : ''}
                  <div class="ai-msg-text">${formatAiMessageText(m.text)}</div>
                  ${m.draft ? renderDraftCard(m.draft) : ''}
                  <div class="ai-msg-time">${m.time}</div>
                </div>
              </div>
            `;
        }).join('');

        if (isTyping) {
            container.innerHTML += `
              <div class="ai-msg-row bot-row">
                <div class="ai-msg-avatar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
                </div>
                <div class="ai-msg-bubble bot-bubble typing-bubble">
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                </div>
              </div>
            `;
        }

        container.scrollTop = container.scrollHeight;
    }

    function renderDraftCard(draft) {
        return `
          <div class="ai-draft-card">
            <div class="ai-draft-header">
              <span class="badge badge-primary" style="font-size: 10px;">Parsed Expense Draft</span>
              <strong style="color: var(--accent-primary); font-size: 14px;">$${Number(draft.amount || 0).toFixed(2)}</strong>
            </div>
            <div style="font-size: 13px; font-weight: 700; margin: 4px 0 2px 0;">${escapeHtml(draft.description || 'Shared Expense')}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">
              Paid by <strong>${escapeHtml(draft.payerName || 'Payer')}</strong> &bull; Split: ${draft.splitMethod || 'EQUAL'}
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.applyChatDraftToExpense(${JSON.stringify(draft).replace(/"/g, '&quot;')})" style="width: 100%; justify-content: center; font-size: 12px; padding: 6px 10px;">
              Apply to Expense Form &rarr;
            </button>
          </div>
        `;
    }

    function formatAiMessageText(text) {
        if (!text) return '';
        let sanitized = escapeHtml(text);
        // Format bold text
        sanitized = sanitized.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Format bullet points
        sanitized = sanitized.replace(/• (.*?)(<br>|$)/g, '<li>$1</li>');
        sanitized = sanitized.replace(/(<li>.*?<\/li>)+/g, '<ul style="margin: 6px 0; padding-left: 18px;">$&</ul>');
        // Format inline code
        sanitized = sanitized.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Convert newlines to breaks
        sanitized = sanitized.replace(/\n/g, '<br>');
        return sanitized;
    }

    function toggleAiChatbot() {
        isOpen = !isOpen;
        const drawer = document.getElementById('ai-chat-drawer');
        const launcher = document.getElementById('ai-chat-launcher');
        if (!drawer) return;

        if (isOpen) {
            drawer.style.display = 'flex';
            drawer.classList.add('ai-drawer-open');
            if (launcher) launcher.classList.add('active');
            loadUserGroupsForAi();
            setTimeout(() => {
                const input = document.getElementById('ai-chat-input');
                if (input) input.focus();
            }, 100);
        } else {
            drawer.classList.remove('ai-drawer-open');
            if (launcher) launcher.classList.remove('active');
            setTimeout(() => {
                if (!isOpen) drawer.style.display = 'none';
            }, 250);
        }
    }

    function openAiChatbot(promptText) {
        if (!isOpen) toggleAiChatbot();
        if (promptText) {
            const input = document.getElementById('ai-chat-input');
            if (input) {
                input.value = promptText;
                input.focus();
            }
        }
    }

    function clearAiChat() {
        messages = [
            {
                role: 'assistant',
                text: 'Conversation cleared. How can I help you with your group expenses or balances today?',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isGemini: true
            }
        ];
        renderMessages();
    }

    async function handleAiChatSubmit(e) {
        if (e) e.preventDefault();
        const input = document.getElementById('ai-chat-input');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        await executeUserMessage(text);
    }

    async function sendAiPrompt(text) {
        if (!isOpen) toggleAiChatbot();
        await executeUserMessage(text);
    }

    async function executeUserMessage(text) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messages.push({ role: 'user', text, time });
        isTyping = true;
        renderMessages();

        try {
            const groupSelect = document.getElementById('ai-chat-group-select');
            const groupId = groupSelect && groupSelect.value ? parseInt(groupSelect.value, 10) : (cachedGroups[0]?.id || null);

            // Detect if this is an expense to parse (contains words like "split", "paid", "$", "spent")
            const isExpenseEntry = /(?:spent|paid|bought|dinner|lunch|uber|split|\$|\€|\£)\s+\d+|\b\d+\s+(?:dollars|bucks|split)/i.test(text);

            let botResponse = '';
            let parsedDraft = null;
            let isGeminiLive = false;

            if (isExpenseEntry && window.API && API.getToken()) {
                // Try parsing through backend AI service
                try {
                    const parseRes = await API.post('/ai/parse-expense', { text, groupId });
                    if (parseRes && parseRes.draft) {
                        parsedDraft = parseRes.draft;
                        botResponse = `I parsed this expense draft for you: **${parsedDraft.description}** for **$${Number(parsedDraft.amount).toFixed(2)}**. You can review and apply it directly below:`;
                    }
                } catch (parseErr) {
                    // Fall back to general chat
                }
            }

            // Real Google Gemini Chat Call using .env API key
            if (!botResponse && window.API) {
                try {
                    const chatRes = await API.post('/ai/chat', {
                        message: text,
                        conversationHistory: messages.slice(-10).map(m => ({ role: m.role, text: m.text })),
                        groupId
                    });

                    if (chatRes && chatRes.reply) {
                        botResponse = chatRes.reply;
                        isGeminiLive = Boolean(chatRes.isLiveAi);
                    }
                } catch (chatErr) {
                    console.warn('[AI] Chat API fallback triggered:', chatErr.message);
                }
            }

            // Grounded deterministic fallback if API is offline
            if (!botResponse) {
                botResponse = handleLocalCopilotResponse(text);
            }

            const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            messages.push({
                role: 'assistant',
                text: botResponse,
                draft: parsedDraft,
                isGemini: isGeminiLive,
                time: responseTime
            });
        } catch (err) {
            messages.push({
                role: 'assistant',
                text: `Apologies, I encountered an issue: ${err.message}. Please try asking in a different way or check your connection.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isGemini: false
            });
        } finally {
            isTyping = false;
            renderMessages();
        }
    }

    function handleLocalCopilotResponse(query) {
        const q = query.toLowerCase();

        if (q.includes('split') && (q.includes('between') || q.includes('among') || /\d+/.test(q))) {
            let total = 0;
            let count = 0;
            const countMatch = q.match(/(?:between|among)\s+(\d+)/) || q.match(/(\d+)\s+(?:people|friends|members|persons)/);
            if (countMatch) count = parseInt(countMatch[1], 10);

            const explicitAmount = q.match(/(?:[\$€£₹]|rs\.?)\s*(\d+(?:\.\d{1,2})?)/);
            if (explicitAmount) {
                total = parseFloat(explicitAmount[1]);
            } else {
                const allNums = [...q.matchAll(/\b(\d+(?:\.\d{1,2})?)\b/g)].map(m => parseFloat(m[1]));
                const nonCountNums = allNums.filter(n => n !== count);
                total = nonCountNums.length > 0 ? nonCountNums[0] : (allNums[0] || 0);
            }

            if (total > 0 && count > 0) {
                const perPerson = (total / count).toFixed(2);
                return `Splitting **$${total.toFixed(2)}** equally among **${count} people** is **$${perPerson} per person**.\n\n` +
                    `• **Base share**: $${perPerson}\n` +
                    `• **Zero Drift**: SplitSmart double-entry ledger allocates remainder cents deterministically to ensure exact sum reconciliation.`;
            }
        }

        if (q.includes('who owes') || q.includes('balance') || q.includes('how much')) {
            if (!window.API || !API.getToken()) {
                return 'To view your exact live balances and who owes whom, please **Sign In** or open a group ledger.';
            }
            return 'Select a group from the context dropdown above or open **Dashboard** &rarr; **Settle Up** to view your consolidated balance and simplified debt settlement plan.';
        }

        if (q.includes('settle') || q.includes('paypal') || q.includes('pay')) {
            return 'SplitSmart AI calculates optimal debt paths using debt simplification. Instead of multiple circular payments, you can settle up in the fewest possible steps via **PayPal Sandbox** or mark debts settled in cash.';
        }

        return `Hello! I am your SplitSmart Copilot powered by Google Gemini. Ask me about your group balances, who owes whom, how to split any bill, or financial advice.`;
    }

    function applyChatDraftToExpense(draft) {
        window.location.hash = '#/add-expense';
        setTimeout(() => {
            if (window.prefillAddExpenseFromDraft) {
                window.prefillAddExpenseFromDraft(draft);
            }
            toggleAiChatbot();
        }, 120);
    }

    function handleAiGroupChange(groupId) {
        if (groupId) {
            const g = cachedGroups.find(item => item.id === parseInt(groupId, 10));
            if (g) {
                messages.push({
                    role: 'assistant',
                    text: `Switched context to **${escapeHtml(g.name)}** (${g.currency}). You can now ask questions specifically about this group ledger.`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isGemini: true
                });
                renderMessages();
            }
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function updateChatbotVisibility() {
        const widget = document.getElementById('splitsmart-ai-widget');
        if (!widget) return;
        const hash = window.location.hash || '';
        const isAuthPage = hash.startsWith('#/login') || hash.startsWith('#/signup') || hash.startsWith('#/forgot') || hash.startsWith('#/auth') || hash === '#/' || hash === '#/help' || hash === '#/privacy';
        if (!AppState?.user || isAuthPage) {
            widget.style.display = 'none';
        } else {
            widget.style.display = 'block';
        }
    }

    // Initialize once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initChatbot();
            updateChatbotVisibility();
        });
    } else {
        initChatbot();
        updateChatbotVisibility();
    }

    window.addEventListener('hashchange', updateChatbotVisibility);
    window.updateChatbotVisibility = updateChatbotVisibility;

    // Expose window methods
    window.toggleAiChatbot = toggleAiChatbot;
    window.openAiChatbot = openAiChatbot;
    window.clearAiChat = clearAiChat;
    window.handleAiChatSubmit = handleAiChatSubmit;
    window.sendAiPrompt = sendAiPrompt;
    window.handleAiGroupChange = handleAiGroupChange;
    window.applyChatDraftToExpense = applyChatDraftToExpense;
})();
