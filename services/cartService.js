const { getActiveCartForUser, createCart, getCartWithItems, addItemToCart, updateCartItemQuantity, removeCartItem, completeCart, getUserOrderHistory } = require('../models/carts');
const { getProductById } = require('../models/products');
const CacheManager = require('./cacheManager');

class CartService {
  constructor(db) {
    this.db = db;
    this.cache = new CacheManager(5 * 60 * 1000); // 5 minutes
  }

  async getOrCreateCart(userId) {
    try {
      // Try to get active cart
      let cart = await getActiveCartForUser(userId);
      
      // If no active cart, create one
      if (!cart) {
        cart = await createCart(userId);
      }
      
      return cart;
    } catch (error) {
      throw error;
    }
  }

  async getCartWithItems(cartId) {
    const cacheKey = `cart_${cartId}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const cart = await getCartWithItems(cartId);
      if (cart) {
        this.cache.set(cacheKey, cart);
      }
      return cart;
    } catch (error) {
      throw error;
    }
  }

  async addItemToCart(userId, productId, quantity) {
    try {
      // Get or create cart
      const cart = await this.getOrCreateCart(userId);
      
      // Get product to get current price
      const product = await getProductById(productId);
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Check if there's enough stock
      if (product.stock < quantity) {
        throw new Error(`Not enough stock. Available: ${product.stock}`);
      }
      
      // Add item to cart
      const cartItem = await addItemToCart(cart.id, productId, quantity, product.price);
      
      // Clear cache
      this.cache.delete(`cart_${cart.id}`);
      
      return cartItem;
    } catch (error) {
      throw error;
    }
  }

  async updateCartItemQuantity(userId, cartItemId, quantity) {
    try {
      // Get active cart
      const cart = await getActiveCartForUser(userId);
      if (!cart) {
        throw new Error('No active cart found');
      }
      
      // Update item quantity
      const result = await updateCartItemQuantity(cartItemId, quantity);
      
      // Clear cache
      this.cache.delete(`cart_${cart.id}`);
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async removeCartItem(userId, cartItemId) {
    try {
      // Get active cart
      const cart = await getActiveCartForUser(userId);
      if (!cart) {
        throw new Error('No active cart found');
      }
      
      // Remove item
      const result = await removeCartItem(cartItemId);
      
      // Clear cache
      this.cache.delete(`cart_${cart.id}`);
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async checkout(userId) {
    try {
      // Get active cart
      const cart = await getActiveCartForUser(userId);
      if (!cart) {
        throw new Error('No active cart found');
      }
      
      // Get cart with items
      const cartWithItems = await getCartWithItems(cart.id);
      if (!cartWithItems.items || cartWithItems.items.length === 0) {
        throw new Error('Cart is empty');
      }
      
      // Complete cart
      const result = await completeCart(cart.id);
      
      // Clear cache
      this.cache.delete(`cart_${cart.id}`);
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getOrderHistory(userId) {
    const cacheKey = `orders_${userId}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const orders = await getUserOrderHistory(userId);
      this.cache.set(cacheKey, orders);
      return orders;
    } catch (error) {
      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = CartService;