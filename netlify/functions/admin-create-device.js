// netlify/functions/admin-create-device.js
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
        const { device_id, name, lat, lon } = JSON.parse(event.body || '{}');
        if (!device_id) {
            return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'device_id required' }) };
        }

        const client = new Client({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });
        await client.connect();

        // Ensure exists or create empty row
        const exists = await client.query('SELECT id FROM devices WHERE device_id = $1', [device_id]);
        if (exists.rows.length === 0) {
            await client.query(`
                INSERT INTO devices (device_id, lat, lon, ts, created_at, updated_at, name)
                VALUES ($1, $2, $3, EXTRACT(EPOCH FROM NOW())::BIGINT, NOW(), NOW(), $4)
            `, [device_id, lat ?? 0, lon ?? 0, name ?? null]);
        } else if (name || lat !== undefined || lon !== undefined) {
            await client.query(`
                UPDATE devices SET name = COALESCE($2,name), lat = COALESCE($3,lat), lon = COALESCE($4,lon), updated_at = NOW()
                WHERE device_id = $1
            `, [device_id, name ?? null, lat ?? null, lon ?? null]);
        }

        await client.end();

        const site = (process.env.URL || '').replace(/\/$/, '') || 'https://YOUR-SITE.netlify.app';
        const token = process.env.DEVICE_TOKEN || '<DEVICE_TOKEN>';
        const ps = `Invoke-RestMethod -Uri "${site}/.netlify/functions/ingest" -Method POST -Headers @{ "Content-Type"="application/json"; "X-Device-Token"="${token}" } -Body '{"id":"${device_id}","lat":${lat ?? 0},"lon":${lon ?? 0}}'`;

        return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true, device_id, powershell: ps }) };
    } catch (err) {
        console.error('admin-create-device error', err);
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server error' }) };
    }
};
