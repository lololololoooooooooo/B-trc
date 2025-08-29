const db = require('./db'); // Assuming a db client is available
const jwt = require('jsonwebtoken'); // Assuming a JWT library is available

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and password are required' }),
      };
    }

    // Query the database for the admin user
    const { rows } = await db.query('SELECT * FROM admin_users WHERE email = $1 AND password = $2', [email, password]);

    if (rows.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    // Assuming the first row is the admin user
    const adminUser = rows[0];

    // Generate a secure admin token (replace 'your_jwt_secret' with a strong secret)
    const adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: 'admin' }, 'your_jwt_secret', { expiresIn: '1h' });

    return {
      statusCode: 200,
      body: JSON.stringify({ token: adminToken }),
    };

  } catch (error) {
    console.error('Admin login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
