/**
 * View 16: AI Bill Calculator & Public Digital Receipt Viewer
 * - Logged-in users access #/calculator to calculate splits via AI or manual numbers.
 * - Public recipients access #/receipt?data=... to view the digital receipt with ZERO login required.
 */

let calcState = {
    mode: 'ai', // 'ai' | 'manual'
    currency: '₹',
    aiPrompt: '',
    manual: {
        title: '',
        total: '',
        tipPercent: 0,
        taxPercent: 0,
        payerName: '',
        people: [
            { name: '', customAmount: '' },
            { name: '', customAmount: '' }
        ]
    },
    currentResult: null,
    loading: false
};

function syncInputsToState() {
    const promptEl = document.getElementById('ai-calc-prompt');
    if (promptEl) calcState.aiPrompt = promptEl.value;

    const titleEl = document.getElementById('m-title');
    if (titleEl) calcState.manual.title = titleEl.value;

    const totalEl = document.getElementById('m-total');
    if (totalEl) calcState.manual.total = totalEl.value;

    const curEl = document.getElementById('m-currency');
    if (curEl) calcState.currency = curEl.value;

    const tipEl = document.getElementById('m-tip');
    if (tipEl) calcState.manual.tipPercent = parseFloat(tipEl.value) || 0;

    const taxEl = document.getElementById('m-tax');
    if (taxEl) calcState.manual.taxPercent = parseFloat(taxEl.value) || 0;

    const payerEl = document.getElementById('m-payer');
    if (payerEl) calcState.manual.payerName = payerEl.value;

    // Collect current person rows
    calcState.manual.people.forEach((p, idx) => {
        const nameEl = document.getElementById(`m-person-name-${idx}`);
        if (nameEl) p.name = nameEl.value;
        const amtEl = document.getElementById(`m-person-amt-${idx}`);
        if (amtEl) p.customAmount = amtEl.value ? parseFloat(amtEl.value) : '';
    });
}

/**
 * Logged-in View: AI Calculator Studio
 */
function renderCalculatorView() {
    const content = document.getElementById('app-content');
    if (!content) return;

    // Initialize payer name from logged in user if empty
    if (!calcState.manual.payerName && AppState.user?.name) {
        calcState.manual.payerName = AppState.user.name;
        if (!calcState.manual.people[0].name) {
            calcState.manual.people[0].name = AppState.user.name;
        }
    }
    if (!calcState.currency && AppState.user?.default_currency) {
        calcState.currency = AppState.user.default_currency === 'INR' ? '₹' : (AppState.user.default_currency === 'EUR' ? '€' : '$');
    }

    // Check if URL has pre-encoded calculation data
    parseUrlCalcData();

    content.innerHTML = `
      <div style="max-width: 840px; margin: 32px auto; padding: 0 16px;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(0, 112, 186, 0.1); border: 1px solid rgba(0, 112, 186, 0.25); color: var(--accent-primary); padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 12px;">
            <span>⚡ AI Bill Calculator</span>
            <span>&bull;</span>
            <span>Zero-Drift Exact</span>
          </div>
          <h1 style="font-size: 32px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.6px; margin: 0 0 8px 0;">
            AI Bill Split &amp; WhatsApp Share
          </h1>
          <p style="font-size: 15px; color: var(--text-muted); max-width: 580px; margin: 0 auto;">
            Calculate your bill's per-person shares with AI or custom amounts. Then share the live digital receipt link to WhatsApp &mdash; your friends don't need to log in!
          </p>
        </div>

        <!-- Mode Toggle Tabs -->
        <div style="display: flex; justify-content: center; margin-bottom: 24px;">
          <div style="display: inline-flex; background: var(--bg-muted); padding: 4px; border-radius: 12px; border: 1px solid var(--border-subtle);">
            <button type="button" class="btn btn-sm ${calcState.mode === 'ai' ? 'btn-primary' : 'btn-secondary'}" onclick="setCalcMode('ai')" style="gap: 6px; border-radius: 8px;">
              <span>🤖 AI Smart Split</span>
            </button>
            <button type="button" class="btn btn-sm ${calcState.mode === 'manual' ? 'btn-primary' : 'btn-secondary'}" onclick="setCalcMode('manual')" style="gap: 6px; border-radius: 8px;">
              <span>🧮 Interactive Calculator</span>
            </button>
          </div>
        </div>

        <!-- Input Section -->
        <div class="card" style="margin-bottom: 28px; box-shadow: var(--shadow-sm); border-radius: 16px;">
          <div class="card-body" style="padding: 24px;">
            ${calcState.mode === 'ai' ? renderAiPromptSection() : renderManualSection()}
          </div>
        </div>

        <!-- Result Section (Receipt & WhatsApp Action) -->
        <div id="calc-result-area">
          ${calcState.currentResult ? renderReceiptCard(calcState.currentResult) : ''}
        </div>

      </div>
    `;
}

function renderAiPromptSection() {
    return `
      <div>
        <label class="form-label" style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>Describe your bill or paste the receipt:</span>
          <span style="font-weight: 400; color: var(--text-muted); font-size: 12px;">Powered by Google Gemini</span>
        </label>
        
        <textarea id="ai-calc-prompt" class="form-input" rows="4" 
          placeholder="Type or paste your bill details here, e.g.:&#10;Dinner ₹1200 with Rohan and Priya. Priya paid the bill. Rohan had a ₹300 dessert. Split the rest equally." 
          style="font-size: 14px; line-height: 1.5; resize: vertical; border-radius: 10px; margin-bottom: 16px;"
          oninput="calcState.aiPrompt = this.value">${escapeHtml(calcState.aiPrompt)}</textarea>

        <button type="button" class="btn btn-primary btn-lg btn-block" id="btn-run-ai-calc" onclick="runAiCalculation()" style="border-radius: 10px; font-size: 15px; font-weight: 700;">
          ✨ Calculate Split with AI &rarr;
        </button>
      </div>
    `;
}

function renderManualSection() {
    const m = calcState.manual;
    return `
      <div>
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Bill Title</label>
            <input type="text" id="m-title" class="form-input" value="${escapeHtml(m.title)}" placeholder="e.g. Dinner, Groceries, Hotel" oninput="calcState.manual.title = this.value">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Total Amount</label>
            <div style="position: relative;">
              <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 700; color: var(--text-muted);">${calcState.currency}</span>
              <input type="number" id="m-total" class="form-input" style="padding-left: 28px;" value="${m.total || ''}" step="0.01" min="0" placeholder="0.00" oninput="calcState.manual.total = this.value">
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Currency</label>
            <select id="m-currency" class="form-select" onchange="calcState.currency = this.value">
              <option value="₹" ${calcState.currency === '₹' ? 'selected' : ''}>INR (₹)</option>
              <option value="$" ${calcState.currency === '$' ? 'selected' : ''}>USD ($)</option>
              <option value="€" ${calcState.currency === '€' ? 'selected' : ''}>EUR (€)</option>
              <option value="£" ${calcState.currency === '£' ? 'selected' : ''}>GBP (£)</option>
              <option value="A$" ${calcState.currency === 'A$' ? 'selected' : ''}>AUD (A$)</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 20px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Tip (%)</label>
            <input type="number" id="m-tip" class="form-input" value="${m.tipPercent || ''}" step="1" min="0" placeholder="0" oninput="calcState.manual.tipPercent = parseFloat(this.value) || 0">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Tax (%)</label>
            <input type="number" id="m-tax" class="form-input" value="${m.taxPercent || ''}" step="0.1" min="0" placeholder="0" oninput="calcState.manual.taxPercent = parseFloat(this.value) || 0">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Who Paid Full Bill?</label>
            <input type="text" id="m-payer" class="form-input" value="${escapeHtml(m.payerName)}" placeholder="Payer Name" oninput="calcState.manual.payerName = this.value">
          </div>
        </div>

        <!-- Friends List -->
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <label class="form-label" style="margin-bottom: 0; font-weight: 700; color: var(--text-primary);">
              Split Between (${m.people.length} people)
            </label>
            <button type="button" class="btn btn-secondary btn-sm" onclick="addManualPerson()">+ Add Person</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${m.people.map((p, idx) => `
              <div style="display: flex; gap: 10px; align-items: center; background: var(--bg-muted); border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: 10px;">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--accent-primary-subtle); color: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;">
                  ${p.name ? p.name.charAt(0).toUpperCase() : (idx + 1)}
                </div>
                <input type="text" id="m-person-name-${idx}" class="form-input" style="flex: 2; font-size: 13px;" value="${escapeHtml(p.name)}" placeholder="Person ${idx + 1}" oninput="calcState.manual.people[${idx}].name = this.value">
                <input type="number" id="m-person-amt-${idx}" class="form-input" style="flex: 1.5; font-size: 13px;" value="${p.customAmount !== '' && p.customAmount != null ? p.customAmount : ''}" placeholder="Custom (leave empty for equal)" oninput="calcState.manual.people[${idx}].customAmount = this.value ? parseFloat(this.value) : ''">
                ${m.people.length > 2 ? `
                  <button type="button" class="btn btn-secondary btn-sm" onclick="removeManualPerson(${idx})" style="color: var(--danger-primary); padding: 4px 8px;" title="Remove">✕</button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <button type="button" class="btn btn-primary btn-lg btn-block" id="btn-run-manual-calc" onclick="runManualCalculation()" style="border-radius: 10px; font-size: 15px; font-weight: 700;">
          Calculate Split &rarr;
        </button>
      </div>
    `;
}

function renderReceiptCard(res) {
    const cur = res.currency || '$';
    const total = Number(res.total || 0).toFixed(2);
    const subtotal = Number(res.subtotal || 0).toFixed(2);
    const tax = Number(res.taxAmount || 0).toFixed(2);
    const tip = Number(res.tipAmount || 0).toFixed(2);
    const payer = res.payerName || 'Payer';

    const payload = encodeURIComponent(JSON.stringify(res));
    const publicReceiptUrl = `${window.location.origin}${window.location.pathname}#/receipt?data=${payload}`;
    const waShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${res.whatsAppText}\n\n🔗 View Digital Receipt:\n${publicReceiptUrl}`)}`;

    return `
      <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 18px; box-shadow: var(--shadow-md); overflow: hidden; position: relative;">
        
        <!-- Top Ribbon -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 14px 24px; color: #FFFFFF; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span style="font-weight: 800; font-size: 15px; letter-spacing: 0.3px;">Calculation Complete</span>
          </div>
          <span style="font-size: 12px; background: rgba(255,255,255,0.25); padding: 3px 10px; border-radius: 9999px; font-weight: 700;">Zero-Drift Exact</span>
        </div>

        <div style="padding: 28px 24px;">
          <!-- Bill Title & Total Hero -->
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px dashed var(--border-subtle); margin-bottom: 20px;">
            <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 4px;">
              ${escapeHtml(res.title || 'Shared Bill')}
            </div>
            <div style="font-size: 40px; font-weight: 900; color: var(--text-primary); letter-spacing: -1px;">
              ${cur}${total}
            </div>
            <div style="font-size: 13px; color: var(--accent-primary); font-weight: 700; margin-top: 4px;">
              💳 Paid in full by <strong>${escapeHtml(payer)}</strong>
            </div>

            ${(tax > 0 || tip > 0) ? `
              <div style="display: flex; justify-content: center; gap: 16px; margin-top: 10px; font-size: 12px; color: var(--text-muted);">
                <span>Subtotal: ${cur}${subtotal}</span>
                ${tax > 0 ? `<span>Tax: ${cur}${tax}</span>` : ''}
                ${tip > 0 ? `<span>Tip: ${cur}${tip}</span>` : ''}
              </div>
            ` : ''}
          </div>

          <!-- Individual Breakdown Cards -->
          <div style="margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 10px;">
              Each Person's Share (${res.people.length} people)
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${res.people.map(p => {
                  const isPayer = p.name === payer;
                  const shareStr = `${cur}${Number(p.share).toFixed(2)}`;
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: ${isPayer ? 'var(--accent-emerald-subtle)' : 'var(--bg-muted)'}; border: 1px solid ${isPayer ? 'var(--accent-emerald-border)' : 'var(--border-subtle)'}; border-radius: 12px;">
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 34px; height: 34px; border-radius: 50%; background: ${isPayer ? 'var(--accent-emerald)' : 'var(--accent-primary)'}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;">
                          ${p.name ? p.name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">
                            ${escapeHtml(p.name)}
                            ${isPayer ? `<span style="font-size: 11px; background: rgba(5,150,105,0.15); color: var(--accent-emerald); padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: 700;">Paid Full</span>` : ''}
                          </div>
                          ${p.note ? `<div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(p.note)}</div>` : ''}
                        </div>
                      </div>

                      <div style="text-align: right;">
                        <div style="font-size: 16px; font-weight: 800; color: var(--text-primary); font-family: var(--font-code);">${shareStr}</div>
                        <div style="font-size: 11px; font-weight: 700; color: ${isPayer ? 'var(--accent-emerald)' : 'var(--danger-primary)'};">
                          ${isPayer ? 'Settled (Paid)' : `Owes ${shareStr}`}
                        </div>
                      </div>
                    </div>
                  `;
              }).join('')}
            </div>
          </div>

          <!-- Settlements Transfer Box -->
          ${res.settlements && res.settlements.length > 0 ? `
            <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 16px; margin-bottom: 24px;">
              <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                <span>💸 Direct Payments Needed</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${res.settlements.map(s => `
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding: 6px 0; border-bottom: 1px dashed var(--border-subtle);">
                    <div style="color: var(--text-secondary);">
                      👉 <strong>${escapeHtml(s.from)}</strong> pays <strong>${escapeHtml(s.to)}</strong>
                    </div>
                    <div style="font-weight: 800; color: var(--text-primary); font-family: var(--font-code);">
                      ${cur}${Number(s.amount).toFixed(2)}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Big Action Buttons: WhatsApp & Copy -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            
            <!-- WhatsApp Button -->
            <a href="${waShareUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-lg" style="background: #25D366; color: #FFFFFF; border: none; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 20px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.35); transition: transform 0.15s ease;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.159.57 4.184 1.564 5.938l-1.664 6.082 6.257-1.642c1.677.915 3.597 1.434 5.637 1.434 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z"/>
              </svg>
              Share Breakdown to WhatsApp &rarr;
            </a>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="copyWhatsAppText()" style="font-weight: 600; font-size: 13px;">
                📋 Copy WhatsApp Text
              </button>
              <button type="button" class="btn btn-secondary" onclick="copyShareLink()" style="font-weight: 600; font-size: 13px;">
                🔗 Copy Receipt Link
              </button>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div style="background: var(--bg-muted); border-top: 1px dashed var(--border-subtle); padding: 14px 20px; font-size: 12px; color: var(--text-muted); text-align: center;">
          ⚡ Shared via SplitSmart AI Quick Split &bull; Recipient does not need to log in to view!
        </div>

      </div>
    `;
}

/**
 * Public Standalone Digital Receipt View (ZERO LOGIN REQUIRED)
 * Accessed via #/receipt?data=... or #/receipt?id=...
 */
async function renderPublicReceiptView() {
    const content = document.getElementById('app-content');
    if (!content) return;

    let res = null;
    const hash = window.location.hash || '';
    const queryStr = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(queryStr);

    const rawData = params.get('data');
    const receiptId = params.get('id');

    if (rawData) {
        try {
            res = JSON.parse(decodeURIComponent(rawData));
        } catch (_) {}
    } else if (receiptId) {
        try {
            content.innerHTML = `
              <div style="text-align: center; padding: 60px 0; color: var(--text-muted);">
                <div style="display: inline-block; width: 24px; height: 24px; border: 2px solid var(--accent-primary); border-top-color: transparent; border-radius: 50%; animation: spin 0.7s linear infinite; margin-bottom: 12px;"></div>
                <div>Fetching verified digital receipt...</div>
              </div>
            `;
            const apiRes = await fetch(`/api/ai/receipt/${receiptId}`).then(r => r.json());
            if (apiRes.success && apiRes.data) {
                res = apiRes.data;
            }
        } catch (_) {}
    }

    if (!res || !res.people || !res.total) {
        content.innerHTML = `
          <div style="max-width: 500px; margin: 60px auto; padding: 32px 20px; text-align: center;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-muted); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: var(--text-muted); font-size: 22px;">
              🧾
            </div>
            <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">Digital Receipt Not Found</h2>
            <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 24px;">
              This receipt link appears to be incomplete or expired. Ask your friend to share the receipt link again.
            </p>
            <a href="#/" class="btn btn-primary">Go to SplitSmart Home &rarr;</a>
          </div>
        `;
        return;
    }

    const cur = res.currency || '$';
    const total = Number(res.total || 0).toFixed(2);
    const subtotal = Number(res.subtotal || 0).toFixed(2);
    const tax = Number(res.taxAmount || 0).toFixed(2);
    const tip = Number(res.tipAmount || 0).toFixed(2);
    const payer = res.payerName || 'Friend';

    content.innerHTML = `
      <div style="max-width: 580px; margin: 40px auto; padding: 0 16px;">
        
        <!-- Public Verified Brand Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="#/" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; margin-bottom: 12px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #003087 0%, #0070BA 100%); display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <span style="font-size: 18px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.3px;">Split<span style="color: var(--accent-primary);">Smart</span></span>
          </a>
          <div style="font-size: 13px; color: var(--text-muted);">Verified Shared Digital Receipt &bull; Zero login required</div>
        </div>

        <!-- Receipt Paper Card -->
        <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 20px; box-shadow: 0 16px 40px rgba(0,0,0,0.12); overflow: hidden; position: relative;">
          
          <!-- Top Badge Ribbon -->
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 14px 20px; color: #FFFFFF; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span style="font-weight: 800; font-size: 14px; letter-spacing: 0.3px;">Verified Bill Summary</span>
            </div>
            <span style="font-size: 11px; background: rgba(255,255,255,0.25); padding: 3px 8px; border-radius: 9999px; font-weight: 700;">Fair Split</span>
          </div>

          <div style="padding: 28px 24px;">
            
            <!-- Hero Amount -->
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px dashed var(--border-subtle); margin-bottom: 20px;">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 4px;">
                ${escapeHtml(res.title || 'Shared Bill')}
              </div>
              <div style="font-size: 42px; font-weight: 900; color: var(--text-primary); letter-spacing: -1.2px; font-family: var(--font-code);">
                ${cur}${total}
              </div>
              <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--accent-primary); font-weight: 700; margin-top: 6px; background: var(--accent-primary-subtle); padding: 4px 12px; border-radius: 9999px;">
                <span>💳 Paid in full by <strong>${escapeHtml(payer)}</strong></span>
              </div>

              ${(tax > 0 || tip > 0) ? `
                <div style="display: flex; justify-content: center; gap: 16px; margin-top: 12px; font-size: 12px; color: var(--text-muted);">
                  <span>Subtotal: ${cur}${subtotal}</span>
                  ${tax > 0 ? `<span>Tax: ${cur}${tax}</span>` : ''}
                  ${tip > 0 ? `<span>Tip: ${cur}${tip}</span>` : ''}
                </div>
              ` : ''}
            </div>

            <!-- Individual Shares -->
            <div style="margin-bottom: 24px;">
              <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 10px;">
                Breakdown by Person (${res.people.length} friends)
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${res.people.map(p => {
                    const isPayer = p.name === payer;
                    const shareStr = `${cur}${Number(p.share).toFixed(2)}`;
                    return `
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: ${isPayer ? 'var(--accent-emerald-subtle)' : 'var(--bg-muted)'}; border: 1px solid ${isPayer ? 'var(--accent-emerald-border)' : 'var(--border-subtle)'}; border-radius: 12px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                          <div style="width: 34px; height: 34px; border-radius: 50%; background: ${isPayer ? 'var(--accent-emerald)' : 'var(--accent-primary)'}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;">
                            ${p.name ? p.name.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <div>
                            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">
                              ${escapeHtml(p.name)}
                              ${isPayer ? `<span style="font-size: 11px; background: rgba(5,150,105,0.15); color: var(--accent-emerald); padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: 700;">Paid Full Bill</span>` : ''}
                            </div>
                            ${p.note ? `<div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(p.note)}</div>` : ''}
                          </div>
                        </div>

                        <div style="text-align: right;">
                          <div style="font-size: 16px; font-weight: 800; color: var(--text-primary); font-family: var(--font-code);">${shareStr}</div>
                          <div style="font-size: 11px; font-weight: 700; color: ${isPayer ? 'var(--accent-emerald)' : 'var(--danger-primary)'};">
                            ${isPayer ? 'Settled (Paid)' : `Owes ${shareStr}`}
                          </div>
                        </div>
                      </div>
                    `;
                }).join('')}
              </div>
            </div>

            <!-- Direct Transfers -->
            ${res.settlements && res.settlements.length > 0 ? `
              <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 16px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 10px;">
                  💸 What Needs to be Sent:
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  ${res.settlements.map(s => `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding: 6px 0; border-bottom: 1px dashed var(--border-subtle);">
                      <div style="color: var(--text-secondary);">
                        👉 <strong>${escapeHtml(s.from)}</strong> sends <strong>${escapeHtml(s.to)}</strong>
                      </div>
                      <div style="font-weight: 800; color: var(--text-primary); font-family: var(--font-code);">
                        ${cur}${Number(s.amount).toFixed(2)}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- 1-Click Copy Receipt Summary -->
            <button type="button" class="btn btn-secondary btn-block" onclick="copyReceiptSummaryText('${escapeHtml(encodeURIComponent(JSON.stringify(res)))}')" style="font-weight: 700; font-size: 13px;">
              📋 Copy Receipt Summary to Clipboard
            </button>
          </div>

          <!-- Bottom Pitch -->
          <div style="background: var(--bg-muted); border-top: 1px dashed var(--border-subtle); padding: 16px 20px; font-size: 13px; color: var(--text-muted); text-align: center;">
            <div>Track, split, and settle all your group expenses effortlessly with SplitSmart.</div>
            <a href="#/signup" style="display: inline-block; margin-top: 6px; font-weight: 700; color: var(--accent-primary);">Create Free Account &rarr;</a>
          </div>

        </div>

      </div>
    `;
}

function copyReceiptSummaryText(encodedRes) {
    try {
        const res = JSON.parse(decodeURIComponent(encodedRes));
        const cur = res.currency || '$';
        const lines = [
            `🧾 ${res.title || 'Shared Bill'} - Total: ${cur}${Number(res.total).toFixed(2)}`,
            `Paid by: ${res.payerName || 'Friend'}`,
            `─────────────────────`
        ];
        res.people.forEach(p => {
            lines.push(`• ${p.name}: ${cur}${Number(p.share).toFixed(2)}`);
        });
        if (res.settlements && res.settlements.length > 0) {
            lines.push(`─────────────────────`);
            res.settlements.forEach(s => {
                lines.push(`👉 ${s.from} pays ${s.to}: ${cur}${Number(s.amount).toFixed(2)}`);
            });
        }
        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            showToast('Receipt summary copied to clipboard!', 'success');
        });
    } catch (_) {
        showToast('Could not copy summary.', 'error');
    }
}

function setCalcMode(mode) {
    syncInputsToState();
    calcState.mode = mode;
    renderCalculatorView();
}

function setSamplePrompt(promptText) {
    const el = document.getElementById('ai-calc-prompt');
    if (el) {
        el.value = promptText;
        calcState.aiPrompt = promptText;
        el.focus();
    }
}

async function runAiCalculation() {
    syncInputsToState();
    const textPrompt = (calcState.aiPrompt || '').trim();
    const btn = document.getElementById('btn-run-ai-calc');

    if (!textPrompt) {
        showToast('Please type or paste a bill description.', 'error');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Calculating with AI...';
    }

    try {
        const res = await API.post('/ai/quick-calculator', { textPrompt });
        if (res.success) {
            calcState.currentResult = res;
            renderCalculatorView();
            showToast('Calculated! Ready to share to WhatsApp.', 'success');
            scrollResultIntoView();
        } else {
            throw new Error(res.message || 'Calculation failed.');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = '✨ Calculate Split with AI →';
        }
    }
}

async function runManualCalculation() {
    syncInputsToState();
    const title = (calcState.manual.title || '').trim() || 'Shared Bill';
    const total = parseFloat(calcState.manual.total) || 0;
    const currency = calcState.currency || '₹';
    const tipPercent = calcState.manual.tipPercent || 0;
    const taxPercent = calcState.manual.taxPercent || 0;
    const payerName = (calcState.manual.payerName || '').trim() || calcState.manual.people[0]?.name || 'Payer';
    const btn = document.getElementById('btn-run-manual-calc');

    if (total <= 0) {
        showToast('Please enter a total bill amount greater than 0.', 'error');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Calculating...';
    }

    try {
        const manualData = {
            title,
            total,
            currency,
            tipPercent,
            taxPercent,
            payerName,
            people: calcState.manual.people
        };

        const res = await API.post('/ai/quick-calculator', { manualData });
        if (res.success) {
            calcState.currentResult = res;
            renderCalculatorView();
            showToast('Calculation updated! Ready to share.', 'success');
            scrollResultIntoView();
        } else {
            throw new Error(res.message || 'Calculation failed.');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Calculate Split →';
        }
    }
}

function addManualPerson() {
    syncInputsToState();
    calcState.manual.people.push({
        name: `Person ${calcState.manual.people.length + 1}`,
        customAmount: ''
    });
    renderCalculatorView();
}

function removeManualPerson(idx) {
    syncInputsToState();
    if (calcState.manual.people.length > 2) {
        calcState.manual.people.splice(idx, 1);
        renderCalculatorView();
    }
}

function updatePersonName(idx, val) {
    if (calcState.manual.people[idx]) {
        calcState.manual.people[idx].name = val.trim() || `Person ${idx + 1}`;
    }
}

function updatePersonAmount(idx, val) {
    if (calcState.manual.people[idx]) {
        calcState.manual.people[idx].customAmount = val ? parseFloat(val) : '';
    }
}

function copyWhatsAppText() {
    if (!calcState.currentResult?.whatsAppText) {
        showToast('No calculation result to copy.', 'error');
        return;
    }

    const payload = encodeURIComponent(JSON.stringify(calcState.currentResult));
    const publicReceiptUrl = `${window.location.origin}${window.location.pathname}#/receipt?data=${payload}`;
    const fullText = `${calcState.currentResult.whatsAppText}\n\n🔗 View Digital Receipt:\n${publicReceiptUrl}`;

    navigator.clipboard.writeText(fullText).then(() => {
        showToast('📋 WhatsApp summary copied to clipboard! Paste directly into WhatsApp.', 'success');
    }).catch(() => {
        showToast('Failed to copy. Please use the green button to open WhatsApp.', 'warning');
    });
}

function copyShareLink() {
    if (!calcState.currentResult) return;
    try {
        const payload = encodeURIComponent(JSON.stringify(calcState.currentResult));
        const shareUrl = `${window.location.origin}${window.location.pathname}#/receipt?data=${payload}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('🔗 Direct digital receipt link copied! Anyone opening it sees this exact receipt without logging in.', 'success');
        });
    } catch (_) {
        showToast('Could not generate share link.', 'error');
    }
}

function parseUrlCalcData() {
    if (calcState.currentResult) return;
    try {
        const hash = window.location.hash || '';
        if (hash.includes('data=')) {
            const raw = new URLSearchParams(hash.split('?')[1]).get('data');
            if (raw) {
                const parsed = JSON.parse(decodeURIComponent(raw));
                if (parsed && parsed.people) {
                    calcState.currentResult = parsed;
                }
            }
        }
    } catch (_) {}
}

function scrollResultIntoView() {
    setTimeout(() => {
        const el = document.getElementById('calc-result-area');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// Expose globals
window.renderCalculatorView = renderCalculatorView;
window.renderPublicReceiptView = renderPublicReceiptView;
window.copyReceiptSummaryText = copyReceiptSummaryText;
window.setCalcMode = setCalcMode;
window.setSamplePrompt = setSamplePrompt;
window.runAiCalculation = runAiCalculation;
window.runManualCalculation = runManualCalculation;
window.addManualPerson = addManualPerson;
window.removeManualPerson = removeManualPerson;
window.updatePersonName = updatePersonName;
window.updatePersonAmount = updatePersonAmount;
window.copyWhatsAppText = copyWhatsAppText;
window.copyShareLink = copyShareLink;
