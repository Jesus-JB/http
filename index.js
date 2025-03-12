const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Database setup
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    
    // Create products table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        console.log('Products table ready');
      }
    });
  }
});

// Initialize users table
const { initializeUsersTable } = require('./models/users');
initializeUsersTable()
  .then(() => console.log('Users system initialized'))
  .catch(err => console.error('Error initializing users system:', err));

// Make db available to routes
app.locals.db = db;

// Import routes
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

// Use routes
app.use('/api/auth', authRoutes);

// Remove these lines as they're causing issues with the middleware
// The authenticateToken middleware is now applied directly in the route handlers
// app.use('/api/auth/me', authenticateToken);
// app.use('/api/auth/users', authenticateToken);
// app.use('/api/auth/users/:id', authenticateToken);

app.use('/api/products', authenticateToken, productRoutes); // Protect product routes

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Products API',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Handle application shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});