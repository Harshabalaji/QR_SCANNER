const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// Apply Manager-only authentication to all user management routes
router.use(requireAuth, requireRole('manager'));

/**
 * GET /api/users
 * Returns list of cashiers and managers (excluding pin_hash)
 */
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, username, role, is_active, created_at, updated_at FROM users ORDER BY role DESC, created_at DESC'
    );
    return res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users.',
    });
  }
});

/**
 * POST /api/users
 * Create new user account (Cashier or Manager)
 */
router.post('/', async (req, res) => {
  try {
    const { name, username, pin, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }
    if (!pin || String(pin).trim().length < 4) {
      return res.status(400).json({ success: false, message: 'PIN must be at least 4 digits' });
    }

    const assignedRole = (role || 'cashier').toLowerCase();
    if (!['cashier', 'manager'].includes(assignedRole)) {
      return res.status(400).json({ success: false, message: 'Role must be cashier or manager' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check username uniqueness
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: `Username "${cleanUsername}" already exists.` });
    }

    const pinHash = bcrypt.hashSync(String(pin).trim(), 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, username, pin_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
      [name.trim(), cleanUsername, pinHash, assignedRole]
    );

    return res.status(201).json({
      success: true,
      message: `User ${name.trim()} (${assignedRole.toUpperCase()}) created successfully.`,
      data: {
        id: result.insertId,
        name: name.trim(),
        username: cleanUsername,
        role: assignedRole,
        is_active: 1,
      },
    });
  } catch (err) {
    console.error('Create User Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

/**
 * PUT /api/users/:id/toggle-active
 * Enable / Disable user account
 */
router.put('/:id/toggle-active', async (req, res) => {
  try {
    const userId = req.params.id;
    const [rows] = await pool.query('SELECT id, is_active, username FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newStatus = rows[0].is_active ? 0 : 1;
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, userId]);

    return res.json({
      success: true,
      message: `User ${rows[0].username} is now ${newStatus ? 'ACTIVE' : 'DISABLED'}.`,
      is_active: newStatus,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
});

/**
 * PUT /api/users/:id/reset-pin
 * Securely reset user PIN
 */
router.put('/:id/reset-pin', async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPin } = req.body;

    if (!newPin || String(newPin).trim().length < 4) {
      return res.status(400).json({ success: false, message: 'New PIN must be at least 4 digits.' });
    }

    const [rows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const pinHash = bcrypt.hashSync(String(newPin).trim(), 10);
    await pool.query('UPDATE users SET pin_hash = ? WHERE id = ?', [pinHash, userId]);

    return res.json({
      success: true,
      message: `PIN for user ${rows[0].username} has been reset successfully.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to reset PIN.' });
  }
});

module.exports = router;
