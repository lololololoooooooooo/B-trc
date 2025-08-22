// netlify/functions/ingest.js
const { Client } = require('pg');

exports.handler = async (event) => {
    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Device-Token',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    
    // CORS pre-flight
    if (event.httpMethod === 'OPTIONS')
        return { statusCode: 200, headers: cors, body: '' };
    
    // Token check
    const token = (event.headers['x-device-token'] || '').trim();
    if (token !== (process.env.DEVICE_TOKEN || '').trim())
        return { statusCode: 401, headers: cors, body: 'Unauthorized' };
    
    // Parse body
    let body;
    try { 
        body = JSON.parse(event.body || '{}'); 
    } catch { 
        return { statusCode: 400, headers: cors, body: 'Bad JSON' }; 
    }
    
    // Add timestamp if missing
    if (!body.ts) body.ts = Date.now();
    
    try {
        // Connect to PostgreSQL database
        const client = new Client({
            connectionString: process.env.DATABASE_URL
        });
        
        await client.connect();
        
        // Create table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS devices (
                id VARCHAR(255) PRIMARY KEY,
                v FLOAT,
                t FLOAT,
                soc INTEGER,
                lat FLOAT,
                lon FLOAT,
                ts BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insert or update device data
        await client.query(`
            INSERT INTO devices (id, v, t, soc, lat, lon, ts, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                v = EXCLUDED.v,
                t = EXCLUDED.t,
                soc = EXCLUDED.soc,
                lat = EXCLUDED.lat,
                lon = EXCLUDED.lon,
                ts = EXCLUDED.ts,
                updated_at = CURRENT_TIMESTAMP
        `, [body.id, body.v, body.t, body.soc, body.lat, body.lon, body.ts]);
        
        await client.end();
        
        console.log('Device stored in database:', body.id);
        return { statusCode: 200, headers: cors, body: 'OK' };
        
    } catch (error) {
        console.error('Database error:', error);
        return { statusCode: 500, headers: cors, body: 'Database error' };
    }
};
