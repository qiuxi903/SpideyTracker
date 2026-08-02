const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'spidey_tracker',
  waitForConnections: true,
  connectionLimit: 10,
};

let pool = null;

async function initDb() {
  // 1) 不带 database 连接，创建数据库
  const conn = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    multipleStatements: true,
  });
  await conn.query(
    'CREATE DATABASE IF NOT EXISTS \`' + DB_CONFIG.database + '\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  await conn.end();

  // 2) 建连接池 + 建表
  pool = mysql.createPool(DB_CONFIG);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      username VARCHAR(50) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar VARCHAR(500) DEFAULT NULL,
      email_verified TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(10) NOT NULL,
      expires_at DATETIME NOT NULL,
      used TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sightings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      pin_type VARCHAR(20) DEFAULT 'rumored',
      title VARCHAR(200) NOT NULL,
      description TEXT,
      lat DOUBLE NOT NULL,
      lng DOUBLE NOT NULL,
      address VARCHAR(500) DEFAULT NULL,
      images JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_latlng (lat, lng),
      CONSTRAINT fk_sighting_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      sighting_id INT DEFAULT NULL,
      pin_id VARCHAR(255) DEFAULT NULL,
      title VARCHAR(255) NOT NULL,
      lat DOUBLE NOT NULL,
      lng DOUBLE NOT NULL,
      thumb VARCHAR(500) DEFAULT NULL,
      pin_type VARCHAR(20) DEFAULT 'confirmed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_fav_sighting FOREIGN KEY (sighting_id) REFERENCES sightings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[DB] 数据库与数据表就绪:', DB_CONFIG.database);
}

function getPool() {
  if (!pool) throw new Error('数据库未初始化');
  return pool;
}

module.exports = { initDb, getPool, DB_CONFIG };
