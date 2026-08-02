// 导出正式库 spidey_tracker 为 Docker 初始化 SQL（临时脚本）
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const fmtDate = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
};
const esc = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (v instanceof Date) return "'" + fmtDate(v) + "'";
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
};

(async () => {
  const db = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: 'lei20100725', database: 'spidey_tracker' });
  const out = [];
  out.push('-- 寻找小蜘蛛 数据库初始化脚本（由正式库导出 ' + new Date().toISOString() + '）');
  out.push('SET NAMES utf8mb4;');
  out.push('USE spidey_tracker;');
  out.push('');

  // 建表（与 server/db.js 一致）
  out.push('CREATE TABLE IF NOT EXISTS users (');
  out.push('  id INT AUTO_INCREMENT PRIMARY KEY,');
  out.push('  email VARCHAR(255) NOT NULL UNIQUE,');
  out.push('  username VARCHAR(50) NOT NULL,');
  out.push('  password_hash VARCHAR(255) NOT NULL,');
  out.push('  avatar VARCHAR(500) DEFAULT NULL,');
  out.push('  email_verified TINYINT(1) DEFAULT 0,');
  out.push('  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  out.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  out.push('');
  out.push('CREATE TABLE IF NOT EXISTS email_codes (');
  out.push('  id INT AUTO_INCREMENT PRIMARY KEY,');
  out.push('  email VARCHAR(255) NOT NULL,');
  out.push('  code VARCHAR(10) NOT NULL,');
  out.push('  expires_at DATETIME NOT NULL,');
  out.push('  used TINYINT(1) DEFAULT 0,');
  out.push('  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,');
  out.push('  INDEX idx_email (email)');
  out.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  out.push('');
  out.push('CREATE TABLE IF NOT EXISTS sightings (');
  out.push('  id INT AUTO_INCREMENT PRIMARY KEY,');
  out.push('  user_id INT NOT NULL,');
  out.push('  pin_type VARCHAR(20) DEFAULT \'rumored\',');
  out.push('  title VARCHAR(200) NOT NULL,');
  out.push('  description TEXT,');
  out.push('  lat DOUBLE NOT NULL,');
  out.push('  lng DOUBLE NOT NULL,');
  out.push('  address VARCHAR(500) DEFAULT NULL,');
  out.push('  images JSON DEFAULT NULL,');
  out.push('  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,');
  out.push('  INDEX idx_user (user_id),');
  out.push('  INDEX idx_latlng (lat, lng),');
  out.push('  CONSTRAINT fk_sighting_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
  out.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  out.push('');
  out.push('CREATE TABLE IF NOT EXISTS favorites (');
  out.push('  id INT AUTO_INCREMENT PRIMARY KEY,');
  out.push('  user_id INT NOT NULL,');
  out.push('  sighting_id INT DEFAULT NULL,');
  out.push('  pin_id VARCHAR(255) DEFAULT NULL,');
  out.push('  title VARCHAR(255) NOT NULL,');
  out.push('  lat DOUBLE NOT NULL,');
  out.push('  lng DOUBLE NOT NULL,');
  out.push('  thumb VARCHAR(500) DEFAULT NULL,');
  out.push('  pin_type VARCHAR(20) DEFAULT \'confirmed\',');
  out.push('  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,');
  out.push('  INDEX idx_user (user_id),');
  out.push('  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,');
  out.push('  CONSTRAINT fk_fav_sighting FOREIGN KEY (sighting_id) REFERENCES sightings(id) ON DELETE CASCADE');
  out.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  out.push('');

  // 数据：users
  const [users] = await db.query('SELECT * FROM users ORDER BY id');
  out.push('-- 用户');
  for (const u of users) {
    out.push('INSERT INTO users (id, email, username, password_hash, avatar, email_verified, created_at) VALUES (' +
      u.id + ', ' + esc(u.email) + ', ' + esc(u.username) + ', ' + esc(u.password_hash) + ', ' + esc(u.avatar) +
      ', ' + esc(u.email_verified) + ', ' + esc(u.created_at) + ');');
  }
  out.push('');

  // 数据：email_codes
  const [codes] = await db.query('SELECT * FROM email_codes ORDER BY id');
  out.push('-- 邮箱验证码');
  for (const c of codes) {
    out.push('INSERT INTO email_codes (id, email, code, expires_at, used, created_at) VALUES (' +
      c.id + ', ' + esc(c.email) + ', ' + esc(c.code) + ', ' + esc(c.expires_at) + ', ' + esc(c.used) + ', ' + esc(c.created_at) + ');');
  }
  out.push('');

  // 数据：sightings
  const [sigs] = await db.query('SELECT * FROM sightings ORDER BY id');
  out.push('-- 目击');
  for (const s of sigs) {
    const imgs = s.images === null ? 'NULL' : esc(JSON.stringify(s.images));
    out.push('INSERT INTO sightings (id, user_id, pin_type, title, description, lat, lng, address, images, created_at) VALUES (' +
      s.id + ', ' + s.user_id + ', ' + esc(s.pin_type) + ', ' + esc(s.title) + ', ' + esc(s.description) + ', ' +
      s.lat + ', ' + s.lng + ', ' + esc(s.address) + ', ' + imgs + ', ' + esc(s.created_at) + ');');
  }
  out.push('');

  // 数据：favorites
  const [favs] = await db.query('SELECT * FROM favorites ORDER BY id');
  out.push('-- 收藏');
  for (const f of favs) {
    out.push('INSERT INTO favorites (id, user_id, sighting_id, pin_id, title, lat, lng, thumb, pin_type, created_at) VALUES (' +
      f.id + ', ' + f.user_id + ', ' + (f.sighting_id === null ? 'NULL' : f.sighting_id) + ', ' + esc(f.pin_id) + ', ' +
      esc(f.title) + ', ' + f.lat + ', ' + f.lng + ', ' + esc(f.thumb) + ', ' + esc(f.pin_type) + ', ' + esc(f.created_at) + ');');
  }
  out.push('');

  await db.end();
  const dir = path.join(__dirname, '..', 'deploy', 'init');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '01-init.sql'), out.join('\n'), 'utf8');
  console.log('✅ 已生成 deploy/init/01-init.sql（users=' + users.length + ', codes=' + codes.length + ', sightings=' + sigs.length + ', favorites=' + favs.length + '）');
})().catch((e) => { console.error('导出失败:', e.message); process.exit(1); });
