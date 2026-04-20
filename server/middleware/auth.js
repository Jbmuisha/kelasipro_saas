const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

/**
 * Extract requester info from JWT Authorization header
 */
const getRequesterFromAuth = (authHeader) => {
  if (!authHeader) {
    console.log('[AUTH DEBUG] No Authorization header');
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    console.log('[AUTH DEBUG] Empty token after stripping');
    return null;
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log('[AUTH DEBUG] Successfully decoded token, payload:', payload);
    return {
      id: payload.id,
      role: payload.role,
      school_id: payload.school_id,
      school_type: payload.school_type
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.log('[AUTH DEBUG] Token expired:', err.message);
    } else if (err.name === 'JsonWebTokenError') {
      console.log('[AUTH DEBUG] Invalid token:', err.message);
    } else {
      console.log('[AUTH DEBUG] Token decode error:', err.message);
    }
    return null;
  }
};

/**
 * Middleware to require authentication
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const requester = getRequesterFromAuth(authHeader);
  
  console.log('[requireAuth] Authorization header:', authHeader ? 'present' : 'missing');
  console.log('[requireAuth] Requester:', requester);
  
  if (!requester) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.requester = requester;
  next();
};

/**
 * Middleware to require SUPER_ADMIN role
 */
const requireSuperAdmin = (req, res, next) => {
  console.log('[requireSuperAdmin] Checking role:', req.requester?.role, 'type:', typeof req.requester?.role);
  
  if (!req.requester) {
    console.log('[requireSuperAdmin] No requester');
    return res.status(401).json({ error: 'Invalid token - no requester' });
  }
  
  if (!req.requester.role) {
    console.log('[requireSuperAdmin] No role in requester');
    return res.status(401).json({ error: 'Invalid token - no role' });
  }
  
  const role = req.requester.role.trim();
  console.log('[requireSuperAdmin] Comparing:', role, '=== SUPER_ADMIN');
  
  if (role !== 'SUPER_ADMIN') {
    console.log('[requireSuperAdmin] Denied - role is:', role);
    return res.status(403).json({ 
      error: `Only SUPER_ADMIN can perform this action (got: ${role})` 
    });
  }
  
  console.log('[requireSuperAdmin] Allowed');
  next();
};

/**
 * Middleware to require SCHOOL_ADMIN or SUPER_ADMIN role
 */
const requireAdmin = (req, res, next) => {
  // First ensure we have a valid requester
  if (!req.requester) {
    return res.status(401).json({ error: 'Invalid token - no requester' });
  }
  
  if (!req.requester.role) {
    return res.status(401).json({ error: 'Invalid token - no role' });
  }
  
  if (!['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(req.requester.role)) {
    return res.status(403).json({ 
      error: `Only SCHOOL_ADMIN or SUPER_ADMIN can perform this action (got: ${req.requester.role})` 
    });
  }
  next();
};

module.exports = {
  getRequesterFromAuth,
  requireAuth,
  requireSuperAdmin,
  requireAdmin,
  JWT_SECRET
};