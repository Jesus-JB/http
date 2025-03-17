const { getUserById, getUserByUsername, getAllUsers, createUser, updateUser, verifyPassword } = require('../models/users');
const CacheManager = require('./cacheManager');

class UserService {
  constructor(db) {
    this.db = db;
    this.cache = new CacheManager(5 * 60 * 1000); // 5 minutes
  }

  async getUserById(id) {
    const cacheKey = `user_${id}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const user = await getUserById(id);
      if (user) {
        this.cache.set(cacheKey, user);
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async getUserByUsername(username) {
    const cacheKey = `user_username_${username}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const user = await getUserByUsername(username);
      if (user) {
        this.cache.set(cacheKey, user);
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async getAllUsers() {
    const cacheKey = 'all_users';
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const users = await getAllUsers();
      this.cache.set(cacheKey, users);
      return users;
    } catch (error) {
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const user = await createUser(userData);
      this.cache.delete('all_users');
      return user;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      // First get the current username to clear its cache
      const currentUser = await this.getUserById(id);
      if (currentUser) {
        const user = await updateUser(id, userData);
        this.cache.delete(`user_${id}`);
        this.cache.delete(`user_username_${currentUser.username}`);
        if (userData.username && userData.username !== currentUser.username) {
          this.cache.delete(`user_username_${userData.username}`);
        }
        this.cache.delete('all_users');
        return user;
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      throw error;
    }
  }

  async verifyUserPassword(plainPassword, hashedPassword) {
    try {
      return await verifyPassword(plainPassword, hashedPassword);
    } catch (error) {
      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = UserService;