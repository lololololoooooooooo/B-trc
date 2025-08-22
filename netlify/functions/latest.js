// netlify/functions/latest.js
const faunadb = require('faunadb');

exports.handler = async () => {
    try {
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deviceData),
        };
        
    } catch (error) {
        console.error('Database error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Database error' }),
        };
    }
};
