// netlify/functions/latest.js
const { Client } = require('pg');

exports.handler = async (event) => {
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
        // Check if database URL is available
        if (!process.env.NETLIFY_DATABASE_URL) {
            console.error('NETLIFY_DATABASE_URL environment variable not set');
            return {
                statusCode: 500,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Database configuration error' }),
            };
        }
        
        // Connect to PostgreSQL
        const client = new Client({
            connectionString: process.env.NETLIFY_DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        await client.connect();
        
        // Query for latest device data
        const result = await client.query(`
            SELECT device_id, lat, lon, soc, v, t, ts, 
                   created_at, updated_at
            FROM devices 
            ORDER BY updated_at DESC
        `);
        
        await client.end();
        
        console.log('Returning', result.rows.length, 'devices from database');
        return {
            statusCode: 200,
            headers: { ...cors, 'Content-Type': 'application/json' },
            body: JSON.stringify(result.rows),
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
