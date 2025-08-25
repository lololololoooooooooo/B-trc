// netlify/functions/auth-login.js
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: cors, body: '' };
    }

    if (!process.env.JWT_SECRET) {
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing JWT_SECRET' }) };
    }
    if (!process.env.NETLIFY_DATABASE_URL) {
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing DB config' }) };
    }

    try {
        const { email, password } = JSON.parse(event.body || '{}');
        if (!email || !password) {
            return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'email and password required' }) };
        }

        const client = new Client({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });
        await client.connect();
        const res = await client.query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [email]);
        await client.end();

        if (res.rows.length === 0) {
            return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Invalid credentials' }) };
        }
        const user = res.rows[0];
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) {
            return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Invalid credentials' }) };
        }

        const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
        return { statusCode: 200, headers: cors, body: JSON.stringify({ token }) };
    } catch (err) {
        console.error('auth-login error', err);
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server error' }) };
    }
};
