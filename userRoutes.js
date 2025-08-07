const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticate = require('./authMiddleware'); // Middleware for authentication

const router = express.Router();

// ✅ Register User
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const pool = await req.poolPromise;

    // Check if the user already exists
    const existingUser = await pool.request()
      .input('email', email)
      .query('SELECT * FROM users WHERE email = @email');

    if (existingUser.recordset.length > 0) {
      return res.status(400).send({ error: 'Email already in use' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultRole = 'Employee';

    // Insert user into database
    await pool.request()
      .input('firstName', firstName)
      .input('lastName', lastName)
      .input('email', email)
      .input('passwordHash', hashedPassword)
      .input('role', defaultRole)
      .query(`
        INSERT INTO users (first_name, last_name, email, password_hash, role)
        VALUES (@firstName, @lastName, @email, @passwordHash, @role)
      `);

    res.status(201).send({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).send({ error: 'Registration failed', details: error.message });
  }
});

// ✅ Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const pool = await req.poolPromise;

    const result = await pool.request()
      .input('email', email)
      .query('SELECT * FROM users WHERE email = @email');
    if (!result.recordset.length) {
      return res.status(400).send({ error: 'Invalid email or password' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).send({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.send({ token, user: { user_id: user.user_id, firstName: user.first_name, lastName: user.last_name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).send({ error: 'Login failed', details: error.message });
  }
});

// ✅ Get All Users (Accessible to Everyone)
router.get('/admin/users', async (req, res) => {
  try {
    const pool = await req.poolPromise;

    const result = await pool.request()
      .query('SELECT user_id, first_name, last_name, email, role FROM users');
    res.send(result.recordset);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch users', details: error.message });
  }
});


// ✅ Delete Any User (Admin Only)
router.delete('/admin/users/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await req.poolPromise;

    if (req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).send({ error: 'Access denied. Only admins can delete users.' });
    }

    const result = await pool.request()
      .input('userId', userId)
      .query('DELETE FROM users WHERE user_id = @userId');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).send({ error: 'User not found' });
    }

    res.send({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to delete user', details: error.message });
  }
});

// ✅ Get User by ID (Self or Admin)
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await req.poolPromise;

    if (req.user.role.toLowerCase() !== 'admin' && req.user.user_id !== parseInt(userId)) {
      return res.status(403).send({ error: 'Unauthorized' });
    }

    const result = await pool.request()
      .input('userId', userId)
      .query('SELECT user_id, first_name, last_name, email, role FROM users WHERE user_id = @userId');

    if (!result.recordset.length) {
      return res.status(404).send({ error: 'User not found' });
    }

    res.send(result.recordset[0]);
  } catch (error) {
    res.status(500).send({ error: 'Error fetching user', details: error.message });
  }
});

// ✅ Delete Self
router.delete('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = await req.poolPromise;

    if (req.user.user_id !== parseInt(userId)) {
      return res.status(403).send({ error: 'Unauthorized. You can only delete your own account.' });
    }

    const result = await pool.request()
      .input('userId', userId)
      .query('DELETE FROM users WHERE user_id = @userId');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).send({ error: 'User not found' });
    }

    res.send({ message: 'Your account has been deleted successfully.' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to delete account', details: error.message });
  }
});

// ✅ Update Self Credentials
router.put('/update-credentials', authenticate, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const pool = await req.poolPromise;

    const result = await pool.request()
      .input('userId', req.user.user_id)
      .query('SELECT * FROM users WHERE user_id = @userId');

    if (!result.recordset.length) {
      return res.status(404).send({ error: 'User not found' });
    }

    const user = result.recordset[0];

    if (newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).send({ error: 'Current password is incorrect' });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await pool.request()
        .input('hashedNewPassword', hashedNewPassword)
        .input('userId', req.user.user_id)
        .query('UPDATE users SET password_hash = @hashedNewPassword WHERE user_id = @userId');
    }

    if (email && email !== user.email) {
      const emailExists = await pool.request()
        .input('email', email)
        .query('SELECT * FROM users WHERE email = @email');
      if (emailExists.recordset.length > 0) {
        return res.status(400).send({ error: 'Email already in use' });
      }
      await pool.request()
        .input('email', email)
        .input('userId', req.user.user_id)
        .query('UPDATE users SET email = @email WHERE user_id = @userId');
    }

    res.send({ message: 'Credentials updated successfully' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to update credentials', details: error.message });
  }
});

module.exports = router;


