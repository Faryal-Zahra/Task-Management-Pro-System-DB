const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).send({ error: 'Authentication required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const pool = await req.poolPromise;

    const result = await pool.request()
      .input('userId', decoded.user_id)
      .query('SELECT * FROM users WHERE user_id = @userId');

    if (!result.recordset.length) return res.status(401).send({ error: 'Invalid token' });

    req.user = result.recordset[0];
    next();
  } catch (error) {
    res.status(401).send({ error: 'Invalid authentication' });
  }
};

module.exports = authenticate;
