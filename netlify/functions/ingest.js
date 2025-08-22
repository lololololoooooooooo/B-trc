// netlify/functions/ingest.js
const store = global.store || new Map();   // shared memory

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Device-Token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // CORS pre-flight
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 200, headers: cors, body: '' };

  // Token check
  const token = (event.headers['x-device-token'] || '').trim();
  if (token !== (process.env.DEVICE_TOKEN || '').trim())
    return { statusCode: 401, headers: cors, body: 'Unauthorized' };

  // Parse body
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: cors, body: 'Bad JSON' }; }

  // Add timestamp if missing
  if (!body.ts) body.ts = Date.now();

  // Save in shared memory
  store.set(body.id || 'unknown', body);

  console.log('stored', body);
  global.store = store;    // make sure both functions use the same store
  return { statusCode: 200, headers: cors, body: 'OK' };
};
