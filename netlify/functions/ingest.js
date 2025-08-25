// netlify/functions/ingest.js
import { neon } from '@netlify/neon';

export const handler = async (event) => {
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
    if (!body.id) {
        return { 
            statusCode: 400, 
            headers: cors, 
            body: JSON.stringify({ error: 'Device ID is required' }) 
        };
    }
    
    // Add timestamp if missing
    if (!body.ts) body.ts = Math.floor(Date.now() / 1000); // Convert to Unix timestamp
    
    try {
        // Connect to Neon database (automatically uses NETLIFY_DATABASE_URL)
        const sql = neon();
        
        // Check if device exists and update or create
        const existingDevice = await sql`
            SELECT id FROM devices WHERE device_id = ${body.id}
        `;
        
        if (existingDevice.length > 0) {
            // Update existing device
            await sql`
                UPDATE devices 
                SET lat = ${body.lat}, lon = ${body.lon}, soc = ${body.soc}, 
                    v = ${body.v}, t = ${body.t}, ts = ${body.ts}, updated_at = NOW()
                WHERE device_id = ${body.id}
            `;
        } else {
            // Create new device
            await sql`
                INSERT INTO devices (device_id, lat, lon, soc, v, t, ts, created_at, updated_at)
                VALUES (${body.id}, ${body.lat}, ${body.lon}, ${body.soc}, ${body.v}, ${body.t}, ${body.ts}, NOW(), NOW())
            `;
        }
        
        console.log('Device stored in database:', body.id);
        return { 
            statusCode: 200, 
            headers: cors, 
            body: JSON.stringify({ success: true, message: 'Device data stored successfully' }) 
        };
        
    } catch (error) {
        console.error('Database error:', error);
        return { 
            statusCode: 500, 
            headers: cors, 
            body: JSON.stringify({ error: 'Database error', details: error.message }) 
        };
    }
};
