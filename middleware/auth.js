const jwt = require('jsonwebtoken');

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'mini-market-jesus-secret-key';

// Generate JWT token
const generateToken = (user) => {
  // Create token payload (don't include password)
  const payload = {
    id: user.id,
    username: user.username,
    fullname: user.fullname,
    role: user.role
  };

  // Sign the token with a secret key and set expiration
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
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
    return res.status(403).json({ error: 'Invalid token.' });
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
  generateToken,
  authenticateToken,
  isAdmin
};