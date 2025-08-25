// netlify/functions/admin-verify.js
const crypto = require('crypto');

function verifyJWT(authHeader, secret){
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ') || !secret) return null;
  try {
    const token = authHeader.slice(7);
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const data = `${h}.${p}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    if (expected !== s) return null;
    const payload = JSON.parse(Buffer.from(p.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch { return null; }
}

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  if (!process.env.JWT_SECRET) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing JWT_SECRET' }) };
  }
  const user = verifyJWT(event.headers['authorization'] || '', process.env.JWT_SECRET);
  if (!user || user.role !== 'admin') {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, email: user.email }) };
};
