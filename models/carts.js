const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database setup
const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

// Initialize carts table
const initializeCartsTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`, (err) => {
      if (err) {
        console.error('Error creating carts table:', err.message);
        reject(err);
      } else {
        console.log('Carts table ready');
        resolve();
      }
    });
  });
};

// Initialize cart items table
const initializeCartItemsTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price_at_add REAL NOT NULL,
      FOREIGN KEY (cart_id) REFERENCES carts(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`, (err) => {
      if (err) {
        console.error('Error creating cart_items table:', err.message);
        reject(err);
      } else {
        console.log('Cart items table ready');
        resolve();
      }
    });
  });
};

// Get active cart for user
const getActiveCartForUser = (userId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM carts WHERE user_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1', [userId], (err, cart) => {
      if (err) {
        reject(err);
      } else {
        resolve(cart);
      }
    });
  });
};

// Create a new cart for user
const createCart = (userId) => {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO carts (user_id, status) VALUES (?, 'active')`;
    db.run(sql, [userId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          id: this.lastID,
          user_id: userId,
          status: 'active',
          created_at: new Date().toISOString()
        });
      }
    });
  });
};

// Get cart by ID with items
const getCartWithItems = (cartId) => {
  return new Promise((resolve, reject) => {
    // First get the cart
    db.get('SELECT * FROM carts WHERE id = ?', [cartId], (err, cart) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!cart) {
        resolve(null);
        return;
      }
      
      // Then get all items in the cart
      db.all(`
        SELECT ci.*, p.name, p.description 
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.cart_id = ?
      `, [cartId], (err, items) => {
        if (err) {
          reject(err);
        } else {
          cart.items = items || [];
          resolve(cart);
        }
      });
    });
  });
};

// Add item to cart
const addItemToCart = (cartId, productId, quantity, price) => {
  return new Promise((resolve, reject) => {
    // First check if item already exists in cart
    db.get('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?', 
      [cartId, productId], (err, existingItem) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (existingItem) {
          // Update quantity if item exists
          const newQuantity = existingItem.quantity + quantity;
          db.run('UPDATE cart_items SET quantity = ? WHERE id = ?', 
            [newQuantity, existingItem.id], (err) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  id: existingItem.id,
                  cart_id: cartId,
                  product_id: productId,
                  quantity: newQuantity,
                  price_at_add: existingItem.price_at_add
                });
              }
            });
        } else {
          // Insert new item if it doesn't exist
          const sql = `INSERT INTO cart_items (cart_id, product_id, quantity, price_at_add) 
                     VALUES (?, ?, ?, ?)`;
          db.run(sql, [cartId, productId, quantity, price], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({
                id: this.lastID,
                cart_id: cartId,
                product_id: productId,
                quantity: quantity,
                price_at_add: price
              });
            }
          });
        }
      });
  });
};

// Update cart item quantity
const updateCartItemQuantity = (cartItemId, quantity) => {
  return new Promise((resolve, reject) => {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      db.run('DELETE FROM cart_items WHERE id = ?', [cartItemId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ deleted: true, id: cartItemId });
        }
      });
    } else {
      // Update quantity
      db.run('UPDATE cart_items SET quantity = ? WHERE id = ?', 
        [quantity, cartItemId], (err) => {
          if (err) {
            reject(err);
          } else {
            resolve({ id: cartItemId, quantity: quantity });
          }
        });
    }
  });
};

// Remove item from cart
const removeCartItem = (cartItemId) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM cart_items WHERE id = ?', [cartItemId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve({ deleted: true, id: cartItemId });
      }
    });
  });
};

// Complete cart (checkout)
const completeCart = (cartId) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE carts SET status = "completed" WHERE id = ?', [cartId], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve({ id: cartId, status: 'completed' });
      }
    });
  });
};

// Get user's order history (completed carts)
const getUserOrderHistory = (userId) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM carts WHERE user_id = ? AND status = "completed" ORDER BY created_at DESC', 
      [userId], (err, carts) => {
        if (err) {
          reject(err);
        } else {
          resolve(carts);
        }
      });
  });
};

module.exports = {
  initializeCartsTable,
  initializeCartItemsTable,
  getActiveCartForUser,
  createCart,
  getCartWithItems,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  completeCart,
  getUserOrderHistory
};