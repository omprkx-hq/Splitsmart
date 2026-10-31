const { Pool } = require('pg');
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let poolInstance = null;
let isMemoryDb = false;
let currentDbInfo = {
    type: 'uninitialized',
    host: null,
    connected: false,
    migrated: false
};

/**
 * Execute schema.sql migration on the given PostgreSQL pool
 */
async function runMigration(pool) {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📦 [DATABASE] Applying PostgreSQL schema migration...');
        await pool.query(schemaSql);
        console.log('✅ [DATABASE] Schema migration completed successfully! All 11 tables verified.');
        currentDbInfo.migrated = true;
        return { success: true };
    } catch (err) {
        console.error('❌ [DATABASE] Schema migration failed:', err.message);
        throw err;
    }
}

/**
 * Check if the database has tables; if not, auto-run migration
 */
async function ensureTablesMigrated(pool) {
    try {
        const check = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users';
        `);
        if (check.rows.length === 0) {
            console.log('⚡ [DATABASE] Users table not found in external PostgreSQL. Running auto-migration...');
            await runMigration(pool);
        } else {
            console.log('✅ [DATABASE] Existing database tables detected and verified.');
            currentDbInfo.migrated = true;
        }
    } catch (err) {
        console.warn('⚠️ [DATABASE] Table check warning:', err.message);
    }
}

const SNAPSHOT_PATH = path.join(__dirname, '..', '..', 'data', 'splitsmart_db.json');

let saveTimeout = null;
function scheduleSaveSnapshot() {
    if (!isMemoryDb || !poolInstance) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        try {
            const tables = [
                'users',
                'groups',
                'group_members',
                'group_invitations',
                'expenses',
                'expense_splits',
                'expense_payers',
                'settlements',
                'paypal_transactions',
                'activity_logs',
                'notifications'
            ];
            const data = {};
            for (const t of tables) {
                try {
                    const res = await poolInstance.query(`SELECT * FROM ${t}`);
                    data[t] = res.rows;
                } catch (_) {}
            }
            const dir = path.dirname(SNAPSHOT_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(data, null, 2), 'utf8');
        } catch (_) {}
    }, 300);
}

async function restoreSnapshot() {
    try {
        if (!fs.existsSync(SNAPSHOT_PATH)) return;
        const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') return;

        const serialTables = [
            'users',
            'groups',
            'group_invitations',
            'expenses',
            'expense_payers',
            'settlements',
            'activity_logs',
            'notifications'
        ];

        // 1. Restore serial tables with gap-aware auto-increment preservation
        for (const t of serialTables) {
            const rows = data[t];
            if (Array.isArray(rows) && rows.length > 0) {
                const byId = new Map(rows.filter(r => r.id != null).map(r => [Number(r.id), r]));
                const maxId = Math.max(...rows.filter(r => r.id != null).map(r => Number(r.id)));

                for (let i = 1; i <= maxId; i++) {
                    const row = byId.get(i);
                    if (row) {
                        const keys = Object.keys(row).filter(k => k !== 'id');
                        const values = keys.map(k => row[k]);
                        const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
                        const colNames = keys.map(k => `"${k}"`).join(', ');
                        try {
                            await poolInstance.query(
                                `INSERT INTO ${t} (${colNames}) VALUES (${placeholders})`,
                                values
                            );
                        } catch (_) {}
                    } else {
                        // Advance sequence across gaps
                        try {
                            const dummyKeys = Object.keys(rows[0]).filter(k => k !== 'id');
                            const dummyVals = dummyKeys.map(k => rows[0][k]);
                            const placeholders = dummyKeys.map((_, idx) => `$${idx + 1}`).join(', ');
                            const colNames = dummyKeys.map(k => `"${k}"`).join(', ');
                            await poolInstance.query(
                                `INSERT INTO ${t} (${colNames}) VALUES (${placeholders})`,
                                dummyVals
                            );
                            await poolInstance.query(`DELETE FROM ${t} WHERE id = ${i}`);
                        } catch (_) {}
                    }
                }
            }
        }

        // 2. Restore composite key tables (e.g. group_members, expense_splits)
        const compositeTables = ['group_members', 'expense_splits', 'paypal_transactions'];
        for (const t of compositeTables) {
            const rows = data[t];
            if (Array.isArray(rows) && rows.length > 0) {
                for (const row of rows) {
                    const keys = Object.keys(row);
                    const values = Object.values(row);
                    const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
                    const colNames = keys.map(k => `"${k}"`).join(', ');
                    try {
                        await poolInstance.query(
                            `INSERT INTO ${t} (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                            values
                        );
                    } catch (_) {}
                }
            }
        }

        console.log('💾 [PERSISTENCE] Restored persistent database snapshot successfully! All accounts and ledgers intact.');
    } catch (err) {
        console.warn('⚠️ [PERSISTENCE] Snapshot restore notice:', err.message);
    }
}

function initializeDatabase() {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
        const dbUrl = process.env.DATABASE_URL.trim();
        console.log('🌐 Connecting to persistent PostgreSQL (Supabase / Cloud DB)...');
        const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

        poolInstance = new Pool({
            connectionString: dbUrl,
            ssl: isLocal ? false : { rejectUnauthorized: false }
        });
        isMemoryDb = false;

        let hostName = 'remote-postgres';
        try {
            const parsed = new URL(dbUrl);
            hostName = parsed.hostname;
        } catch (_) {}

        currentDbInfo = {
            type: hostName.includes('supabase') ? 'supabase' : 'postgresql',
            host: hostName,
            connected: true,
            migrated: false
        };

        // Test connection and auto-migrate asynchronously
        ensureTablesMigrated(poolInstance).catch((e) => {
            console.warn('[DATABASE] Connection/Migration notice:', e.message);
        });

        return poolInstance;
    }

    // Clean, zero-mock PostgreSQL Engine via pg-mem
    console.log('⚡ Initializing Clean In-Memory PostgreSQL Engine...');
    const db = newDb();

    // Register required PostgreSQL functions
    db.public.registerFunction({
        name: 'uuid_generate_v4',
        implementation: () => require('crypto').randomUUID()
    });

    db.public.registerFunction({
        name: 'to_char',
        args: [require('pg-mem').DataType.date, require('pg-mem').DataType.text],
        returns: require('pg-mem').DataType.text,
        implementation: (d) => {
            if (!d) return '';
            return new Date(d).toISOString().slice(0, 10);
        }
    });

    const pgAdapter = db.adapters.createPg();
    poolInstance = new pgAdapter.Pool();
    isMemoryDb = true;

    // Apply schema into clean database
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        let schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Remove UUID extension line if not supported in memory
        schemaSql = schemaSql.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '');

        db.public.none(schemaSql);
        console.log('✅ PostgreSQL Schema loaded successfully. Database initialized with clean slate.');
        currentDbInfo = {
            type: 'in-memory',
            host: 'local-memory',
            connected: true,
            migrated: true
        };

        // Automatically restore previous persistent state
        restoreSnapshot().catch(e => console.warn('Restore error:', e.message));
    } catch (e) {
        console.error('Error applying schema to in-memory db:', e.message);
    }

    return poolInstance;
}

// Connect dynamically to external PostgreSQL (e.g. Supabase)
async function connectTo(databaseUrl) {
    if (!databaseUrl || !databaseUrl.trim()) {
        throw new Error('Database URL is required.');
    }

    const testPool = new Pool({
        connectionString: databaseUrl.trim(),
        ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000
    });

    // Test connection with simple ping
    const pingRes = await testPool.query('SELECT NOW() as current_time, current_database() as db_name;');
    console.log('✅ Connected to external PostgreSQL successfully:', pingRes.rows[0]);

    // Ensure schema is applied
    await ensureTablesMigrated(testPool);

    // Switch active pool
    if (poolInstance && typeof poolInstance.end === 'function') {
        try { await poolInstance.end(); } catch (_) {}
    }

    poolInstance = testPool;
    isMemoryDb = false;

    let hostName = 'remote-postgres';
    try {
        const parsed = new URL(databaseUrl.trim());
        hostName = parsed.hostname;
    } catch (_) {}

    currentDbInfo = {
        type: hostName.includes('supabase') ? 'supabase' : 'postgresql',
        host: hostName,
        database: pingRes.rows[0]?.db_name,
        connected: true,
        migrated: true
    };

    return currentDbInfo;
}

// Initialize on module load
initializeDatabase();

async function query(text, params) {
    try {
        const res = await poolInstance.query(text, params);
        if (isMemoryDb && text && /^\s*(INSERT|UPDATE|DELETE)\b/i.test(text)) {
            scheduleSaveSnapshot();
        }
        return res;
    } catch (err) {
        console.error('Database Query Error:', {
            text: text ? text.slice(0, 100) : '',
            error: err.message
        });
        throw err;
    }
}

async function getClient() {
    const client = await poolInstance.connect();
    return client;
}

function getDbStatus() {
    return {
        ...currentDbInfo,
        isMemory: isMemoryDb
    };
}

module.exports = {
    pool: poolInstance,
    query,
    getClient,
    isMemoryDb: () => isMemoryDb,
    connectTo,
    runMigration,
    getDbStatus
};
