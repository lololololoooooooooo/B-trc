// netlify/functions/latest.js
const { Client } = require('pg');
const crypto = require('crypto');

function verifyJWT(authHeader, secret){
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ') || !secret) return null;
    try {
        const token = authHeader.slice(7);
        const [h, p, s] = token.split('.');
        if (!h || !p || !s) return null;
        const data = `${h}.${p}`;
        const expected = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
        if (expected !== s) return null;
        const payload = JSON.parse(Buffer.from(p.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString());
        if (payload.exp && payload.exp < Math.floor(Date.now()/1000)) return null;
        return payload;
    } catch { return null; }
}

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

        // Optional JWT
        const user = verifyJWT(event.headers['authorization'] || '', process.env.JWT_SECRET);

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
