/**
 * CacheManager - A shared utility for caching data across services
 * Provides a consistent caching mechanism with timeout functionality
 */
class CacheManager {
  constructor(timeout = 5 * 60 * 1000) { // Default 5 minutes
    this.cache = new Map();
    this.cacheTimeout = timeout;
  }

  /**
   * Get an item from the cache
   * @param {string} key - The cache key
   * @returns {any|null} - The cached data or null if not found/expired
   */
  get(key) {
    if (this.cache.has(key)) {
      const { data, timestamp } = this.cache.get(key);
      if (Date.now() - timestamp < this.cacheTimeout) {
        return data;
      }
      // Automatically remove expired items
      this.delete(key);
    }
    return null;
  }

  /**
   * Set an item in the cache
   * @param {string} key - The cache key
   * @param {any} data - The data to cache
   * @returns {void}
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Check if a key exists in the cache and is not expired
   * @param {string} key - The cache key
   * @returns {boolean} - True if the key exists and is not expired
   */
  has(key) {
    if (this.cache.has(key)) {
      const { timestamp } = this.cache.get(key);
      return Date.now() - timestamp < this.cacheTimeout;
    }
    return false;
  }

  /**
   * Delete an item from the cache
   * @param {string} key - The cache key
   * @returns {boolean} - True if the item was deleted
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Delete multiple items from the cache based on a prefix
   * @param {string} prefix - The key prefix to match
   * @returns {number} - Number of items deleted
   */
  deleteByPrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all items from the cache
   * @returns {void}
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get the number of items in the cache
   * @returns {number} - The number of cached items
   */
  size() {
    return this.cache.size;
  }
}

module.exports = CacheManager;