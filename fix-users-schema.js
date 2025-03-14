const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database setup
const dbPath = path.resolve(__dirname, './database.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking users table schema...');

// Check current schema
db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
  if (err) {
    console.error('Error checking schema:', err.message);
    process.exit(1);
  }
  
  console.log('Current schema:', row.sql);
  const hasCliente = row.sql.includes("'cliente'");
  console.log('Has cliente role in constraint:', hasCliente);
  
  if (!hasCliente) {
    console.log('Fixing constraint to include cliente role...');
    
    // SQLite doesn't support ALTER TABLE to modify constraints
    // We need to recreate the table with the correct constraint
    db.serialize(() => {
      // Disable foreign keys temporarily and start transaction
      db.run("PRAGMA foreign_keys=off");
      db.run("BEGIN TRANSACTION");
      
      // Create new table with correct constraint
      db.run(`CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        fullname TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'employee', 'cliente')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating new table:', err.message);
          db.run("ROLLBACK");
          process.exit(1);
        }
        
        // Copy data from old table to new table
        db.run("INSERT INTO users_new SELECT * FROM users", (err) => {
          if (err) {
            console.error('Error copying data:', err.message);
            db.run("ROLLBACK");
            process.exit(1);
          }
          
          // Drop old table
          db.run("DROP TABLE users", (err) => {
            if (err) {
              console.error('Error dropping old table:', err.message);
              db.run("ROLLBACK");
              process.exit(1);
            }
            
            // Rename new table to original name
            db.run("ALTER TABLE users_new RENAME TO users", (err) => {
              if (err) {
                console.error('Error renaming table:', err.message);
                db.run("ROLLBACK");
                process.exit(1);
              }
              
              // Commit transaction and re-enable foreign keys
              db.run("COMMIT");
              db.run("PRAGMA foreign_keys=on");
              console.log('Schema updated successfully!');
              db.close();
            });
          });
        });
      });
    });
  } else {
    console.log('Schema is already correct. No changes needed.');
    db.close();
  }
});