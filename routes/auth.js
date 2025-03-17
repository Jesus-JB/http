const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const { generateToken, generateRefreshToken, verifyRefreshToken, authenticateToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rate-limit');
const { csrfProtection, handleCsrfError } = require('../middleware/csrf');

// Apply CSRF protection to all routes
router.use(csrfProtection);
router.use(handleCsrfError);

// Get CSRF token
router.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Login route with rate limiting
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = req.app.locals.db;
    const userService = new UserService(db);
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user by username
    const user = await userService.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Verify password
    const bcrypt = require('bcrypt');
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Return user info and tokens (exclude password)
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        fullname: user.fullname,
        role: user.role
      },
      token: accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Refresh token route
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const db = req.app.locals.db;
    const userService = new UserService(db);
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
    
    // Get user from database
    const user = await userService.getUserById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate new access token
    const accessToken = generateToken(user);
    
    res.json({
      message: 'Token refreshed successfully',
      token: accessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'An error occurred during token refresh' });
  }
});

// Register route (only admin can create new users)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { username, password, fullname, role } = req.body;
    const db = req.app.locals.db;
    const userService = new UserService(db);
    
    // Validate input
    if (!username || !password || !fullname || !role) {
      return res.status(400).json({ 
        error: 'All fields are required (username, password, fullname, role)' 
      });
    }
    
    // Validate role
    if (role !== 'admin' && role !== 'employee' && role !== 'client') {
      return res.status(400).json({ error: 'Role must be either "admin", "employee", or "client"' });
    }
    
    // Check if username already exists
    const existingUser = await userService.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create new user
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = await userService.createUser({
      username,
      password: hashedPassword,
      email: username, // Using username as email for simplicity
      fullname,
      role
    });
    
    res.status(201).json({
      message: 'User registered successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An error occurred during registration' });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // This route will be protected by the authenticateToken middleware
    // The user info will be available in req.user
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'An error occurred while getting user info' });
  }
});

// Get all users (both admin and employees can view)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userService = new UserService(db);
    
    // Get all users from the database
    const users = await userService.getAllUsers();
    
    res.json({
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'An error occurred while getting users' });
  }
});

module.exports = router;