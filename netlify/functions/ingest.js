// netlify/functions/ingest.js
const faunadb = require('faunadb');

exports.handler = async (event) => {
    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Device-Token',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    
    // CORS pre-flight
    if (event.httpMethod === 'OPTIONS')
        return { statusCode: 200, headers: cors, body: '' };
    
    // Check if required environment variables are set
    if (!process.env.DEVICE_TOKEN) {
        console.error('DEVICE_TOKEN environment variable not set');
        return { 
            statusCode: 500, 
            headers: cors, 
            body: JSON.stringify({ error: 'Server configuration error' }) 
        };
    }
    
    if (!process.env.FAUNA_SECRET) {
        console.error('FAUNA_SECRET environment variable not set');
        return { 
            statusCode: 500, 
            headers: cors, 
            body: JSON.stringify({ error: 'Database configuration error' }) 
        };
    }
    
    // Token check
    const token = (event.headers['x-device-token'] || '').trim();
    if (token !== process.env.DEVICE_TOKEN.trim())
        return { 
            statusCode: 401, 
            headers: cors, 
            body: JSON.stringify({ error: 'Unauthorized' }) 
        };
    
    // Parse body
    let body;
    try { 
        body = JSON.parse(event.body || '{}'); 
    } catch { 
        return { 
            statusCode: 400, 
            headers: cors, 
            body: JSON.stringify({ error: 'Bad JSON' }) 
        }; 
    }
    
    // Validate required fields
    if (!body.id) {
        return { 
            statusCode: 400, 
            headers: cors, 
            body: JSON.stringify({ error: 'Device ID is required' }) 
        };
    }
    
    // Add timestamp if missing
    if (!body.ts) body.ts = Date.now();
    
    try {
        // Connect to FaunaDB (Netlify's recommended database)
        const client = new faunadb.Client({ secret: process.env.FAUNA_SECRET });
        
        // Create or update device
        const result = await client.query(
            faunadb.query.Let(
                {
                    match: faunadb.query.Match(
                        faunadb.query.Index('device_by_id'), 
                        body.id
                    ),
                    device: faunadb.query.If(
                        faunadb.query.Exists(faunadb.query.Var('match')),
                        faunadb.query.Get(faunadb.query.Var('match')),
                        null
                    )
                },
                faunadb.query.If(
                    faunadb.query.Var('device'),
                    faunadb.query.Update(
                        faunadb.query.Select(['ref'], faunadb.query.Var('device')), 
                        {
                            data: {
                                ...body,
                                updatedAt: Date.now()
                            }
                        }
                    ),
                    faunadb.query.Create(
                        faunadb.query.Collection('devices'), 
                        {
                            data: {
                                ...body,
                                createdAt: Date.now(),
                                updatedAt: Date.now()
                            }
                        }
                    )
                )
            )
        );
        
        console.log('Device stored in database:', body.id);
        return { 
            statusCode: 200, 
            headers: cors, 
            body: JSON.stringify({ success: true, message: 'Device data stored successfully' }) 
        };
        
    } catch (error) {
        console.error('Database error:', error);
        return { 
            statusCode: 500, 
            headers: cors, 
            body: JSON.stringify({ error: 'Database error', details: error.message }) 
        };
    }
};
