const express = require('express');
const router = express.Router();
const ProductService = require('../services/productService');

// GET all products
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const productService = new ProductService(db);
  
  productService.getAllProducts()
    .then(products => {
      res.json({
        message: 'Products retrieved successfully',
        data: products
      });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

// GET a single product by id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const productService = new ProductService(db);
  const id = req.params.id;
  
  productService.getProductById(id)
    .then(product => {
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({
        message: 'Product retrieved successfully',
        data: product
      });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

// POST a new product
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const productService = new ProductService(db);
  const { name, description, price, stock } = req.body;
  
  // Validate required fields
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required fields' });
  }
  
  productService.createProduct({ name, description, price, stock })
    .then(product => {
      res.status(201).json({
        message: 'Product created successfully',
        data: product
      });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

// PUT (update) an existing product
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const productService = new ProductService(db);
  const id = req.params.id;
  const { name, description, price, stock } = req.body;
  
  // Validate required fields
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required fields' });
  }
  
  // First check if product exists
  productService.getProductById(id)
    .then(product => {
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Update the product
      return productService.updateProduct(id, { name, description, price, stock });
    })
    .then(updatedProduct => {
      res.json({
        message: 'Product updated successfully',
        data: updatedProduct
      });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

// DELETE a product
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const productService = new ProductService(db);
  const id = req.params.id;
  
  // First check if product exists
  productService.getProductById(id)
    .then(product => {
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Delete the product
      return productService.deleteProduct(id);
    })
    .then(() => {
      res.json({
        message: 'Product deleted successfully',
        changes: 1
      });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

module.exports = router;