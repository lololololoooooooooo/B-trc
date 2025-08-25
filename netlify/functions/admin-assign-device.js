// netlify/functions/admin-assign-device.js
const { Client } = require('pg');

exports.handler = async (event) => {
    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

    if (!process.env.ADMIN_TOKEN) {
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing ADMIN_TOKEN' }) };
    }
    if (!process.env.NETLIFY_DATABASE_URL) {
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing DB config' }) };
    }

    const admin = (event.headers['x-admin-token'] || '').trim();
    if (admin !== process.env.ADMIN_TOKEN.trim()) {
        return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    try {
        const { email, device_id } = JSON.parse(event.body || '{}');
        if (!email || !device_id) {
            return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'email and device_id required' }) };
        }

        const client = new Client({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });
        await client.connect();

        const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            await client.end();
            return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'User not found' }) };
        }
        const userId = userRes.rows[0].id;

        // Ensure device exists
        const devRes = await client.query('SELECT id FROM devices WHERE device_id = $1', [device_id]);
        if (devRes.rows.length === 0) {
            await client.end();
            return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'Device not found' }) };
        }

        // Set owner and mapping
        await client.query('UPDATE devices SET owner_user_id = $1 WHERE device_id = $2', [userId, device_id]);
        await client.query(`
            INSERT INTO user_devices (user_id, device_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, device_id) DO NOTHING
        `, [userId, device_id]);

        await client.end();
        return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true }) };
    } catch (err) {
        console.error('admin-assign-device error', err);
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server error' }) };
    }
};
