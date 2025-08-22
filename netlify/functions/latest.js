// netlify/functions/latest.js
const store = new Map();   // same memory

exports.handler = async () => {
  const devices = Array.from(store.values());
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(devices),
  };
};
