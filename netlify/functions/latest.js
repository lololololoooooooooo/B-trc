// netlify/functions/latest.js
const faunadb = require('faunadb');

exports.handler = async (event) => {
    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };
    
    // CORS pre-flight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: cors, body: '' };
    }
    
    try {
        // Check if FAUNA_SECRET is available
        if (!process.env.FAUNA_SECRET) {
            console.error('FAUNA_SECRET environment variable not set');
            return {
                statusCode: 500,
                headers: { ...cors, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Database configuration error' }),
            };
        }
        
        // Connect to FaunaDB
        const client = new faunadb.Client({ secret: process.env.FAUNA_SECRET });
        
        const devices = await client.query(
            faunadb.query.Map(
                faunadb.query.Paginate(
                    faunadb.query.Documents(faunadb.query.Collection('devices'))
                ),
                faunadb.query.Lambda('ref', faunadb.query.Get(faunadb.query.Var('ref')))
            )
        );
        
        // Extract just the data from each document
        const deviceData = devices.data.map(device => device.data);
        
        console.log('Returning', deviceData.length, 'devices from database');
        return {
            statusCode: 200,
            headers: { ...cors, 'Content-Type': 'application/json' },
            body: JSON.stringify(deviceData),
        };
        
    } catch (error) {
        console.error('Database error:', error);
        return {
            statusCode: 500,
            headers: { ...cors, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Database error', details: error.message }),
        };
    }
};
