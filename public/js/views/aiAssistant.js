/**
 * View 7: Guardrailed AI Expense Assistant & Receipt OCR
 */

let aiAssistantState = {
    groups: [],
    selectedGroupId: null,
    tab: 'nlp', // 'nlp' | 'qa' | 'ocr'
    extractedDraft: null
};

async function renderAiAssistantView() {
    const content = document.getElementById('app-content');
    if (!content) return;

    try {
        const groupsRes = await API.get('/groups').catch(() => ({ groups: [] }));
        aiAssistantState.groups = groupsRes.groups || [];

        if (aiAssistantState.groups.length > 0) {
            if (!aiAssistantState.selectedGroupId) {
                aiAssistantState.selectedGroupId = AppState.activeGroupId || aiAssistantState.groups[0].id;
            }
        } else {
            aiAssistantState.selectedGroupId = null;
        }

        renderAiTabs();
    } catch (err) {
        aiAssistantState.groups = [];
        renderAiTabs();
    }
}

function renderAiTabs() {
    const content = document.getElementById('app-content');
    if (!content) return;

    const tab = aiAssistantState.tab;
    const currentGroup = aiAssistantState.groups.find(g => g.id === aiAssistantState.selectedGroupId) || aiAssistantState.groups[0];

    content.innerHTML = `
      <div style="max-width: 820px; margin: 0 auto;">
        
        <div class="page-header" style="margin-bottom: 24px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h1 class="page-title">AI Financial Assistant</h1>
              <span class="badge badge-primary">Strict Review Gate</span>
            </div>
            <p class="page-subtitle">Natural language parsing, receipt OCR, and SQL-backed authorized financial analytics.</p>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 13px; font-weight: 600; color: #64748B;">Active Group:</label>
            <select class="form-select" style="width: auto; padding: 6px 12px; font-size: 13px;" onchange="aiAssistantState.selectedGroupId = this.value ? parseInt(this.value, 10) : null; renderAiTabs();">
              ${aiAssistantState.groups.length > 0 
                ? aiAssistantState.groups.map(g => `
                  <option value="${g.id}" ${g.id === aiAssistantState.selectedGroupId ? 'selected' : ''}>
                    ${escapeHtml(g.name)} (${escapeHtml(g.currency)})
                  </option>
                `).join('') 
                : `<option value="">General Copilot (No Groups Yet)</option>`}
            </select>
            ${aiAssistantState.groups.length === 0 ? `
              <button class="btn btn-secondary btn-sm" onclick="showCreateGroupModal()">
                ${Icons.plus(13)} Create Group
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Mode Navigation Tabs -->
        <div style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
          <button class="btn ${tab === 'nlp' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="aiAssistantState.tab = 'nlp'; renderAiTabs();">
            ${Icons.message(14)} Natural-Language Expense Entry
          </button>
          <button class="btn ${tab === 'qa' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="aiAssistantState.tab = 'qa'; renderAiTabs();">
            ${Icons.sparkles(14)} Authorized Financial Q&amp;A
          </button>
          <button class="btn ${tab === 'ocr' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="aiAssistantState.tab = 'ocr'; renderAiTabs();">
            ${Icons.camera(14)} Receipt OCR Scanner
          </button>
        </div>

        <!-- Tab 1: Natural Language Entry -->
        ${tab === 'nlp' ? `
          <div class="card">
            <div class="card-header">
              <div>
                <span class="card-title">Natural-Language Expense Parser</span>
                <div style="font-size: 12px; color: #64748B;">Type plain text. Extracted drafts require mandatory user confirmation.</div>
              </div>
              <span class="badge badge-slate">Zero Direct Insertion</span>
            </div>
            <form onsubmit="handleParseNaturalLanguage(event)">
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">Describe the shared expense in plain English:</label>
                  <textarea id="ai-nlp-prompt" class="form-textarea" rows="4" placeholder="Example: Yesterday, Rahul paid 2,400 for dinner at Olive Garden. Split it equally between Rahul, Priya and Aman." required autofocus></textarea>
                  <div class="form-hint">
                    ${Icons.sparkles(13)} Supports amounts, payer names, participant names, dates (today, yesterday), and categories.
                  </div>
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('ai-nlp-prompt').value = 'Yesterday, Rahul paid 120.00 for groceries at Trader Joes. Split it equally between everyone.';">
                    Sample 1: Groceries Split
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('ai-nlp-prompt').value = 'Rahul covered 45.50 for airport Uber ride yesterday for Rahul and Priya.';">
                    Sample 2: Uber Ride
                  </button>
                </div>
              </div>

              <div class="card-footer">
                <button type="submit" id="btn-ai-parse" class="btn btn-primary">
                  Parse Into Structured Draft &rarr;
                </button>
              </div>
            </form>
          </div>
        ` : ''}

        <!-- Tab 2: Financial Q&A -->
        ${tab === 'qa' ? `
          <div class="card">
            <div class="card-header">
              <div>
                <span class="card-title">SQL-Computed Financial Q&amp;A</span>
                <div style="font-size: 12px; color: #64748B;">Ground-truth SQL queries prevent LLM math hallucinations.</div>
              </div>
              <span class="badge badge-primary">Ledger-Verified Math</span>
            </div>
            <div class="card-body">
              <form onsubmit="handleFinancialQuery(event)">
                <div class="form-group">
                  <label class="form-label">Ask a financial question about ${currentGroup ? escapeHtml(currentGroup.name) : 'your split finances'}:</label>
                  <div style="display: flex; gap: 10px;">
                    <input type="text" id="ai-qa-input" class="form-input" placeholder="e.g. How much did we spend on food? Who owes me the most?" required autofocus>
                    <button type="submit" id="btn-ai-qa" class="btn btn-primary" style="white-space: nowrap;">Query Ledger &rarr;</button>
                  </div>
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('ai-qa-input').value = 'How much did we spend on Food & Dining?';">
                    Food &amp; Dining Spending
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('ai-qa-input').value = 'Who owes me the most and what is my net balance?';">
                    My Net Balance &amp; Debtors
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('ai-qa-input').value = 'Give me the total group spending summary.';">
                    Group Spending Summary
                  </button>
                </div>
              </form>

              <div id="qa-response-area" style="display: none; background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 20px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                  <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--accent-emerald);">Verified Calculation</span>
                  <span style="font-size: 11px; color: var(--text-muted);">Real Ledger Audit Status</span>
                </div>
                <div id="qa-response-text" style="font-size: 14px; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap;"></div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Tab 3: Receipt OCR Scanner -->
        ${tab === 'ocr' ? `
          <div class="card">
            <div class="card-header">
              <div>
                <span class="card-title">Receipt OCR Scanner</span>
                <div style="font-size: 12px; color: #64748B;">Extract merchant, date, amount, and category directly into the confirmation form.</div>
              </div>
              <span class="badge badge-slate">Optical Character Recognition</span>
            </div>
            <form onsubmit="handleScanReceipt(event)">
              <div class="card-body">
                <div class="form-group">
                  <label class="form-label">Upload Receipt Image (JPEG, PNG, WEBP):</label>
                  <input type="file" id="receipt-file-input" class="form-input" accept="image/*" required>
                  <div class="form-hint">
                    OCR parses the image and loads extracted fields into the review gate form.
                  </div>
                </div>

                <div id="ocr-preview-container" style="display: none; margin-top: 16px; text-align: center;">
                  <img id="ocr-preview-img" style="max-height: 200px; border-radius: 6px; border: 1px solid #E2E8F0;" alt="Receipt preview">
                </div>
              </div>

              <div class="card-footer">
                <button type="submit" id="btn-scan-receipt" class="btn btn-primary">
                  Scan Receipt Image &rarr;
                </button>
              </div>
            </form>
          </div>
        ` : ''}

        <!-- Mandatory Review Gate Modal Container -->
        <div id="ai-review-gate-container"></div>

      </div>
    `;

    // Add file listener for preview
    const fileInput = document.getElementById('receipt-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const img = document.getElementById('ocr-preview-img');
                    const cont = document.getElementById('ocr-preview-container');
                    if (img && cont) {
                        img.src = re.target.result;
                        cont.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

async function handleParseNaturalLanguage(e) {
    e.preventDefault();
    const text = document.getElementById('ai-nlp-prompt').value.trim();
    const btn = document.getElementById('btn-ai-parse');

    btn.disabled = true;
    btn.innerText = 'Extracting Financial Entities...';

    try {
        const res = await API.post('/ai/parse-expense', {
            text,
            groupId: aiAssistantState.selectedGroupId
        });

        showReviewConfirmationGate(res.draft);
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Parse Into Structured Draft →';
    }
}

async function handleFinancialQuery(e) {
    e.preventDefault();
    const question = document.getElementById('ai-qa-input').value.trim();
    const btn = document.getElementById('btn-ai-qa');
    const area = document.getElementById('qa-response-area');
    const textEl = document.getElementById('qa-response-text');

    btn.disabled = true;
    btn.innerText = 'Analyzing with AI...';

    try {
        if (aiAssistantState.selectedGroupId) {
            const res = await API.post('/ai/query', {
                question,
                groupId: aiAssistantState.selectedGroupId
            });
            textEl.innerText = res.answer;
        } else {
            const res = await API.post('/ai/chat', {
                message: question,
                customApiKey: localStorage.getItem('splitsmart_gemini_key') || null
            });
            textEl.innerText = res.reply || 'Analysis complete.';
        }
        area.style.display = 'block';
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Query Ledger →';
    }
}

async function handleScanReceipt(e) {
    e.preventDefault();
    const fileInput = document.getElementById('receipt-file-input');
    const btn = document.getElementById('btn-scan-receipt');

    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Please select a receipt image file.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('receipt', fileInput.files[0]);

    btn.disabled = true;
    btn.innerText = 'Analyzing Image via OCR...';

    try {
        const res = await API.post('/ai/scan-receipt', formData);
        showReviewConfirmationGate(res.extracted);
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Scan Receipt Image →';
    }
}

/**
 * MANDATORY REVIEW GATE:
 * Displays the AI-extracted fields in a confirmation card.
 * Never inserts to PostgreSQL until user verifies and clicks Confirm.
 */
function showReviewConfirmationGate(draft) {
    const container = document.getElementById('ai-review-gate-container');
    if (!container) return;

    const currentGroup = aiAssistantState.groups.find(g => g.id === aiAssistantState.selectedGroupId);
    const cur = currentGroup ? currentGroup.currency : 'USD';

    container.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content" style="max-width: 600px;">
          <div class="card-header" style="background: var(--bg-subtle); border-bottom: 1px solid var(--border-subtle);">
            <div>
              <span class="badge badge-primary" style="margin-bottom: 4px;">Mandatory Review Gate</span>
              <div class="card-title">Verify AI-Extracted Expense Before Saving</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="closeReviewGate()">${Icons.close(14)}</button>
          </div>

          <div class="card-body">
            <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 18px;">
              ${Icons.shield(14)} <strong>Safety Guarantee:</strong> AI extractions are never written to the ledger automatically. Please review and adjust the fields below if needed.
            </p>

            <div class="form-group">
              <label class="form-label">Description</label>
              <input type="text" id="gate-desc" class="form-input" value="${draft.description || ''}">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Total Amount (${cur})</label>
                <input type="number" id="gate-amount" step="0.01" class="form-input num" value="${draft.amount || ''}">
              </div>

              <div class="form-group">
                <label class="form-label">Category</label>
                <select id="gate-category" class="form-select">
                  ${['Food & Dining', 'Transportation', 'Housing', 'Entertainment', 'Shopping', 'Travel', 'General'].map(c => `
                    <option value="${c}" ${c.toLowerCase() === (draft.category || '').toLowerCase() ? 'selected' : ''}>${c}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" id="gate-date" class="form-input" value="${draft.date || new Date().toISOString().slice(0, 10)}">
              </div>

              <div class="form-group">
                <label class="form-label">Payer Mentioned</label>
                <input type="text" id="gate-payer" class="form-input" value="${draft.payerName || 'Current User'}" readonly style="background: var(--bg-muted); color: var(--text-muted);">
              </div>
            </div>

            <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 14px; margin-top: 10px;">
              <div style="font-size: 12px; color: var(--text-muted);">Detected Participants:</div>
              <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-top: 4px;">
                ${Array.isArray(draft.participantNames) && draft.participantNames.length > 0 ? draft.participantNames.join(', ') : 'All Group Members'}
              </div>
            </div>
          </div>

          <div class="card-footer" style="justify-content: space-between;">
            <button class="btn btn-secondary" onclick="closeReviewGate()">Discard Draft</button>
            <button class="btn btn-primary btn-lg" onclick="forwardDraftToAddExpense(${JSON.stringify(draft).replace(/"/g, '&quot;')})">
              Confirm &amp; Proceed to Ledger Split &rarr;
            </button>
          </div>
        </div>
      </div>
    `;
}

function closeReviewGate() {
    const container = document.getElementById('ai-review-gate-container');
    if (container) container.innerHTML = '';
}

function forwardDraftToAddExpense(originalDraft) {
    const desc = document.getElementById('gate-desc')?.value || originalDraft.description;
    const amount = parseFloat(document.getElementById('gate-amount')?.value) || originalDraft.amount;
    const category = document.getElementById('gate-category')?.value || originalDraft.category;
    const date = document.getElementById('gate-date')?.value || originalDraft.date;

    closeReviewGate();

    // Navigate to Add Expense with prefilled parameters
    window.location.hash = '#/add-expense';
    setTimeout(() => {
        const descInput = document.getElementById('exp-description');
        const amtInput = document.getElementById('exp-amount');
        const catSelect = document.getElementById('exp-category');
        const dateInput = document.getElementById('exp-date');

        if (descInput) descInput.value = desc;
        if (amtInput) {
            amtInput.value = amount;
            updateSplitPreview();
        }
        if (catSelect) catSelect.value = category;
        if (dateInput) dateInput.value = date;

        showToast('Extracted details loaded into confirmation form.', 'info');
    }, 200);
}

window.renderAiAssistantView = renderAiAssistantView;
window.handleParseNaturalLanguage = handleParseNaturalLanguage;
window.handleFinancialQuery = handleFinancialQuery;
window.handleScanReceipt = handleScanReceipt;
window.showReviewConfirmationGate = showReviewConfirmationGate;
window.closeReviewGate = closeReviewGate;
window.forwardDraftToAddExpense = forwardDraftToAddExpense;
