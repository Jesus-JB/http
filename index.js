const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies for CSRF protection
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Import rate limiting middleware
const { apiLimiter } = require('./middleware/rate-limit');

// Apply API rate limiting to all routes
app.use('/api', apiLimiter);

// Database setup
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize users table
const { initializeUsersTable } = require('./models/users');
initializeUsersTable()
  .then(() => console.log('Users system initialized'))
  .catch(err => console.error('Error initializing users system:', err));

// Initialize products table
const { initializeProductsTable } = require('./models/products');
initializeProductsTable()
  .then(() => console.log('Products system initialized'))
  .catch(err => console.error('Error initializing products system:', err));

// Initialize cart tables
const { initializeCartsTable, initializeCartItemsTable } = require('./models/carts');
initializeCartsTable()
  .then(() => initializeCartItemsTable())
  .then(() => console.log('Cart system initialized'))
  .catch(err => console.error('Error initializing cart system:', err));

// Make db available to routes
app.locals.db = db;

// Import routes
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/carts');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', authenticateToken, productRoutes); // Protect product routes
app.use('/api/carts', cartRoutes); // Cart routes are protected in the router

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