const express = require('express');
const router = express.Router();

// GET all products
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: 'Products retrieved successfully',
      data: rows
    });
  });
});

// GET a single product by id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;
  
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({
      message: 'Product retrieved successfully',
      data: row
    });
  });
});

// POST a new product
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { name, description, price, stock } = req.body;
  
  // Validate required fields
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required fields' });
  }
  
  const sql = `INSERT INTO products (name, description, price, stock) 
               VALUES (?, ?, ?, ?)`;
  const params = [name, description, price, stock || 0];
  
  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Get the newly created product
    db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        message: 'Product created successfully',
        data: row
      });
    });
  });
});

// PUT (update) an existing product
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;
  const { name, description, price, stock } = req.body;
  
  // Validate required fields
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required fields' });
  }
  
  // Check if product exists
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Update the product
    const sql = `UPDATE products 
                 SET name = ?, description = ?, price = ?, stock = ? 
                 WHERE id = ?`;
    const params = [name, description, price, stock || 0, id];
    
    db.run(sql, params, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Get the updated product
      db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({
          message: 'Product updated successfully',
          data: row
        });
      });
    });
  });
});

// DELETE a product
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;
  
  // Check if product exists
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Delete the product
    db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        message: 'Product deleted successfully',
        changes: this.changes
      });
    });
  });
});

module.exports = router;