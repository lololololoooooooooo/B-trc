// netlify/functions/latest.js
exports.handler = async () => {
  const { KV } = require('@netlify/kv');
  const kv = new KV();
  const keys = await kv.list({ prefix: 'device:' });
  const devices = await Promise.all(
    keys.map(k => kv.get(k).then(v => JSON.parse(v || '{}')))
  );
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(devices),
  };
};
