const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'NP_BRANDING_SECURE_JWT_SECRET_KEY_2026';

/**
 * Middleware enforcing JWT authentication.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers['x-access-token'];
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (typeof authHeader === 'string') {
      token = authHeader;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user in database and active status
    const [rows] = await pool.query(
      'SELECT id, name, username, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account inactive or user no longer exists.',
      });
    }

    req.user = {
      id: rows[0].id,
      name: rows[0].name,
      username: rows[0].username,
      role: rows[0].role,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please sign in again.',
    });
  }
}

/**
 * Middleware enforcing role-based authorization.
 * @param  {...string} allowedRoles - e.g. 'manager', 'cashier'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role.toUpperCase()} role is not authorized for this operation.`,
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
  JWT_SECRET,
};
