const rateLimit = require('express-rate-limit');

// Configure login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes',
    message: 'Rate limit exceeded'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Store should be used in production for distributed systems
  // store: ... // Use Redis or other store for production
});

// Configure API rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after a minute',
    message: 'Rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  apiLimiter
};