// netlify/functions/latest.js
// Must use the same store object as ingest.js
const store = global.store || new Map();

exports.handler = async () => {
  const devices = Array.from(store.values());
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(devices),
  };
};
