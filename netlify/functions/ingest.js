// 1-line install: npm i faunadb  (but we bundle it in the function)
const faunadb = require('faunadb');
const q = faunadb.query;
const client = new faunadb.Client({ secret: process.env.FAUNA_SERVER_KEY });

exports.handler = async (event, context) => {
  // CORS so browser can call it too
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Device-Token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  // 1) Token check
  const token = event.headers['x-device-token'];
  if (token !== process.env.DEVICE_TOKEN)
    return { statusCode: 401, body: 'Unauthorized' };

  // 2) Parse payload
  const body = JSON.parse(event.body);
  const doc = {
    device_id: body.id,
    v: body.v,
    t: body.t,
    soc: body.soc,
    lat: body.lat,
    lon: body.lon,
    ts: body.ts || Date.now(),
  };

  // 3) Save to Fauna
  await client.query(q.Create(q.Collection('telemetry'), { data: doc }));

  return { statusCode: 200, headers: cors, body: 'OK' };
};
