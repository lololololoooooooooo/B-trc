// netlify/functions/ingest.js
exports.handler = async (event, context) => {
  const KV = context.clientContext?.custom?.KV;  // Netlify KV (beta) or use env KV_REST_TOKEN
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Device-Token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 200, headers: cors, body: '' };

  const token = event.headers['x-device-token'] || event.headers['X-Device-Token'];
  if (token !== process.env.DEVICE_TOKEN)
    return { statusCode: 401, body: 'Unauthorized', headers: cors };

  const body = JSON.parse(event.body);
  const id = body.id || 'unknown';
  const ts = Date.now();

  // Store in Netlify KV (or just echo for now)
  console.log(JSON.stringify({ ...body, ts }));

  return { statusCode: 200, headers: cors, body: 'OK' };
};
