const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Database setup
const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

// Initialize users table
const initializeUsersTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      fullname TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, async (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
        reject(err);
      } else {
        console.log('Users table ready');
        
        // Check if admin user exists, if not create default admin (Jesus)
        try {
          const adminExists = await getUserByRole('admin');
          if (!adminExists) {
            // Create default admin user
            const defaultAdmin = {
              username: 'jesus',
              password: 'admin123', // This will be hashed before storing
              fullname: 'Jesus (Owner)',
              role: 'admin'
            };
            await createUser(defaultAdmin);
            console.log('Default admin user created');
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    });
  });
};

// Create a new user
const createUser = (userData) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const sql = `INSERT INTO users (username, password, fullname, role) 
                 VALUES (?, ?, ?, ?)`;
      const params = [userData.username, hashedPassword, userData.fullname, userData.role];
      
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            username: userData.username,
            fullname: userData.fullname,
            role: userData.role
          });
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Get user by username
const getUserByUsername = (username) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Get user by rol
const getUserByRole = (role) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE role =?', [role], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Get user by ID
const getUserById = (id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, username, fullname, role, created_at FROM users WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Verify user password
const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// Get all users (excluding passwords)
const getAllUsers = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, username, fullname, role, created_at FROM users', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

module.exports = {
  initializeUsersTable,
  createUser,
  getUserByUsername,
  getUserById,
  verifyPassword,
  getAllUsers
};