const csrf = require('csurf');

// Configure CSRF protection
const csrfProtection = csrf({ 
  cookie: {
    key: '_csrf',
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600 // 1 hour
  }
});

// Middleware to handle CSRF errors
const handleCsrfError = (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  
  // Handle CSRF token errors
  res.status(403).json({
    error: 'Invalid or missing CSRF token',
    message: 'Form submission failed due to security protection. Please refresh the page and try again.'
  });
};

module.exports = {
  csrfProtection,
  handleCsrfError
};