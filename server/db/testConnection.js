const { pool } = require('./index');

async function testConnection() {
    console.log('Testing PostgreSQL connection...');
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW() as now, current_database() as db_name, version() as version;');
        console.log('Connection SUCCESSFUL!');
        console.log('Current DB:', res.rows[0].db_name);
        console.log('Server Time:', res.rows[0].now);
        console.log('PostgreSQL Version:', res.rows[0].version.split(',')[0]);
        client.release();
        return true;
    } catch (err) {
        console.error('Connection FAILED:', err.message);
        return false;
    }
}

if (require.main === module) {
    testConnection().then(success => process.exit(success ? 0 : 1));
}

module.exports = { testConnection };
