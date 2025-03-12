const express = require('express');
const router = express.Router();
const { getUserByUsername, createUser } = require('../models/users');
const { generateToken, authenticateToken } = require('../middleware/auth');

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user by username
    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Verify password
    const bcrypt = require('bcrypt');
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Return user info and token (exclude password)
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        fullname: user.fullname,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Register route (only admin can create new users)
router.post('/register', async (req, res) => {
  try {
    const { username, password, fullname, role } = req.body;
    
    // Validate input
    if (!username || !password || !fullname || !role) {
      return res.status(400).json({ 
        error: 'All fields are required (username, password, fullname, role)' 
      });
    }
    
    // Validate role
    if (role !== 'admin' && role !== 'employee') {
      return res.status(400).json({ error: 'Role must be either "admin" or "employee"' });
    }
    
    // Check if username already exists
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create new user
    const newUser = await createUser({
      username,
      password,
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
    // Get all users from the database
    const { getAllUsers } = require('../models/users');
    const users = await getAllUsers();
    
    res.json({
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'An error occurred while getting users' });
  }
});

// Update user (admin only)
router.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    
    const userId = req.params.id;
    const { username, password, fullname, role } = req.body;
    
    // Validate input
    if (!username || !fullname || !role) {
      return res.status(400).json({ 
        error: 'Username, fullname, and role are required' 
      });
    }
    
    // Validate role
    if (role !== 'admin' && role !== 'employee') {
      return res.status(400).json({ error: 'Role must be either "admin" or "employee"' });
    }
    
    // Get user by ID
    const { getUserById, getUserByUsername } = require('../models/users');
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if username already exists (if changing username)
    if (username !== user.username) {
      const existingUser = await getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }
    
    // Update user in database
    const db = req.app.locals.db;
    let sql, params;
    
    if (password) {
      // If password is provided, update it too
      const bcrypt = require('bcrypt');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      sql = `UPDATE users SET username = ?, password = ?, fullname = ?, role = ? WHERE id = ?`;
      params = [username, hashedPassword, fullname, role, userId];
    } else {
      // Don't update password
      sql = `UPDATE users SET username = ?, fullname = ?, role = ? WHERE id = ?`;
      params = [username, fullname, role, userId];
    }
    
    await new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Get updated user
    const updatedUser = await getUserById(userId);
    
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'An error occurred while updating the user' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    
    const userId = req.params.id;
    
    // Get user by ID
    const { getUserById } = require('../models/users');
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user from database
    const db = req.app.locals.db;
    const sql = `DELETE FROM users WHERE id = ?`;
    
    await new Promise((resolve, reject) => {
      db.run(sql, [userId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'An error occurred while deleting the user' });
  }
});

module.exports = router;