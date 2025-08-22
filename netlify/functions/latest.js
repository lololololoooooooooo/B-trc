// netlify/functions/latest.js
global.store = global.store || new Map();   // same store
const store = global.store;

exports.handler = async () => {
  const devices = Array.from(store.values());
  console.log('latest returning', devices.length, 'devices');
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(devices),
  };
};
