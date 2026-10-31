const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const GEMINI_VISION_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest'];

/**
 * SplitSmart AI - Hybrid Receipt Intelligence Service
 * 1. Google Gemini 2.5 Flash Multimodal Vision (Primary: extracts merchant, itemized lines, subtotal, tax, tip, total)
 * 2. Tesseract.js OCR with regex heuristic (Offline / Fallback)
 */
async function scanReceiptImage(filePathOrBuffer, mimeType = 'image/jpeg') {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;

    // 1. Try Google Gemini Multimodal Vision if key is available
    if (geminiKey && geminiKey.trim()) {
        try {
            console.log('⚡ Scanning receipt via Google Gemini 2.5 Multimodal Vision...');
            let base64Data = '';
            if (Buffer.isBuffer(filePathOrBuffer)) {
                base64Data = filePathOrBuffer.toString('base64');
            } else if (typeof filePathOrBuffer === 'string' && fs.existsSync(filePathOrBuffer)) {
                const fileBuf = fs.readFileSync(filePathOrBuffer);
                base64Data = fileBuf.toString('base64');
                const ext = path.extname(filePathOrBuffer).toLowerCase();
                if (ext === '.png') mimeType = 'image/png';
                else if (ext === '.webp') mimeType = 'image/webp';
            }

            if (base64Data) {
                const prompt = `You are a financial receipt scanning intelligence engine for SplitSmart AI.
Analyze this receipt image and return strict JSON with NO markdown backticks or extra text.
JSON Structure:
{
  "merchant": string (business / store / restaurant name),
  "totalAmount": number (positive float of final total charged),
  "subtotal": number (float before tax and tip, or totalAmount if not broken down),
  "tax": number (tax amount or 0.0),
  "tip": number (tip/gratuity amount or 0.0),
  "date": "YYYY-MM-DD" (inferred date or "${new Date().toISOString().slice(0, 10)}"),
  "category": "Food & Dining" | "Transportation" | "Housing" | "Entertainment" | "Utilities" | "Shopping" | "Travel" | "General",
  "currency": "USD" | "EUR" | "GBP" | "INR" (detected ISO code, default USD),
  "items": [
    { "name": string, "price": number, "quantity": number }
  ],
  "confidenceScore": number (between 0.85 and 0.99)
}`;

                for (const model of GEMINI_VISION_MODELS) {
                    try {
                        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey.trim()}`;
                        const res = await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [
                                    {
                                        role: 'user',
                                        parts: [
                                            { text: prompt },
                                            {
                                                inlineData: {
                                                    mimeType,
                                                    data: base64Data
                                                }
                                            }
                                        ]
                                    }
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
                                console.log(`✅ [Vision AI] Receipt successfully analyzed by Gemini (${model}):`, parsed.merchant, `$${parsed.totalAmount}`);
                                return {
                                    merchant: parsed.merchant || 'Store Receipt',
                                    amount: Number(parsed.totalAmount) || 0,
                                    subtotal: Number(parsed.subtotal) || Number(parsed.totalAmount) || 0,
                                    tax: Number(parsed.tax) || 0,
                                    tip: Number(parsed.tip) || 0,
                                    date: parsed.date || new Date().toISOString().slice(0, 10),
                                    category: parsed.category || 'Food & Dining',
                                    currency: parsed.currency || 'USD',
                                    items: Array.isArray(parsed.items) ? parsed.items : [],
                                    isMultimodalVision: true,
                                    confidenceScore: parsed.confidenceScore || 0.96
                                };
                            }
                        }
                    } catch (mErr) {
                        console.warn(`Vision model ${model} attempt failed:`, mErr.message);
                    }
                }
            }
        } catch (visionErr) {
            console.warn('Google Gemini Vision failed, falling back to Tesseract OCR:', visionErr.message);
        }
    }

    // 2. Offline / Heuristic Fallback using Tesseract.js
    return scanReceiptWithTesseract(filePathOrBuffer);
}

/**
 * Tesseract.js Offline OCR Fallback
 */
async function scanReceiptWithTesseract(filePathOrBuffer) {
    try {
        console.log('⚡ Running offline Tesseract.js OCR fallback...');
        const result = await Tesseract.recognize(
            filePathOrBuffer,
            'eng',
            { logger: () => {} }
        );

        const text = result.data.text || '';
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

        // Detect Merchant
        let merchant = 'Store Receipt';
        for (const line of lines.slice(0, 5)) {
            if (line.length > 2 && !line.match(/welcome|tax|invoice|receipt|date|order|tel|phone|#|\d{3}/i)) {
                merchant = line.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
                if (merchant.length >= 3) break;
            }
        }

        // Detect Total Amount
        let totalAmount = 0;
        let totalCandidate = null;
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (line.match(/\b(total|amount due|subtotal|balance|grand total)\b/i)) {
                const amtMatch = line.match(/(?:[$€£₹])?\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]+\.[0-9]{2})/);
                if (amtMatch) {
                    totalCandidate = parseFloat(amtMatch[1].replace(/,/g, ''));
                    break;
                }
            }
        }

        if (!totalCandidate) {
            const allAmounts = [];
            const matches = text.matchAll(/(?:[$€£₹])?\s*([0-9]+\.[0-9]{2})/g);
            for (const m of matches) {
                const val = parseFloat(m[1]);
                if (!isNaN(val) && val < 50000) allAmounts.push(val);
            }
            if (allAmounts.length > 0) totalCandidate = Math.max(...allAmounts);
        }

        totalAmount = totalCandidate || 0;

        // Detect Date
        let detectedDate = new Date().toISOString().slice(0, 10);
        const dateMatch = text.match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})|(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/);
        if (dateMatch) {
            try {
                const parsedDate = new Date(dateMatch[0]);
                if (!isNaN(parsedDate.getTime())) {
                    detectedDate = parsedDate.toISOString().slice(0, 10);
                }
            } catch (e) {}
        }

        // Infer Category
        let category = 'General';
        const lower = text.toLowerCase();
        if (lower.match(/restaurant|cafe|bar|grill|diner|pizza|burger|coffee|starbucks|food|kitchen|bakery|supermarket|grocery|groceries/)) {
            category = 'Food & Dining';
        } else if (lower.match(/gas|fuel|chevron|shell|exxon|bp|uber|lyft|taxi|transit|subway|parking/)) {
            category = 'Transportation';
        } else if (lower.match(/hotel|motel|inn|suites|airbnb/)) {
            category = 'Housing';
        } else if (lower.match(/cinema|theatre|movies|ticket/)) {
            category = 'Entertainment';
        } else if (lower.match(/target|amazon|best buy|pharmacy|cvs|walgreens|store|retail/)) {
            category = 'Shopping';
        }

        return {
            merchant,
            amount: totalAmount,
            subtotal: totalAmount,
            tax: 0,
            tip: 0,
            date: detectedDate,
            category,
            items: [],
            isMultimodalVision: false,
            confidenceScore: 0.88,
            rawTextSnippet: text.slice(0, 200)
        };
    } catch (err) {
        console.error('Tesseract OCR error:', err.message);
        return {
            merchant: 'Scanned Receipt',
            amount: 0,
            date: new Date().toISOString().slice(0, 10),
            category: 'General',
            items: [],
            isMultimodalVision: false,
            error: err.message
        };
    }
}

module.exports = {
    scanReceiptImage
};
