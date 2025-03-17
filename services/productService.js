const { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } = require('../models/products');
const CacheManager = require('./cacheManager');

class ProductService {
  constructor(db) {
    this.db = db;
    this.cache = new CacheManager(5 * 60 * 1000); // 5 minutes
  }

  async getAllProducts() {
    const cacheKey = 'all_products';
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const products = await getAllProducts();
      this.cache.set(cacheKey, products);
      return products;
    } catch (error) {
      throw error;
    }
  }

  async getProductById(id) {
    const cacheKey = `product_${id}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const product = await getProductById(id);
      if (product) {
        this.cache.set(cacheKey, product);
      }
      return product;
    } catch (error) {
      throw error;
    }
  }

  async createProduct(productData) {
    try {
      const product = await createProduct(productData);
      this.cache.delete('all_products');
      return product;
    } catch (error) {
      throw error;
    }
  }

  async updateProduct(id, productData) {
    try {
      const product = await updateProduct(id, productData);
      this.cache.delete(`product_${id}`);
      this.cache.delete('all_products');
      return product;
    } catch (error) {
      throw error;
    }
  }

  async deleteProduct(id) {
    try {
      await deleteProduct(id);
      this.cache.delete(`product_${id}`);
      this.cache.delete('all_products');
      return true;
    } catch (error) {
      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = ProductService;