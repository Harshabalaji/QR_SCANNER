const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Body: { username: string, pin: string, role: 'cashier' | 'manager' }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, pin, role } = req.body;
    const requestedRole = (role || 'cashier').toLowerCase();
    const cleanUsername = (username || '').trim();
    const cleanPin = String(pin || '').trim();

    if (!cleanPin || !cleanUsername) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Lookup user by username
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
      [cleanUsername]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const targetUser = rows[0];

    // Check account active
    if (!targetUser.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Check role match (database user role must match selected tab role)
    if (targetUser.role.toLowerCase() !== requestedRole) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Compare PIN with bcrypt
    const isPinValid = bcrypt.compareSync(cleanPin, targetUser.pin_hash);
    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Generate JWT signed token
    const tokenPayload = {
      userId: targetUser.id,
      username: targetUser.username,
      role: targetUser.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    // Safe User Object (NEVER return PIN or hash)
    const safeUser = {
      id: targetUser.id,
      name: targetUser.name,
      username: targetUser.username,
      role: targetUser.role,
    };

    return res.json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
    });
  }
});

/**
 * GET /api/auth/me
 * Returns authenticated user profile
 */
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

module.exports = router;
