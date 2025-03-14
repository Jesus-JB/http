const express = require('express');
const router = express.Router();
const { isAdmin, isAdminOrEmployee } = require('../middleware/auth');

// GET all payment methods
router.get('/payment-methods', (req, res) => {
  const db = req.app.locals.db;
  
  db.all('SELECT * FROM payment_methods WHERE is_active = 1', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: 'Payment methods retrieved successfully',
      data: rows
    });
  });
});

// POST create a new order
router.post('/orders', async (req, res) => {
  const db = req.app.locals.db;
  const { customer_name, payment_method, items } = req.body;
  const user_id = req.user.id; // From JWT token
  
  // Validate required fields
  if (!payment_method || !items || !items.length) {
    return res.status(400).json({ 
      error: 'Payment method and at least one item are required' 
    });
  }
  
  // Start a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    try {
      // Calculate total amount and validate stock
      let total_amount = 0;
      const itemsToProcess = [];
      
      // Process each item in the order
      const processItems = new Promise((resolve, reject) => {
        let processed = 0;
        
        items.forEach(item => {
          // Get product details and check stock
          db.get('SELECT * FROM products WHERE id = ?', [item.product_id], (err, product) => {
            if (err) {
              return reject(err);
            }
            
            if (!product) {
              return reject(new Error(`Product with ID ${item.product_id} not found`));
            }
            
            if (product.stock < item.quantity) {
              return reject(new Error(`Not enough stock for product: ${product.name}`));
            }
            
            // Calculate subtotal
            const subtotal = product.price * item.quantity;
            total_amount += subtotal;
            
            // Add to items to process
            itemsToProcess.push({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: product.price,
              subtotal: subtotal,
              product_name: product.name
            });
            
            processed++;
            if (processed === items.length) {
              resolve();
            }
          });
        });
      });
      
      processItems.then(() => {
        // Create the order
        const orderSql = `INSERT INTO orders 
          (user_id, customer_name, total_amount, payment_method, payment_status, order_status) 
          VALUES (?, ?, ?, ?, 'completed', 'completed')`;
        
        db.run(orderSql, [user_id, customer_name, total_amount, payment_method], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          
          const order_id = this.lastID;
          
          // Insert order items
          const itemStmt = db.prepare(`INSERT INTO order_items 
            (order_id, product_id, quantity, unit_price, subtotal) 
            VALUES (?, ?, ?, ?, ?)`);
          
          itemsToProcess.forEach(item => {
            itemStmt.run([order_id, item.product_id, item.quantity, item.unit_price, item.subtotal], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
            });
            
            // Update product stock
            db.run('UPDATE products SET stock = stock - ? WHERE id = ?', 
              [item.quantity, item.product_id], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
            });
          });
          
          itemStmt.finalize();
          
          // Commit the transaction
          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            
            // Return the created order with items
            res.status(201).json({
              message: 'Order created successfully',
              data: {
                id: order_id,
                user_id,
                customer_name,
                total_amount,
                payment_method,
                payment_status: 'completed',
                order_status: 'completed',
                items: itemsToProcess
              }
            });
          });
        });
      }).catch(error => {
        db.run('ROLLBACK');
        res.status(400).json({ error: error.message });
      });
      
    } catch (error) {
      db.run('ROLLBACK');
      res.status(500).json({ error: error.message });
    }
  });
});

// GET all orders
router.get('/orders', (req, res) => {
  const db = req.app.locals.db;
  const user = req.user;
  
  // If admin, get all orders, otherwise get only user's orders
  const sql = user.role === 'admin' 
    ? 'SELECT * FROM orders ORDER BY created_at DESC' 
    : 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC';
  
  const params = user.role === 'admin' ? [] : [user.id];
  
  db.all(sql, params, (err, orders) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      message: 'Orders retrieved successfully',
      data: orders
    });
  });
});

// GET a single order with its items
router.get('/orders/:id', (req, res) => {
  const db = req.app.locals.db;
  const orderId = req.params.id;
  const user = req.user;
  
  // If not admin, ensure user can only access their own orders
  const orderSql = user.role === 'admin'
    ? 'SELECT * FROM orders WHERE id = ?'
    : 'SELECT * FROM orders WHERE id = ? AND user_id = ?';
  
  const orderParams = user.role === 'admin' ? [orderId] : [orderId, user.id];
  
  db.get(orderSql, orderParams, (err, order) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order items
    db.all(`
      SELECT oi.*, p.name as product_name, p.description as product_description 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = ?
    `, [orderId], (err, items) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Add items to order object
      order.items = items;
      
      res.json({
        message: 'Order retrieved successfully',
        data: order
      });
    });
  });
});

// GET order receipt (for generating PDF/printable receipt)
router.get('/orders/:id/receipt', (req, res) => {
  const db = req.app.locals.db;
  const orderId = req.params.id;
  const user = req.user;
  
  // If not admin, ensure user can only access their own orders
  const orderSql = user.role === 'admin'
    ? `SELECT o.*, u.fullname as employee_name 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       WHERE o.id = ?`
    : `SELECT o.*, u.fullname as employee_name 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       WHERE o.id = ? AND o.user_id = ?`;
  
  const orderParams = user.role === 'admin' ? [orderId] : [orderId, user.id];
  
  db.get(orderSql, orderParams, (err, order) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order items with product details
    db.all(`
      SELECT oi.*, p.name as product_name, p.description as product_description 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = ?
    `, [orderId], (err, items) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Add items to order object
      order.items = items;
      
      // Get business info (could be stored in a settings table in the future)
      const businessInfo = {
        name: 'Mini-Market Jesus',
        address: '123 Market Street',
        phone: '555-123-4567',
        email: 'info@minimarket.com',
        taxId: '12-3456789'
      };
      
      res.json({
        message: 'Receipt data retrieved successfully',
        data: {
          order: order,
          business: businessInfo,
          receiptNumber: `REC-${order.id.toString().padStart(6, '0')}`,
          receiptDate: new Date(order.created_at).toLocaleDateString()
        }
      });
    });
  });
});

// GET sales statistics (admin and employee)
router.get('/statistics', isAdminOrEmployee, (req, res) => {
  const db = req.app.locals.db;
  
  // Get date range from query params or default to last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (req.query.days || 30));
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0] + ' 23:59:59';
  
  // Get total sales amount
  db.get(`
    SELECT SUM(total_amount) as total_sales, COUNT(*) as order_count 
    FROM orders 
    WHERE created_at BETWEEN ? AND ?
  `, [startDateStr, endDateStr], (err, salesData) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Get top selling products
    db.all(`
      SELECT p.id, p.name, SUM(oi.quantity) as total_quantity, 
             SUM(oi.subtotal) as total_amount 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      JOIN orders o ON oi.order_id = o.id 
      WHERE o.created_at BETWEEN ? AND ? 
      GROUP BY p.id 
      ORDER BY total_quantity DESC 
      LIMIT 5
    `, [startDateStr, endDateStr], (err, topProducts) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Get sales by payment method
      db.all(`
        SELECT payment_method, COUNT(*) as count, SUM(total_amount) as total 
        FROM orders 
        WHERE created_at BETWEEN ? AND ? 
        GROUP BY payment_method
      `, [startDateStr, endDateStr], (err, paymentMethods) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({
          message: 'Sales statistics retrieved successfully',
          data: {
            period: {
              start: startDateStr,
              end: endDateStr.split(' ')[0],
              days: parseInt(req.query.days) || 30
            },
            sales: {
              total: salesData.total_sales || 0,
              count: salesData.order_count || 0
            },
            topProducts: topProducts,
            paymentMethods: paymentMethods
          }
        });
      });
    });
  });
});

module.exports = router;