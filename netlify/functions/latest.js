// netlify/functions/latest.js

const { Client } = require('pg');

async function ensureSchema(client) {
	const ddl = `
		CREATE TABLE IF NOT EXISTS devices (
			id SERIAL PRIMARY KEY,
			device_id VARCHAR(255) UNIQUE NOT NULL,
			lat DECIMAL(10, 8) NOT NULL,
			lon DECIMAL(11, 8) NOT NULL,
			soc INTEGER,
			v DECIMAL(5, 2),
			t DECIMAL(5, 2),
			ts BIGINT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
	`;
	await client.query(ddl);
}

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
		// Check if database URL is available
		if (!process.env.NETLIFY_DATABASE_URL) {
			console.error('NETLIFY_DATABASE_URL environment variable not set');
			return {
				statusCode: 500,
				headers: { ...cors, 'Content-Type': 'application/json' },
				body: JSON.stringify({ error: 'Database configuration error' }),
			};
		}
		
		// Connect to PostgreSQL
		const client = new Client({
			connectionString: process.env.NETLIFY_DATABASE_URL,
			ssl: { rejectUnauthorized: false }
		});
		
		await client.connect();
		await ensureSchema(client);
		
		// Query for latest device data
		const result = await client.query(`
			SELECT device_id, lat, lon, soc, v, t, ts, 
			       created_at, updated_at
			FROM devices 
			ORDER BY updated_at DESC
		`);
		
		await client.end();
		
		console.log('Returning', result.rows.length, 'devices from database');
		return {
			statusCode: 200,
			headers: { ...cors, 'Content-Type': 'application/json' },
			body: JSON.stringify(result.rows),
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
