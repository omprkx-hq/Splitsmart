const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function runMigration() {
    console.log('--- SplitSmart AI Database Migration ---');
    console.log('Connecting to PostgreSQL database...');
    
    try {
        const client = await pool.connect();
        console.log('Connected successfully. Reading schema.sql...');
        
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Applying database schema and constraints...');
        await client.query('BEGIN');
        await client.query(schemaSql);
        await client.query('COMMIT');
        
        console.log('Schema migration completed successfully!');
        
        // Check created tables
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        console.log('Active Database Tables:');
        tablesRes.rows.forEach(r => console.log(`  - ${r.table_name}`));
        
        client.release();
        return true;
    } catch (err) {
        console.error('Migration failed:', err.message);
        throw err;
    }
}

if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('Migration process finished.');
            process.exit(0);
        })
        .catch(() => {
            process.exit(1);
        });
}

module.exports = { runMigration };
