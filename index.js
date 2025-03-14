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
        console.error('Error creating products table:', err.message);
      } else {
        console.log('Products table ready');
      }
    });
    
    // Create orders table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      customer_name TEXT,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      order_status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`, (err) => {
      if (err) {
        console.error('Error creating orders table:', err.message);
      } else {
        console.log('Orders table ready');
      }
    });
    
    // Create order_items table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )`, (err) => {
      if (err) {
        console.error('Error creating order_items table:', err.message);
      } else {
        console.log('Order items table ready');
      }
    });
    
    // Create payment_methods table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT 1
    )`, (err) => {
      if (err) {
        console.error('Error creating payment_methods table:', err.message);
      } else {
        console.log('Payment methods table ready');
        
        // Insert default payment methods if none exist
        db.get('SELECT COUNT(*) as count FROM payment_methods', (err, row) => {
          if (err) {
            console.error('Error checking payment methods:', err.message);
          } else if (row.count === 0) {
            // Insert default payment methods
            const defaultMethods = [
              ['Cash', 'Cash payment at checkout'],
              ['Credit Card', 'Payment with credit card'],
              ['Debit Card', 'Payment with debit card']
            ];
            
            const stmt = db.prepare('INSERT INTO payment_methods (name, description) VALUES (?, ?)');
            defaultMethods.forEach(method => {
              stmt.run(method, (err) => {
                if (err) console.error('Error inserting payment method:', err.message);
              });
            });
            stmt.finalize();
            console.log('Default payment methods inserted');
          }
        });
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
const salesRoutes = require('./routes/sales');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', authenticateToken, productRoutes); // Protect product routes
app.use('/api/sales', authenticateToken, salesRoutes); // Protect sales routes

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Products API',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      sales: '/api/sales'
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