// netlify/functions/admin-auth-check.js
exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  if (!process.env.ADMIN_TOKEN) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing ADMIN_TOKEN' }) };
  }
  const token = (event.headers['x-admin-token'] || '').trim();
  if (token !== process.env.ADMIN_TOKEN.trim()) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
};
