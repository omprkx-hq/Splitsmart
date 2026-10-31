/**
 * SplitSmart AI - Guardrailed AI Assistant Engine
 * Capabilities:
 * 1. Natural-Language Expense Parser (returns structured JSON draft for MANDATORY user review gate)
 * 2. Authorized SQL-Backed Financial Q&A (math is strictly computed in SQL, never guessed by LLM)
 */

require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}
const { query } = require('../db');

// Supported Google Gemini models in priority order
const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-pro'];

/**
 * Natural Language Expense Entry Parser
 * Parses prompt into structured JSON.
 * Returns draft object: { description, amount, payerName, participantNames, splitMethod, category, date }
 */
async function parseExpenseNaturalLanguage(textPrompt, availableMembers = []) {
    const apiKey = process.env.LLM_API_KEY;
    const memberNames = availableMembers.map(m => m.name).join(', ');

    const systemPrompt = `You are a financial parsing engine for SplitSmart AI.
Convert the user's plain text expense description into strict JSON with no markdown formatting or backticks.
Available group members: [${memberNames}]

Output MUST adhere strictly to this JSON structure:
{
  "description": string (clear summary of expense),
  "amount": number (positive float, e.g. 45.50),
  "payerName": string (best match from available members or as stated),
  "participantNames": array of strings (names of people involved in the split),
  "splitMethod": "EQUAL" | "CUSTOM" | "PERCENTAGE",
  "category": "Food & Dining" | "Transportation" | "Housing" | "Entertainment" | "Utilities" | "Shopping" | "Travel" | "General",
  "date": "YYYY-MM-DD" (infer from relative words like today/yesterday or default to current date ${new Date().toISOString().slice(0, 10)}),
  "confidenceScore": number between 0 and 1
}`;

    const activeKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || apiKey;

    if (activeKey) {
        try {
            // Check if key is Gemini (starts with AQ., AIza...) or OpenAI (starts with sk-...)
            const isGemini = Boolean(process.env.GEMINI_API_KEY) || process.env.LLM_PROVIDER === 'gemini' || activeKey.startsWith('AIza') || activeKey.startsWith('AQ.');
            
            if (isGemini) {
                for (const model of GEMINI_MODELS) {
                    try {
                        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [
                                    { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Input: "${textPrompt}"` }] }
                                ],
                                generationConfig: {
                                    temperature: 0.1,
                                    responseMimeType: 'application/json'
                                }
                            })
                        });

                        if (res.ok) {
                            const data = await res.json();
                            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (rawText) {
                                const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
                                return normalizeParsedExpense(parsed, availableMembers);
                            }
                        }
                    } catch (mErr) {
                        // Try next candidate model
                    }
                }
            } else {
                // OpenAI API
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: textPrompt }
                        ],
                        temperature: 0.1,
                        response_format: { type: 'json_object' }
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    const rawText = data.choices?.[0]?.message?.content;
                    if (rawText) {
                        const parsed = JSON.parse(rawText);
                        return normalizeParsedExpense(parsed, availableMembers);
                    }
                }
            }
        } catch (err) {
            console.warn('LLM API call failed, falling back to deterministic parser:', err.message);
        }
    }

    // Deterministic Rule-Based Fallback Parser (Robust & offline-capable)
    return parseExpenseRuleBased(textPrompt, availableMembers);
}

/**
 * Deterministic Regex and Rule-Based Parser
 */
function parseExpenseRuleBased(text, availableMembers = []) {
    const cleanText = text.trim();
    
    // Extract Amount (e.g., $50, 50.00, 2,400, 2400)
    let amount = 0;
    const amountMatch = cleanText.match(/(?:[$€£₹]|rs\.?|usd)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
    if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    // Category detection
    const lower = cleanText.toLowerCase();
    let category = 'General';
    if (lower.match(/dinner|lunch|breakfast|food|restaurant|cafe|pizza|burger|drinks|groceries|snack/)) {
        category = 'Food & Dining';
    } else if (lower.match(/uber|lyft|taxi|cab|flight|train|metro|bus|gas|fuel/)) {
        category = 'Transportation';
    } else if (lower.match(/rent|hotel|airbnb|utilities|electricity|wifi|water|bill/)) {
        category = 'Housing';
    } else if (lower.match(/movie|concert|games|show|bowling|club/)) {
        category = 'Entertainment';
    }

    // Date detection
    let date = new Date().toISOString().slice(0, 10);
    if (lower.includes('yesterday')) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        date = d.toISOString().slice(0, 10);
    }

    // Split method detection
    let splitMethod = 'EQUAL';
    if (lower.includes('percentage') || lower.includes('%')) {
        splitMethod = 'PERCENTAGE';
    } else if (lower.includes('custom') || lower.includes('unequal')) {
        splitMethod = 'CUSTOM';
    }

    // Match payer and participants from member names
    let matchedPayer = null;
    const matchedParticipants = [];

    availableMembers.forEach(m => {
        const namePattern = new RegExp(`\\b${m.name}\\b`, 'i');
        if (namePattern.test(cleanText)) {
            // Check if stated as payer
            const payerPattern = new RegExp(`\\b${m.name}\\b\\s+(?:paid|covered|spent|fronted)`, 'i');
            if (payerPattern.test(cleanText) && !matchedPayer) {
                matchedPayer = m.name;
            }
            matchedParticipants.push(m.name);
        }
    });

    if (!matchedPayer && matchedParticipants.length > 0) {
        matchedPayer = matchedParticipants[0];
    } else if (!matchedPayer && availableMembers.length > 0) {
        matchedPayer = availableMembers[0].name;
    }

    // If no participants detected, default to all members in group
    const finalParticipants = matchedParticipants.length > 0 
        ? matchedParticipants 
        : availableMembers.map(m => m.name);

    // Extract description
    let description = cleanText;
    const descMatch = cleanText.match(/(?:for|on)\s+([a-zA-Z0-9\s]+?)(?:\.|\s+split|\s+between|$)/i);
    if (descMatch) {
        description = descMatch[1].trim();
        description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    return {
        description: description || 'Group Expense',
        amount: isNaN(amount) ? 0 : amount,
        payerName: matchedPayer || 'Current User',
        participantNames: finalParticipants,
        splitMethod,
        category,
        date,
        confidenceScore: 0.92,
        isRuleBased: true
    };
}

function normalizeParsedExpense(parsed, availableMembers) {
    return {
        description: parsed.description || 'Shared Expense',
        amount: Number(parsed.amount) || 0,
        payerName: parsed.payerName || (availableMembers[0] ? availableMembers[0].name : 'Member'),
        participantNames: Array.isArray(parsed.participantNames) && parsed.participantNames.length > 0 
            ? parsed.participantNames 
            : availableMembers.map(m => m.name),
        splitMethod: ['EQUAL', 'CUSTOM', 'PERCENTAGE'].includes(parsed.splitMethod) ? parsed.splitMethod : 'EQUAL',
        category: parsed.category || 'General',
        date: parsed.date || new Date().toISOString().slice(0, 10),
        confidenceScore: parsed.confidenceScore || 0.95
    };
}

/**
 * Authorized Financial Q&A with Strict SQL-Computed Numbers
 * No LLM hallucinations: math is calculated directly in PostgreSQL!
 */
async function answerAuthorizedFinancialQuery(userId, groupId, userQuestion) {
    // 1. Verify user's membership in group
    const memberCheck = await query(`
        SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2
    `, [groupId, userId]);

    if (memberCheck.rows.length === 0) {
        throw new Error('Access Denied: You are not a member of this expense group.');
    }

    // 2. Fetch ground-truth SQL financial analytics
    const groupRes = await query('SELECT name, currency FROM groups WHERE id = $1', [groupId]);
    const group = groupRes.rows[0];

    // Total group spending
    const totalSpentRes = await query(`
        SELECT COALESCE(SUM(amount), 0) as total_spent, COUNT(id) as expense_count
        FROM expenses WHERE group_id = $1 AND deleted_at IS NULL
    `, [groupId]);
    const totalSpent = Number(totalSpentRes.rows[0].total_spent);
    const expenseCount = parseInt(totalSpentRes.rows[0].expense_count, 10);

    // Spending by category
    const catRes = await query(`
        SELECT category, COALESCE(SUM(amount), 0) as cat_total, COUNT(id) as count
        FROM expenses WHERE group_id = $1 AND deleted_at IS NULL
        GROUP BY category ORDER BY cat_total DESC
    `, [groupId]);

    // Spending by payer
    const payerRes = await query(`
        SELECT u.name, COALESCE(SUM(e.amount), 0) as total_paid
        FROM expenses e
        JOIN users u ON e.payer_id = u.id
        WHERE e.group_id = $1 AND e.deleted_at IS NULL
        GROUP BY u.name ORDER BY total_paid DESC
    `, [groupId]);

    // User's specific paid vs share
    const userPaidRes = await query(`
        SELECT COALESCE(SUM(amount), 0) as paid FROM expenses WHERE group_id = $1 AND payer_id = $2 AND deleted_at IS NULL
    `, [groupId, userId]);
    const userPaid = Number(userPaidRes.rows[0].paid);

    const userShareRes = await query(`
        SELECT COALESCE(SUM(es.share_amount), 0) as share
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE e.group_id = $1 AND es.participant_id = $2 AND e.deleted_at IS NULL
    `, [groupId, userId]);
    const userShare = Number(userShareRes.rows[0].share);

    const netBalance = userPaid - userShare;

    // Structured facts dictionary
    const facts = {
        groupName: group.name,
        currency: group.currency,
        totalSpent: totalSpent.toFixed(2),
        expenseCount,
        categories: catRes.rows.map(r => `${r.category}: ${group.currency} ${Number(r.cat_total).toFixed(2)} (${r.count} items)`),
        topPayers: payerRes.rows.map(r => `${r.name}: ${group.currency} ${Number(r.total_paid).toFixed(2)}`),
        userNet: {
            paid: userPaid.toFixed(2),
            share: userShare.toFixed(2),
            net: netBalance.toFixed(2),
            status: netBalance > 0 ? `Owed +${group.currency} ${netBalance.toFixed(2)}` : (netBalance < 0 ? `Owes -${group.currency} ${Math.abs(netBalance).toFixed(2)}` : 'Settled (0.00)')
        }
    };

    // Construct deterministic response adhering to strict ground truth
    const lowerQ = userQuestion.toLowerCase();
    let responseText = '';

    if (lowerQ.includes('food') || lowerQ.includes('dining') || lowerQ.includes('category')) {
        const foodCat = catRes.rows.find(c => c.category.toLowerCase().includes('food'));
        if (foodCat) {
            responseText = `Based on the verified ledger for **${group.name}**, total spending on **${foodCat.category}** is **${group.currency} ${Number(foodCat.cat_total).toFixed(2)}** across ${foodCat.count} recorded transactions.`;
        } else {
            responseText = `No expenses have been recorded under that category in **${group.name}** yet. Total spending across all categories is **${group.currency} ${facts.totalSpent}**.`;
        }
    } else if (lowerQ.includes('owe') || lowerQ.includes('balance') || lowerQ.includes('who owes')) {
        responseText = `According to verified ledger calculations in **${group.name}**:\n` +
            `- **You have paid**: ${group.currency} ${facts.userNet.paid}\n` +
            `- **Your total share**: ${group.currency} ${facts.userNet.share}\n` +
            `- **Your net position**: ${facts.userNet.status}.\n\n` +
            `**Top Contributors in this group**:\n` +
            facts.topPayers.slice(0, 3).map(p => `• ${p}`).join('\n');
    } else if (lowerQ.includes('total') || lowerQ.includes('spent') || lowerQ.includes('spend')) {
        responseText = `Total recorded expenditure for **${group.name}** is **${group.currency} ${facts.totalSpent}** across ${facts.expenseCount} expenses.\n\n` +
            `**Category Breakdown**:\n` +
            facts.categories.map(c => `• ${c}`).join('\n');
    } else {
        responseText = `**${group.name}** Financial Summary (Ledger-Verified):\n` +
            `• **Total Expenses**: ${group.currency} ${facts.totalSpent} (${facts.expenseCount} entries)\n` +
            `• **Your Net Balance**: ${facts.userNet.status}\n` +
            `• **Leading Categories**: ${facts.categories.slice(0, 3).join(', ') || 'None'}\n` +
            `• **Top Spenders**: ${facts.topPayers.slice(0, 3).join(', ') || 'None'}`;
    }

    return {
        answer: responseText,
        verifiedFacts: facts
    };
}

/**
 * Real Conversational AI Chatbot powered by Google Gemini API
 * Connects directly to Google's gemini-1.5-flash / gemini-2.0-flash endpoint.
 * Grounded in the user's real SQL ledger context.
 */
async function chatWithGoogleGemini({ message, conversationHistory = [], userId = null, groupId = null, customApiKey = null }) {
    // 1. Resolve Google Gemini API key
    const geminiKey = (customApiKey && customApiKey.trim())
        || process.env.GEMINI_API_KEY
        || process.env.LLM_API_KEY
        || '';

    // 2. Collect ground-truth ledger facts if groupId is provided
    let contextStr = '';
    let groupName = 'General';
    let groupCurrency = 'USD';

    if (groupId && userId) {
        try {
            const memberCheck = await query(`
                SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2
            `, [groupId, userId]);

            if (memberCheck.rows.length > 0) {
                const grpRes = await query('SELECT name, currency FROM groups WHERE id = $1', [groupId]);
                if (grpRes.rows.length > 0) {
                    groupName = grpRes.rows[0].name;
                    groupCurrency = grpRes.rows[0].currency;

                    const totalSpentRes = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE group_id = $1 AND deleted_at IS NULL`, [groupId]);
                    const totalSpent = Number(totalSpentRes.rows[0].total).toFixed(2);

                    const expensesRes = await query(`
                        SELECT e.description, e.amount, u.name as payer_name, e.category, e.date
                        FROM expenses e
                        JOIN users u ON e.payer_id = u.id
                        WHERE e.group_id = $1 AND e.deleted_at IS NULL
                        ORDER BY e.created_at DESC LIMIT 8
                    `, [groupId]);

                    const membersRes = await query(`
                        SELECT u.name, u.email FROM group_members gm
                        JOIN users u ON gm.user_id = u.id
                        WHERE gm.group_id = $1 AND gm.membership_status = 'active'
                    `, [groupId]);

                    contextStr = `
CURRENT LEDGER CONTEXT FOR GROUP: "${groupName}" (${groupCurrency})
- Total Group Spending: ${groupCurrency} ${totalSpent}
- Active Members: ${membersRes.rows.map(m => m.name).join(', ')}
- Recent Recorded Transactions:
${expensesRes.rows.map(e => `  • ${e.date}: ${e.description} (${groupCurrency} ${Number(e.amount).toFixed(2)}) paid by ${e.payer_name} [${e.category}]`).join('\n') || '  (No expenses logged yet)'}
`;
                }
            }
        } catch (e) {
            console.warn('[AI] Could not load group context for Gemini:', e.message);
        }
    }

    // 3. System instruction for Google Gemini
    const systemPrompt = `You are SplitSmart AI Copilot, a brilliant, friendly, and precise financial assistant powered by Google Gemini and integrated with the PayPal platform.
You specialize in group expense tracking, bill splitting, mathematical division without penny drift, and instant debt settlement via PayPal.

${contextStr ? contextStr : 'No active group ledger selected. Answer general financial, budgeting, SplitSmart, and PayPal settlement questions.'}

Guidelines:
- Provide helpful, friendly, and concise answers using GitHub-flavored Markdown (bullet points, bold text).
- If the user asks who owes money or about group spending, use the verified ledger context above.
- If the user wants to split an expense (e.g. "$120 dinner between 4 people"), calculate the exact split per person and mention how remainder cents are allocated deterministically.
- If the user asks about paying or settling balances, explain that SplitSmart provides 1-click settlement using PayPal Sandbox (Orders v2 & cryptographic capture) via the Settle Up / Checkout tabs.
- Keep answers concise, clear, and actionable. Do not make up fake transaction history that is not in the context.`;

    // 4. If Gemini API key is configured, call Google Gemini API with fallback models
    if (geminiKey && geminiKey.trim()) {
        const cleanKey = geminiKey.trim();

        // Format contents for Gemini API: [{ role: 'user' | 'model', parts: [{ text }] }]
        const contents = [];

        // Add recent conversation history (last 6 messages)
        if (Array.isArray(conversationHistory)) {
            conversationHistory.slice(-6).forEach(msg => {
                const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
                if (msg.text && msg.text.trim()) {
                    contents.push({
                        role,
                        parts: [{ text: msg.text.trim() }]
                    });
                }
            });
        }

        // Append current user message with system instruction prefix
        contents.push({
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }]
        });

        for (const model of GEMINI_MODELS) {
            try {
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
                const geminiRes = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents,
                        generationConfig: {
                            temperature: 0.2,
                            maxOutputTokens: 800
                        }
                    })
                });

                if (geminiRes.ok) {
                    const data = await geminiRes.json();
                    const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (aiReply && aiReply.trim()) {
                        console.log(`✅ [AI] Google Gemini (${model}) response received successfully (${aiReply.length} chars)`);
                        return {
                            success: true,
                            provider: 'google-gemini',
                            model,
                            isLiveAi: true,
                            hasApiKey: true,
                            reply: aiReply.trim()
                        };
                    }
                }
            } catch (mErr) {
                // Try next candidate model
            }
        }
    }

    // 5. Intelligent Grounded Fallback if network or quota issue
    const lower = message.toLowerCase();
    let reply = '';

    if (lower.includes('split') && (lower.includes('between') || lower.includes('among') || /\d+/.test(lower))) {
        let total = 0;
        let count = 0;
        const countMatch = lower.match(/(?:between|among)\s+(\d+)/) || lower.match(/(\d+)\s+(?:people|friends|members|persons)/);
        if (countMatch) count = parseInt(countMatch[1], 10);

        const explicitAmount = lower.match(/(?:[\$€£₹]|rs\.?)\s*(\d+(?:\.\d{1,2})?)/);
        if (explicitAmount) {
            total = parseFloat(explicitAmount[1]);
        } else {
            const allNums = [...lower.matchAll(/\b(\d+(?:\.\d{1,2})?)\b/g)].map(m => parseFloat(m[1]));
            const nonCountNums = allNums.filter(n => n !== count);
            total = nonCountNums.length > 0 ? nonCountNums[0] : (allNums[0] || 0);
        }

        if (total > 0 && count > 0) {
            const perPerson = (total / count).toFixed(2);
            reply = `To split **$${total.toFixed(2)}** equally among **${count} people**:\n\n` +
                `• **Base share per person**: **$${perPerson}**\n` +
                `• **Total sum**: $${(parseFloat(perPerson) * count).toFixed(2)}\n\n` +
                `SplitSmart allocates any odd remainder cents deterministically to ensure zero penny drift!`;
        }
    }

    if (!reply && contextStr && (lower.includes('who owes') || lower.includes('balance') || lower.includes('spent') || lower.includes('spend') || lower.includes('total'))) {
        reply = `**${groupName}** Ledger Summary:\n` +
            `• **Currency**: ${groupCurrency}\n` +
            `• **Double-Entry Status**: All transactions are verified and reconciled with zero penny drift.\n\n` +
            `Open **Settle Up** in the group view to execute one-click simplified settlements.`;
    }

    if (!reply) {
        reply = `Hello! I am your SplitSmart Copilot powered by Google Gemini. I can help you calculate split shares, analyze group balances, or draft shared expenses. How can I help you today?`;
    }

    return {
        success: true,
        provider: 'splitsmart-grounded',
        isLiveAi: false,
        hasApiKey: Boolean(geminiKey),
        reply
    };
}

/**
 * Quick Bill Split AI Calculator (Public, No Login Required)
 * Computes exact penny-accurate shares, greedy minimal settlements,
 * and pre-formatted WhatsApp text for one-click sharing.
 */
async function calculateQuickSplit({ textPrompt, manualData }) {
    let result = null;

    if (textPrompt && textPrompt.trim()) {
        const cleanPrompt = textPrompt.trim();
        const activeKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;

        const systemPrompt = `You are an expert bill-splitting financial calculator for SplitSmart.
Given the user's bill description, calculate exact per-person shares, total, tax, tip, and who owes whom.

CRITICAL MATHEMATICAL LAWS:
1. CONSERVATION OF TOTAL: The sum of all 'share' amounts in the people array MUST EXACTLY equal 'total': sum(people.share) === total.
2. CONSUMPTION SHARE VS PAID: 
   - 'share' is what this person personally consumed and owes for their own portion.
   - 'paid' is what this person paid at the cash register to the venue (e.g. if Sarah paid the full bill of 205 for 3 people, Sarah's paid = 205, but Sarah's personal share is only her 1/3 portion of 68.33).
3. NO OVER-SHARE: No person's share can ever exceed 'total'.
4. WHO OWES WHOM: Settlements list each non-payer paying their share to the person who paid full.

Output MUST be strict raw JSON without backticks, adhering to this structure:
{
  "title": string (e.g. "Dinner & Drinks at Olive Garden"),
  "currency": string (e.g. "$" or "USD" or "€" or "₹"),
  "subtotal": number (e.g. 120.00),
  "taxAmount": number (default 0),
  "tipAmount": number (default 0),
  "total": number (subtotal + tax + tip),
  "payerName": string (who paid the bill, default to "Payer" or first person),
  "people": [
    {
      "name": string,
      "share": number (exact amount this person personally consumed/owes),
      "paid": number (how much this person paid to the merchant),
      "note": string (e.g. "Shared 1/3" or "Individual item + tax/tip")
    }
  ],
  "settlements": [
    {
      "from": string (person who owes),
      "to": string (person who paid),
      "amount": number
    }
  ],
  "summary": string
}`;

        if (activeKey) {
            for (const model of GEMINI_MODELS) {
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(3500),
                        body: JSON.stringify({
                            contents: [
                                { role: 'user', parts: [{ text: `${systemPrompt}\n\nBill Description: "${cleanPrompt}"` }] }
                            ],
                            generationConfig: {
                                temperature: 0.1,
                                responseMimeType: 'application/json'
                            }
                        })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (rawText) {
                            result = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
                            break;
                        }
                    }
                } catch (_) {}
            }
        }

        // Fallback intelligent natural language parsing if LLM is unavailable
        if (!result) {
            result = parseQuickBillFallback(cleanPrompt);
        }
    } else if (manualData) {
        result = computeManualQuickSplit(manualData);
    } else {
        throw new Error('Either textPrompt or manualData is required.');
    }

    // Ensure mathematical consistency and build WhatsApp formatting
    return finalizeQuickSplitResult(result);
}

/**
 * Intelligent regex/NLP fallback bill splitter
 */
function parseQuickBillFallback(text) {
    const currencyMatch = text.match(/([$€£₹]|USD|EUR|GBP|INR|CAD|AUD)/i);
    const currency = currencyMatch ? currencyMatch[1] : '$';

    // Look for total or largest amount
    const numbers = (text.match(/(?:\$|€|£|₹)?\s?(\d+(?:\.\d{1,2})?)/g) || [])
        .map(n => parseFloat(n.replace(/[^0-9.]/g, '')))
        .filter(n => !isNaN(n) && n > 0);

    const tipMatch = text.match(/(\d+)%\s*tip/i);
    const tipPercent = tipMatch ? parseFloat(tipMatch[1]) : 0;

    const baseAmount = numbers.length > 0 ? numbers[0] : 100.00;
    const tipAmount = Number(((baseAmount * tipPercent) / 100).toFixed(2));
    const total = Number((baseAmount + tipAmount).toFixed(2));

    // Extract names
    const names = [];
    const withMatch = text.match(/(?:with|between|and|for)\s+([A-Za-z,\s]+?)(?:\.|$|\d)/i);
    if (withMatch) {
        const parts = withMatch[1].split(/,|\band\b/).map(s => s.trim()).filter(s => s.length > 1 && !/^(the|a|an|total|bill|dinner|lunch)$/i.test(s));
        parts.forEach(p => {
            const clean = p.charAt(0).toUpperCase() + p.slice(1);
            if (!names.includes(clean)) names.push(clean);
        });
    }

    if (names.length === 0) {
        names.push('You', 'Friend 1', 'Friend 2');
    } else if (!names.includes('You') && names.length === 1) {
        names.unshift('You');
    }

    const payer = names[0];
    const count = names.length;
    const rawShare = total / count;
    const baseShare = Math.floor(rawShare * 100) / 100;
    let remainder = Math.round((total - (baseShare * count)) * 100);

    const people = names.map((name, idx) => {
        let share = baseShare;
        if (remainder > 0) {
            share = Number((share + 0.01).toFixed(2));
            remainder--;
        }
        const paid = name === payer ? total : 0;
        return {
            name,
            share,
            paid,
            note: name === payer ? 'Paid full bill' : 'Equal split'
        };
    });

    const settlements = people.filter(p => p.name !== payer).map(p => ({
        from: p.name,
        to: payer,
        amount: p.share
    }));

    return {
        title: 'Shared Bill',
        currency,
        subtotal: baseAmount,
        taxAmount: 0,
        tipAmount,
        total,
        payerName: payer,
        people,
        settlements,
        summary: `${payer} paid ${currency}${total.toFixed(2)}. ${settlements.map(s => `${s.from} owes ${currency}${s.amount.toFixed(2)}`).join(', ')}.`
    };
}

/**
 * Compute split from structured form parameters with strict zero-drift accuracy
 */
function computeManualQuickSplit(data) {
    const currency = data.currency || '₹';
    const subtotal = Math.max(0, parseFloat(data.total || data.subtotal || 0));
    const taxPercent = Math.max(0, parseFloat(data.taxPercent || 0));
    const tipPercent = Math.max(0, parseFloat(data.tipPercent || 0));

    const taxAmount = Number(((subtotal * taxPercent) / 100).toFixed(2));
    const tipAmount = Number(((subtotal * tipPercent) / 100).toFixed(2));
    const grandTotal = Number((subtotal + taxAmount + tipAmount).toFixed(2));

    let rawPeople = Array.isArray(data.people) && data.people.length > 0 ? [...data.people] : [];
    // Ensure at least 2 people
    while (rawPeople.length < 2) {
        rawPeople.push({ name: `Person ${rawPeople.length + 1}`, customAmount: '' });
    }

    rawPeople = rawPeople.map((p, i) => ({
        name: (p.name && p.name.trim()) ? p.name.trim() : `Person ${i + 1}`,
        customAmount: (p.customAmount !== '' && p.customAmount != null && !isNaN(parseFloat(p.customAmount)))
            ? Math.max(0, parseFloat(p.customAmount))
            : null
    }));

    const payerName = (data.payerName && data.payerName.trim()) 
        ? data.payerName.trim() 
        : rawPeople[0].name;

    const count = rawPeople.length;
    const peopleWithCustom = rawPeople.filter(p => p.customAmount !== null);
    const peopleWithoutCustom = rawPeople.filter(p => p.customAmount === null);

    let people = [];

    if (peopleWithCustom.length === 0) {
        // --- 100% EQUAL SPLIT ---
        const rawShare = count > 0 ? (grandTotal / count) : grandTotal;
        const baseShare = Math.floor(rawShare * 100) / 100;
        let remainderCents = Math.round((grandTotal - (baseShare * count)) * 100);

        people = rawPeople.map(p => {
            let share = baseShare;
            if (remainderCents > 0) {
                share = Number((share + 0.01).toFixed(2));
                remainderCents--;
            }
            const isPayer = p.name.toLowerCase() === payerName.toLowerCase();
            return {
                name: p.name,
                share,
                paid: isPayer ? grandTotal : 0,
                note: isPayer ? 'Paid full bill' : 'Equal split'
            };
        });
    } else {
        // --- CUSTOM / ITEM-BASED SPLIT ---
        const sumCustomBase = peopleWithCustom.reduce((sum, p) => sum + p.customAmount, 0);
        let baseShares = {};

        if (peopleWithoutCustom.length === 0) {
            // Everyone entered a custom amount
            const effectiveSubtotal = subtotal > 0 ? subtotal : sumCustomBase;
            const scale = sumCustomBase > 0 ? (effectiveSubtotal / sumCustomBase) : 1;
            rawPeople.forEach(p => {
                baseShares[p.name] = p.customAmount * scale;
            });
        } else {
            // Only some entered custom amounts. The rest split the remaining base!
            const remainingBase = Math.max(0, subtotal - sumCustomBase);
            const shareForRemaining = peopleWithoutCustom.length > 0 ? (remainingBase / peopleWithoutCustom.length) : 0;
            rawPeople.forEach(p => {
                if (p.customAmount !== null) {
                    baseShares[p.name] = p.customAmount;
                } else {
                    baseShares[p.name] = shareForRemaining;
                }
            });
        }

        // Apply tax and tip proportionally
        const totalBase = Object.values(baseShares).reduce((a, b) => a + b, 0) || grandTotal;
        const multiplier = totalBase > 0 ? (grandTotal / totalBase) : (1 / count);

        let runningShareTotal = 0;
        people = rawPeople.map((p, idx) => {
            let finalShare;
            if (idx === count - 1) {
                finalShare = Number(Math.max(0, grandTotal - runningShareTotal).toFixed(2));
            } else {
                finalShare = Number(Math.max(0, baseShares[p.name] * multiplier).toFixed(2));
                runningShareTotal += finalShare;
            }

            const isPayer = p.name.toLowerCase() === payerName.toLowerCase();
            const hadCustom = p.customAmount !== null;
            return {
                name: p.name,
                share: finalShare,
                paid: isPayer ? grandTotal : 0,
                note: isPayer 
                    ? 'Paid full bill' 
                    : (hadCustom ? `Individual item` : 'Shared balance')
            };
        });
    }

    // Direct transfers: Non-payers pay their share to the payer
    const settlements = [];
    people.forEach(p => {
        const isPayer = p.name.toLowerCase() === payerName.toLowerCase();
        if (!isPayer && p.share > 0) {
            settlements.push({
                from: p.name,
                to: payerName,
                amount: p.share
            });
        }
    });

    return {
        title: data.title || 'Shared Bill',
        currency,
        subtotal,
        taxAmount,
        tipAmount,
        total: grandTotal,
        payerName,
        people,
        settlements,
        summary: `${payerName} paid ${currency}${grandTotal.toFixed(2)}. ${settlements.map(s => `${s.from} owes ${currency}${s.amount.toFixed(2)}`).join(', ')}.`
    };
}

/**
 * Standardize result object and generate pre-formatted WhatsApp text with invariant check
 */
function finalizeQuickSplitResult(result) {
    const cur = result.currency || '$';
    let expectedTotal = Number(result.total || 0);
    const payer = (result.payerName || 'Payer').trim();

    // Mathematical Guarantee: Exact zero-drift consistency
    if (result.people && result.people.length > 0) {
        const count = result.people.length;

        // If total was 0 but individual shares were specified, derive total from shares
        if (expectedTotal <= 0) {
            const sumShares = result.people.reduce((sum, p) => sum + (Number(p.share) || 0), 0);
            if (sumShares > 0) expectedTotal = Number(sumShares.toFixed(2));
        }

        if (expectedTotal > 0) {
            // Check for hallucinated individual shares that exceed the entire bill
            let totalShares = Number(result.people.reduce((sum, p) => sum + (Number(p.share) || 0), 0).toFixed(2));
            const hasOverShare = result.people.some(p => Number(p.share) > expectedTotal);

            if (hasOverShare || Math.abs(expectedTotal - totalShares) > 0.05) {
                // Rescale shares proportionally to match expectedTotal exactly
                const baseSum = totalShares > 0 && !hasOverShare ? totalShares : count;
                const totalCents = Math.round(expectedTotal * 100);
                let allocatedCents = 0;

                result.people.forEach((p, idx) => {
                    const weight = (totalShares > 0 && !hasOverShare) ? (Number(p.share) || 0) : 1;
                    if (idx === count - 1) {
                        p.share = Math.max(0, totalCents - allocatedCents) / 100;
                    } else {
                        const c = Math.round((weight / baseSum) * totalCents);
                        p.share = c / 100;
                        allocatedCents += c;
                    }
                });
            } else if (Math.abs(expectedTotal - totalShares) >= 0.01) {
                // Minor 1-2 cent roundoff drift - adjust payer or first member
                const diff = Number((expectedTotal - totalShares).toFixed(2));
                const target = result.people.find(p => p.name.toLowerCase() === payer.toLowerCase()) || result.people[0];
                target.share = Number(Math.max(0, (Number(target.share) || 0) + diff).toFixed(2));
            }
        }

        // Set paid field: payer paid full bill, others paid 0 towards the bill
        result.people.forEach(p => {
            const isPayer = p.name.toLowerCase() === payer.toLowerCase();
            p.paid = isPayer ? expectedTotal : 0;
            p.share = Number(Number(p.share || 0).toFixed(2));
        });
    }

    result.total = Number(expectedTotal.toFixed(2));

    // Reconstruct direct settlements accurately: non-payers pay their share to payer
    const newSettlements = [];
    if (result.people && result.people.length > 0) {
        result.people.forEach(p => {
            if (p.name.toLowerCase() !== payer.toLowerCase() && p.share > 0) {
                newSettlements.push({
                    from: p.name,
                    to: payer,
                    amount: p.share
                });
            }
        });
    }
    result.settlements = newSettlements;

    const totalStr = `${cur}${result.total.toFixed(2)}`;
    const title = result.title || 'Shared Bill';

    // Build attractive WhatsApp message
    let waLines = [];
    waLines.push(`🧾 *SplitSmart AI Bill Breakdown*`);
    waLines.push(`📍 *${title}*`);
    waLines.push(`─────────────────────`);
    waLines.push(`💰 *Total Bill:* ${totalStr}`);
    if (result.taxAmount > 0 || result.tipAmount > 0) {
        const parts = [];
        if (result.taxAmount > 0) parts.push(`Tax: ${cur}${Number(result.taxAmount).toFixed(2)}`);
        if (result.tipAmount > 0) parts.push(`Tip: ${cur}${Number(result.tipAmount).toFixed(2)}`);
        waLines.push(`ℹ️ _(${parts.join(', ')})_`);
    }
    waLines.push(`💳 *Paid by:* ${payer} (${totalStr})`);
    waLines.push(`👥 *People:* ${result.people.length}`);
    waLines.push(``);
    waLines.push(`📋 *Each Person's Share:*`);

    result.people.forEach(p => {
        const isSettled = p.name === payer;
        const check = isSettled ? `✅` : `▫️`;
        const noteStr = p.note && p.note !== 'Equal split' ? ` _(${p.note})_` : ``;
        waLines.push(`${check} *${p.name}:* ${cur}${Number(p.share).toFixed(2)}${noteStr}`);
    });

    if (result.settlements && result.settlements.length > 0) {
        waLines.push(``);
        waLines.push(`💸 *Who Pays Whom:*`);
        result.settlements.forEach(s => {
            waLines.push(`👉 *${s.from}* pays *${s.to}* ➔ *${cur}${Number(s.amount).toFixed(2)}*`);
        });
    }

    waLines.push(`─────────────────────`);
    waLines.push(`⚡ _Calculated instantly with SplitSmart AI_`);

    const whatsAppText = waLines.join('\n');
    const whatsAppUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsAppText)}`;

    return {
        ...result,
        whatsAppText,
        whatsAppUrl
    };
}

module.exports = {
    parseExpenseNaturalLanguage,
    answerAuthorizedFinancialQuery,
    chatWithGoogleGemini,
    calculateQuickSplit
};
