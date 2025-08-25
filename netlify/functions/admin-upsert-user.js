// netlify/functions/admin-upsert-user.js
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

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
        const { email, password, role } = JSON.parse(event.body || '{}');
        if (!email || !password) {
            return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'email and password required' }) };
        }
        const password_hash = await bcrypt.hash(password, 10);

        const client = new Client({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });
        await client.connect();

        const upsert = `
            INSERT INTO users (email, password_hash, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (email)
            DO UPDATE SET password_hash = EXCLUDED.password_hash, role = COALESCE(EXCLUDED.role, users.role)
            RETURNING id, email, role
        `;
        const res = await client.query(upsert, [email, password_hash, role || 'member']);
        await client.end();

        return { statusCode: 200, headers: cors, body: JSON.stringify({ user: res.rows[0] }) };
    } catch (err) {
        console.error('admin-upsert-user error', err);
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server error' }) };
    }
};
