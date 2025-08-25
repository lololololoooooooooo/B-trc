// netlify/functions/admin-set-device-secret.js
const { Client } = require('pg');
const crypto = require('crypto');

function randomSecret(){ return crypto.randomBytes(16).toString('hex'); }
function hashSecret(secret, deviceId){
  // HMAC with deviceId as salt; stored as s1:<hex>
  const h = crypto.createHmac('sha256', deviceId).update(secret).digest('hex');
  return `s1:${h}`;
}

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  if (!process.env.ADMIN_TOKEN) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing ADMIN_TOKEN' }) };
  if (!process.env.NETLIFY_DATABASE_URL) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing DB config' }) };

  const admin = (event.headers['x-admin-token'] || '').trim();
  if (admin !== process.env.ADMIN_TOKEN.trim()) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) };

  try {
    const { device_id, secret } = JSON.parse(event.body || '{}');
    if (!device_id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'device_id required' }) };

    const client = new Client({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();

    const exists = await client.query('SELECT id FROM devices WHERE device_id = $1', [device_id]);
    if (exists.rows.length === 0) {
      await client.end();
      return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'Device not found' }) };
    }

    const plain = secret || randomSecret();
    const hashed = hashSecret(plain, device_id);
    await client.query('UPDATE devices SET api_token_hash = $2 WHERE device_id = $1', [device_id, hashed]);
    await client.end();

    return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true, device_id, secret: plain }) };
  } catch (e) {
    console.error('admin-set-device-secret error', e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server error' }) };
  }
};
