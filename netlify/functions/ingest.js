// netlify/functions/ingest.js
const store = new Map();   // in-memory KV (survives cold-start seconds)

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Device-Token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  const token = (event.headers['x-device-token'] || '').trim();
  if (token !== (process.env.DEVICE_TOKEN || '').trim()) {
    return { statusCode: 401, headers: cors, body: 'Unauthorized' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: cors, body: 'Bad JSON' }; }

  if (!body.ts) body.ts = Date.now();
  store.set(body.id || 'unknown', body);
  console.log('stored', body);

  return { statusCode: 200, headers: cors, body: 'OK' };
};
