// netlify/functions/auth-login.js
const { Client } = require('pg');
const crypto = require('crypto');

function base64url(input) {
    return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signJWT(payload, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encHeader = base64url(JSON.stringify(header));
    const encPayload = base64url(JSON.stringify(payload));
    const data = `${encHeader}.${encPayload}`;
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${data}.${sig}`;
}

async function verifyPassword(password, stored) {
    // stored format: s1:<hexSalt>:<hexHash>
    if (!stored || !stored.startsWith('s1:')) return false;
    const [, hexSalt, hexHash] = stored.split(':');
    const salt = Buffer.from(hexSalt, 'hex');
    const hash = await new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 32, (err, dk) => err ? reject(err) : resolve(dk));
    });
    return crypto.timingSafeEqual(hash, Buffer.from(hexHash, 'hex'));
}

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
        const ok = await verifyPassword(password, user.password_hash);
        if (!ok) {
            return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Invalid credentials' }) };
        }

        const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 12; // 12h
        const token = signJWT({ sub: user.id, email: user.email, role: user.role, exp }, process.env.JWT_SECRET);
        return { statusCode: 200, headers: cors, body: JSON.stringify({ token }) };
    } catch (err) {
        console.error('auth-login error', err);
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server error' }) };
    }
};
