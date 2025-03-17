const CacheManager = require('./cacheManager');

class StateManager {
  constructor() {
    this.state = {};
    this.subscribers = new Map();
    this.cache = new CacheManager(5 * 60 * 1000); // 5 minutes
  }

  // Subscribe to state changes
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  // Notify subscribers of state changes
  notify(key) {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      const value = this.state[key];
      callbacks.forEach(callback => callback(value));
    }
  }

  // Set state value
  setState(key, value) {
    this.state[key] = value;
    this.cache.set(key, value);
    this.notify(key);
  }

  // Get state value with caching
  getState(key) {
    const cachedData = this.cache.get(key);
    if (cachedData) {
      return cachedData;
    }
    return this.state[key];
  }

  // Clear state for a specific key
  clearState(key) {
    delete this.state[key];
    this.cache.delete(key);
    this.notify(key);
  }

  // Clear all state
  clearAllState() {
    this.state = {};
    this.cache.clear();
    this.subscribers.forEach((callbacks, key) => {
      this.notify(key);
    });
  }

  // Clear cache for a specific key
  clearCache(key) {
    this.cache.delete(key);
  }

  // Clear all cache
  clearAllCache() {
    this.cache.clear();
  }
}

module.exports = StateManager;