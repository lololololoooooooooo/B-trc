// netlify/functions/latest.js
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

async function ensureSchema(client) {
    const ddl = `
        CREATE TABLE IF NOT EXISTS devices (
            id SERIAL PRIMARY KEY,
            device_id VARCHAR(255) UNIQUE NOT NULL,
            lat DECIMAL(10, 8) NOT NULL,
            lon DECIMAL(11, 8) NOT NULL,
            soc INTEGER,
            v DECIMAL(5, 2),
            t DECIMAL(5, 2),
            ts BIGINT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            owner_user_id UUID,
            api_token_hash TEXT,
            name TEXT
        );
    `;
    await client.query(ddl);
}

exports.handler = async (event) => {
    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: cors, body: '' };
    }
    
    try {
        if (!process.env.NETLIFY_DATABASE_URL) {
            return { statusCode: 500, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Database configuration error' }) };
        }
        
        const client = new Client({
            connectionString: process.env.NETLIFY_DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        await ensureSchema(client);

        // Try to read JWT (optional)
        let user = null;
        const auth = event.headers['authorization'] || '';
        if (auth.toLowerCase().startsWith('bearer ') && process.env.JWT_SECRET) {
            const token = auth.slice(7);
            try { user = jwt.verify(token, process.env.JWT_SECRET); } catch {}
        }

        let result;
        if (user && user.role === 'admin') {
            result = await client.query(`
                SELECT device_id, lat, lon, soc, v, t, ts, created_at, updated_at
                FROM devices
                ORDER BY updated_at DESC
            `);
        } else if (user && user.sub) {
            result = await client.query(`
                SELECT d.device_id, d.lat, d.lon, d.soc, d.v, d.t, d.ts, d.created_at, d.updated_at
                FROM devices d
                LEFT JOIN user_devices ud ON ud.device_id = d.device_id
                WHERE d.owner_user_id = $1 OR ud.user_id = $1
                ORDER BY d.updated_at DESC
            `, [user.sub]);
        } else {
            // Unauthenticated: return all (or restrict here if you prefer)
            result = await client.query(`
                SELECT device_id, lat, lon, soc, v, t, ts, created_at, updated_at
                FROM devices
                ORDER BY updated_at DESC
            `);
        }

        await client.end();
        return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(result.rows) };
    } catch (error) {
        console.error('Database error:', error);
        return { statusCode: 500, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Database error', details: error.message }) };
    }
};
