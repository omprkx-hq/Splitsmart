const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const groupsRoutes = require('./routes/groups');
const expensesRoutes = require('./routes/expenses');
const settlementsRoutes = require('./routes/settlements');
const aiRoutes = require('./routes/ai');
const analyticsRoutes = require('./routes/analytics');
const notificationsRoutes = require('./routes/notifications');
const activityRoutes = require('./routes/activity');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON and urlencoded request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Serve static frontend assets
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Mount API Router on both /api and Netlify Functions prefixes
const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        service: 'SplitSmart AI Enterprise Server',
        timestamp: new Date().toISOString(),
        envStatus: {
            database: !!process.env.DATABASE_URL,
            smtp: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
            paypal: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
            llm: !!process.env.LLM_API_KEY
        }
    });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/groups', groupsRoutes);
apiRouter.use('/expenses', expensesRoutes);
apiRouter.use('/settlements', settlementsRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/activity', activityRoutes);

app.use('/api', apiRouter);
app.use('/.netlify/functions/api/api', apiRouter);
app.use('/.netlify/functions/api', apiRouter);

// Fast Short-Link Redirect for Clean Invites and Receipts (/s/:code)
app.get('/s/:code', (req, res) => {
    const code = req.params.code;
    if (code.startsWith('inv_') || code.startsWith('i_')) {
        const token = code.replace(/^(inv_|i_)/, '');
        return res.redirect(`/#/invite/accept?token=${token}`);
    }
    if (code.startsWith('rcpt_') || code.startsWith('r_')) {
        return res.redirect(`/#/receipt?id=${code}`);
    }
    return res.redirect('/#/');
});

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/.netlify/')) {
        return res.status(404).json({ error: 'Endpoint not found.' });
    }
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('SplitSmart AI Server is Running.');
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SplitSmart Global Server Error:', err);
    res.status(err.status || 500).json({
        error: 'SERVER_ERROR',
        message: err.message || 'An unexpected error occurred.'
    });
});

// Start Server if run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 SplitSmart AI Enterprise Server Live on Port ${PORT}`);
        console.log(`🔗 Local Application: http://localhost:${PORT}`);
        console.log(`====================================================`);
    });
}

module.exports = app;
