// netlify/functions/ingest.js
exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Device-Token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS method for CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers: cors, 
      body: '' 
    };
  }

  // Validate authentication token
  const token = event.headers['x-device-token'] || event.headers['X-Device-Token'];
  if (token !== process.env.DEVICE_TOKEN) {
    return { 
      statusCode: 401, 
      headers: cors, 
      body: 'Unauthorized' 
    };
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return { 
      statusCode: 400, 
      headers: cors, 
      body: 'Bad Request - Invalid JSON' 
    };
  }

  // Add timestamp if not provided
  if (!body.ts) {
    body.ts = Date.now();
  }

  // Store in Netlify KV (if enabled) or just log
  console.log(JSON.stringify(body));

  return { 
    statusCode: 200, 
    headers: cors, 
    body: 'OK' 
  };
};
