const express = require('express');
const router = express.Router();
const CartService = require('../services/cartService');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all cart routes
router.use(authenticateToken);

// Get current user's active cart
router.get('/my-cart', async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    const cartService = new CartService(db);
    
    // Get or create cart
    const cart = await cartService.getOrCreateCart(userId);
    
    // Get cart with items
    const cartWithItems = await cartService.getCartWithItems(cart.id);
    
    res.json({
      message: 'Cart retrieved successfully',
      data: cartWithItems
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'An error occurred while getting cart' });
  }
});

// Add item to cart
router.post('/add-item', async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;
    const db = req.app.locals.db;
    const cartService = new CartService(db);
    
    // Validate input
    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Product ID and quantity > 0 are required' });
    }
    
    // Add item to cart
    const cartItem = await cartService.addItemToCart(userId, productId, quantity);
    
    res.status(201).json({
      message: 'Item added to cart successfully',
      data: cartItem
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: error.message || 'An error occurred while adding item to cart' });
  }
});

// Update cart item quantity
router.put('/update-item/:itemId', async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.itemId;
    const { quantity } = req.body;
    const db = req.app.locals.db;
    const cartService = new CartService(db);
    
    // Validate input
    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }
    
    // Update item quantity
    const result = await cartService.updateCartItemQuantity(userId, itemId, quantity);
    
    res.json({
      message: result.deleted ? 'Item removed from cart' : 'Item quantity updated',
      data: result
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'An error occurred while updating cart item' });
  }
});

// Remove item from cart
router.delete('/remove-item/:itemId', async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.itemId;
    const db = req.app.locals.db;
    const cartService = new CartService(db);
    
    // Remove item
    const result = await cartService.removeCartItem(userId, itemId);
    
    res.json({
      message: 'Item removed from cart successfully',
      data: result
    });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ error: 'An error occurred while removing cart item' });
  }
});

// Checkout (complete purchase)
router.post('/checkout', async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    const cartService = new CartService(db);
    
    // Checkout
    const result = await cartService.checkout(userId);
    
    res.json({
      message: 'Checkout completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during checkout' });
  }
});

// Get order history
router.get('/order-history', async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    const cartService = new CartService(db);
    
    // Get order history
    const orders = await cartService.getOrderHistory(userId);
    
    res.json({
      message: 'Order history retrieved successfully',
      data: orders
    });
  } catch (error) {
    console.error('Get order history error:', error);
    res.status(500).json({ error: 'An error occurred while getting order history' });
  }
});

module.exports = router;