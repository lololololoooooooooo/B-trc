// netlify/functions/latest.js
import { neon } from '@netlify/neon';

export const handler = async (event) => {
    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };
    
    // CORS pre-flight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: cors, body: '' };
    }
    
    try {
        // Connect to Neon database (automatically uses NETLIFY_DATABASE_URL)
        const sql = neon();
        
        // Query for latest device data
        const devices = await sql`
            SELECT device_id, lat, lon, soc, v, t, ts, 
                   created_at, updated_at
            FROM devices 
            ORDER BY updated_at DESC
        `;
        
        console.log('Returning', devices.length, 'devices from database');
        return {
            statusCode: 200,
            headers: { ...cors, 'Content-Type': 'application/json' },
            body: JSON.stringify(devices),
        };
        
    } catch (error) {
        console.error('Database error:', error);
        return {
            statusCode: 500,
            headers: { ...cors, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Database error', details: error.message }),
        };
    }
};
