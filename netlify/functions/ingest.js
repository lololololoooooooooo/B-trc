// netlify/functions/ingest.js
exports.handler = async (event) => {
  // ---- CORS boilerplate ----
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Device-Token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 200, headers: cors, body: '' };

  // ---- Auth ----
  const token = (event.headers['x-device-token'] || event.headers['X-Device-Token'] || '').trim();
  if (token !== (process.env.DEVICE_TOKEN || '').trim())
    return { statusCode: 401, headers: cors, body: 'Unauthorized' };

  // ---- Parse body ----
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: cors, body: 'Bad JSON' }; }
  if (!body.ts) body.ts = Date.now();

  // ---- Persist in Netlify KV (no DB needed) ----
  // Use a simple KV namespace called "telemetry"
  const { KV } = require('@netlify/kv');
  const kv = new KV();
  await kv.set(`device:${body.id}`, JSON.stringify(body));

  console.log('stored', body);
  return { statusCode: 200, headers: cors, body: 'OK' };
};
