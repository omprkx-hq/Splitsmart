const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { parseExpenseNaturalLanguage, answerAuthorizedFinancialQuery, chatWithGoogleGemini, calculateQuickSplit } = require('../services/aiService');
const { scanReceiptImage } = require('../services/ocrService');

// Multer storage for receipt image uploads
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname) || '.png';
        cb(null, `receipt-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, WEBP) are allowed for receipt scanning.'));
        }
    }
});

/**
 * POST /api/ai/parse-expense
 * Parses natural language into a structured JSON draft.
 * NOTE: DOES NOT SAVE TO POSTGRESQL! Returned to frontend for the MANDATORY Review Gate!
 */
router.post('/parse-expense', authenticateToken, async (req, res) => {
    try {
        const { text, groupId } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Text prompt is required.' });
        }

        // Fetch available group members if groupId provided
        let members = [];
        if (groupId) {
            const membersRes = await query(`
                SELECT u.id, u.name, u.email 
                FROM group_members gm
                JOIN users u ON gm.user_id = u.id
                WHERE gm.group_id = $1 AND gm.membership_status = 'active'
            `, [groupId]);
            members = membersRes.rows;
        }

        // Extract structured fields
        const parsedDraft = await parseExpenseNaturalLanguage(text, members);

        // Record minimal AI interaction metadata
        await query(`
            INSERT INTO ai_interactions (user_id, task_type, status)
            VALUES ($1, 'PARSE_EXPENSE', 'success')
        `, [req.user.id]);

        return res.json({
            message: 'Expense successfully parsed! Please review and confirm the details below before saving.',
            draft: parsedDraft,
            requiresReviewConfirmation: true
        });
    } catch (err) {
        console.error('AI parse expense error:', err);
        return res.status(500).json({ error: 'Failed to parse natural language expense.' });
    }
});

/**
 * POST /api/ai/query
 * Authorized Financial Q&A with strict SQL-computed numbers
 */
router.post('/query', authenticateToken, async (req, res) => {
    try {
        const { question, groupId } = req.body;

        if (!question || !groupId) {
            return res.status(400).json({ error: 'Question and Group ID are required.' });
        }

        const result = await answerAuthorizedFinancialQuery(req.user.id, groupId, question);

        // Record minimal AI interaction metadata
        await query(`
            INSERT INTO ai_interactions (user_id, task_type, status)
            VALUES ($1, 'FINANCIAL_QA', 'success')
        `, [req.user.id]);

        return res.json({
            question,
            answer: result.answer,
            verifiedFacts: result.verifiedFacts
        });
    } catch (err) {
        console.error('AI financial query error:', err);
        return res.status(500).json({ error: err.message || 'Failed to process financial query.' });
    }
});

/**
 * POST /api/ai/scan-receipt
 * Upload receipt image and extract merchant, amount, date, and category via OCR.
 * Loaded into frontend confirmation form for mandatory review.
 */
router.post('/scan-receipt', authenticateToken, upload.single('receipt'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Receipt image file is required.' });
        }

        const filePath = req.file.path;
        const ocrResult = await scanReceiptImage(filePath);

        const receiptUrl = `/uploads/${req.file.filename}`;

        // Record minimal AI interaction metadata
        await query(`
            INSERT INTO ai_interactions (user_id, task_type, status)
            VALUES ($1, 'RECEIPT_OCR', 'success')
        `, [req.user.id]);

        return res.json({
            message: 'Receipt scanned successfully! Review extracted details below before adding to ledger.',
            extracted: {
                description: ocrResult.merchant || 'Receipt Expense',
                amount: ocrResult.amount || 0,
                subtotal: ocrResult.subtotal || ocrResult.amount || 0,
                tax: ocrResult.tax || 0,
                tip: ocrResult.tip || 0,
                date: ocrResult.date || new Date().toISOString().slice(0, 10),
                category: ocrResult.category || 'General',
                items: ocrResult.items || [],
                isMultimodalVision: Boolean(ocrResult.isMultimodalVision),
                confidenceScore: ocrResult.confidenceScore,
                receiptUrl,
                snippet: ocrResult.rawTextSnippet
            },
            requiresReviewConfirmation: true
        });
    } catch (err) {
        console.error('Scan receipt error:', err);
        return res.status(500).json({ error: 'Failed to scan receipt image.' });
    }
});

/**
 * POST /api/ai/chat
 * Multi-turn conversational chatbot powered by Google Gemini API
 */
router.post('/chat', async (req, res) => {
    try {
        const { message, conversationHistory = [], groupId = null, customApiKey = null } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message text is required.' });
        }

        // Optional auth: if user is logged in, use their user ID for personalized ledger context
        let userId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'splitsmart_jwt_secret');
                userId = decoded.userId || decoded.id;
            } catch (e) {
                // Anonymous or expired session
            }
        }

        const result = await chatWithGoogleGemini({
            message: message.trim(),
            conversationHistory,
            userId,
            groupId,
            customApiKey
        });

        return res.json(result);
    } catch (err) {
        console.error('AI chat endpoint error:', err);
        return res.status(500).json({ error: err.message || 'Failed to process AI chat message.' });
    }
});

/**
 * GET /api/ai/status
 * Returns current Gemini API key status
 */
router.get('/status', (req, res) => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.LLM_API_KEY);
    return res.json({
        hasApiKey: hasKey,
        provider: 'google-gemini'
    });
});

/**
 * POST /api/ai/save-key
 * Permanently stores Google Gemini API key in .env file and active environment
 */
router.post('/save-key', (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey || !apiKey.trim()) {
            return res.status(400).json({ error: 'Google Gemini API key is required.' });
        }

        const cleanKey = apiKey.trim();
        process.env.GEMINI_API_KEY = cleanKey;
        process.env.LLM_API_KEY = cleanKey;

        // Persist to .env file
        const envPath = path.join(__dirname, '../../.env');
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            if (envContent.includes('GEMINI_API_KEY=')) {
                envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${cleanKey}`);
            } else {
                envContent += `\nGEMINI_API_KEY=${cleanKey}`;
            }

            if (envContent.includes('LLM_API_KEY=')) {
                envContent = envContent.replace(/LLM_API_KEY=.*/g, `LLM_API_KEY=${cleanKey}`);
            } else {
                envContent += `\nLLM_API_KEY=${cleanKey}`;
            }

            fs.writeFileSync(envPath, envContent, 'utf8');
            console.log('✅ [AI] Google Gemini API Key successfully saved to .env!');
        }

        return res.json({
            success: true,
            message: 'Google Gemini API Key successfully configured and activated!'
        });
    } catch (err) {
        console.error('Save API key error:', err);
        return res.status(500).json({ error: 'Failed to save Google Gemini API key.' });
    }
});

// Ephemeral storage for public digital receipt sharing
const receiptStore = new Map();

/**
 * POST /api/ai/quick-calculator
 * Restricted to authenticated users: calculates split from natural language prompt or manual inputs,
 * returns visual receipt data and 1-click WhatsApp formatted text.
 */
router.post('/quick-calculator', authenticateToken, async (req, res) => {
    try {
        const { textPrompt, manualData } = req.body;

        if (!textPrompt && !manualData) {
            return res.status(400).json({
                error: 'INPUT_REQUIRED',
                message: 'Please provide either a text description of your bill or manual split parameters.'
            });
        }

        const calculation = await calculateQuickSplit({ textPrompt, manualData });
        const receiptId = 'rcpt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        receiptStore.set(receiptId, { ...calculation, id: receiptId, createdAt: new Date() });

        // Keep store bounded
        if (receiptStore.size > 500) {
            const firstKey = receiptStore.keys().next().value;
            receiptStore.delete(firstKey);
        }

        return res.json({
            success: true,
            receiptId,
            ...calculation
        });
    } catch (err) {
        console.error('Quick calculator error:', err);
        return res.status(500).json({
            error: 'CALCULATION_FAILED',
            message: err.message || 'Could not calculate bill split.'
        });
    }
});

/**
 * GET /api/ai/receipt/:id
 * Public endpoint: NO LOGIN REQUIRED
 * Retrieves digital receipt for recipients opening the link from WhatsApp
 */
router.get('/receipt/:id', (req, res) => {
    const data = receiptStore.get(req.params.id);
    if (!data) {
        return res.status(404).json({ error: 'RECEIPT_NOT_FOUND', message: 'Receipt not found or expired.' });
    }
    return res.json({ success: true, data });
});

module.exports = router;
