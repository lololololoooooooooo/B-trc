// netlify/functions/ingest.js
const { Client } = require('pg');

async function ensureSchema(client) {
    // Core devices table and indexes
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
        CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
        CREATE INDEX IF NOT EXISTS idx_devices_owner ON devices(owner_user_id);
        CREATE INDEX IF NOT EXISTS idx_devices_ts ON devices(ts);
        CREATE INDEX IF NOT EXISTS idx_devices_location ON devices(lat, lon);
    `;
    await client.query(ddl);
    
    // Users and mapping (for future auth features)
    const ddlUsers = `
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'member',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS user_devices (
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            device_id VARCHAR(255) REFERENCES devices(device_id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, device_id)
        );
    `;
    await client.query(ddlUsers);
}

exports.handler = async (event) => {
    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Device-Token',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    
    // CORS pre-flight
    if (event.httpMethod === 'OPTIONS')
        return { statusCode: 200, headers: cors, body: '' };
    
    // Check if required environment variables are set
    if (!process.env.DEVICE_TOKEN) {
        console.error('DEVICE_TOKEN environment variable not set');
        return { 
            statusCode: 500, 
            headers: cors, 
            body: JSON.stringify({ error: 'Server configuration error' }) 
        };
    }
    
    if (!process.env.NETLIFY_DATABASE_URL) {
        console.error('NETLIFY_DATABASE_URL environment variable not set');
        return { 
            statusCode: 500, 
            headers: cors, 
            body: JSON.stringify({ error: 'Database configuration error' }) 
        };
    }
    
    // Token check
    const token = (event.headers['x-device-token'] || '').trim();
    if (token !== process.env.DEVICE_TOKEN.trim())
        return { 
            statusCode: 401, 
            headers: cors, 
            body: JSON.stringify({ error: 'Unauthorized' }) 
        };
    
    // Parse body
    let body;
    try { 
        body = JSON.parse(event.body || '{}'); 
    } catch { 
        return { 
            statusCode: 400, 
            headers: cors, 
            body: JSON.stringify({ error: 'Bad JSON' }) 
        }; 
    }
    
    // Validate required fields
    if (!body.id || body.lat === undefined || body.lon === undefined) {
        return { 
            statusCode: 400, 
            headers: cors, 
            body: JSON.stringify({ error: 'Fields required: id, lat, lon' }) 
        };
    }
    
    // Add timestamp if missing (unix seconds)
    if (!body.ts) body.ts = Math.floor(Date.now() / 1000);
    
    try {
        // Connect to PostgreSQL
        const client = new Client({
            connectionString: process.env.NETLIFY_DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        await client.connect();
        await ensureSchema(client);
        
        // Check if device exists and update or create
        const checkResult = await client.query(
            'SELECT id FROM devices WHERE device_id = $1',
            [body.id]
        );
        
        if (checkResult.rows.length > 0) {
            // Update existing device
            await client.query(`
                UPDATE devices 
                SET lat = $1, lon = $2, soc = $3, v = $4, t = $5, ts = $6, updated_at = NOW()
                WHERE device_id = $7
            `, [body.lat, body.lon, body.soc ?? null, body.v ?? null, body.t ?? null, body.ts, body.id]);
        } else {
            // Create new device
            await client.query(`
                INSERT INTO devices (device_id, lat, lon, soc, v, t, ts, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            `, [body.id, body.lat, body.lon, body.soc ?? null, body.v ?? null, body.t ?? null, body.ts]);
        }
        
        await client.end();
        
        console.log('Device stored in database:', body.id);
        return { 
            statusCode: 200, 
            headers: cors, 
            body: JSON.stringify({ success: true, message: 'Device data stored successfully' }) 
        };
        
    } catch (error) {
        console.error('Database error:', error);
        return { 
            statusCode: 200, 
            headers: cors, 
            body: JSON.stringify({ error: 'Database error', details: error.message }) 
        };
    }
};
