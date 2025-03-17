const jwt = require('jsonwebtoken');

// Secret keys for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'mini-market-jesus-secret-key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'mini-market-jesus-refresh-secret-key';

// Generate access token (short-lived)
const generateToken = (user) => {
  // Create token payload (don't include password)
  const payload = {
    id: user.id,
    username: user.username,
    fullname: user.fullname,
    role: user.role
  };

  // Sign the token with a secret key and set expiration to 15 minutes
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

// Generate refresh token (long-lived)
const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username
  };

  // Sign the refresh token with a different secret key and longer expiration (7 days)
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user info to request object
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired', 
        message: 'Your session has expired. Please refresh your token or login again.'
      });
    }
    return res.status(403).json({ error: 'Invalid token.' });
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. Not authenticated.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }

  next();
};

module.exports = {
  JWT_SECRET,
  REFRESH_TOKEN_SECRET,
  generateToken,
  generateRefreshToken,
  authenticateToken,
  verifyRefreshToken,
  isAdmin
};