// netlify/functions/latest.js
const { Client } = require('pg');

exports.handler = async () => {
    try {
        // Connect to PostgreSQL database
        const client = new Client({
            connectionString: process.env.DATABASE_URL
        });
        
        await client.connect();
        
        // Get all devices
        const result = await client.query(`
            SELECT id, v, t, soc, lat, lon, ts, updated_at
            FROM devices
            ORDER BY updated_at DESC
        `);
        
        await client.end();
        
        console.log('Returning', result.rows.length, 'devices from database');
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result.rows),
        };
        
    } catch (error) {
        console.error('Database error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Database error' }),
        };
    }
};
