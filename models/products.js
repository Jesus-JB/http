const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database setup
const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

// Initialize products table
const initializeProductsTable = () => {
  return new Promise((resolve, reject) => {
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
        reject(err);
      } else {
        console.log('Products table ready');
        resolve();
      }
    });
  });
};

// Get all products
const getAllProducts = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM products', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Get product by ID
const getProductById = (id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Create a new product
const createProduct = (productData) => {
  const { name, description, price, stock } = productData;
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO products (name, description, price, stock) 
                 VALUES (?, ?, ?, ?)`;
    const params = [name, description, price, stock || 0];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        getProductById(this.lastID)
          .then(product => resolve(product))
          .catch(err => reject(err));
      }
    });
  });
};

// Update an existing product
const updateProduct = (id, productData) => {
  const { name, description, price, stock } = productData;
  return new Promise((resolve, reject) => {
    const sql = `UPDATE products 
                 SET name = ?, description = ?, price = ?, stock = ? 
                 WHERE id = ?`;
    const params = [name, description, price, stock || 0, id];
    
    db.run(sql, params, (err) => {
      if (err) {
        reject(err);
      } else {
        getProductById(id)
          .then(product => resolve(product))
          .catch(err => reject(err));
      }
    });
  });
};

// Delete a product
const deleteProduct = (id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM products WHERE id = ?', [id], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

module.exports = {
  initializeProductsTable,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};