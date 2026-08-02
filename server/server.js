const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { initDb, getPool } = require('./db');

const PORT = Number(process.env.PORT || 8899);
const SITE_DIR = path.join(__dirname, '..', 'spideytracker.net');
const UPLOAD_DIR = path.join(SITE_DIR, 'uploads');
// JWT 签名密钥：优先读 .env；未配置时运行时随机生成（重启后旧会话失效，但绝不泄露默认密钥）
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
const COOKIE_NAME = 'spidey_token';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ---------- XFeed：社区目击流（原版面板展示用户最近发布的目击） ----------
app.get('/x-feed.php', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT s.id, s.title, s.description, s.images, s.created_at, u.username FROM sightings s JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC LIMIT 50');
    const posts = rows.map(function (r) {
      const imgs = parseImages(r.images);
      return {
        id: 'usr-' + r.id,
        text: r.title + (r.description ? String.fromCharCode(10) + r.description : ''),
        created_at: r.created_at,
        author: { name: r.username, username: r.username, avatar_url: './favicon.png' },
        media: imgs.map(function (src) { return { type: 'photo', url: src, alt_text: r.title }; }),
      };
    });
    res.json({ posts: posts });
  } catch (e) {
    console.error('[x-feed]', e);
    res.json({ posts: [] });
  }
});
// ---------- 静态资源 ----------
app.use(express.static(SITE_DIR, { extensions: ['html'] }));
// 上传目录
app.use('/uploads', express.static(UPLOAD_DIR));

// ---------- 图片上传配置 ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg').toLowerCase() || '.jpg';
    cb(null, Date.now() + '_' + Math.round(Math.random() * 1e9) + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('只允许上传图片文件'));
  },
});

// ---------- 认证中间件 ----------
function auth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME] || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.uid;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期' });
  }
}
// cookie 解析（轻量，避免引入 cookie-parser）
app.use((req, res, next) => {
  const raw = req.headers.cookie || '';
  req.cookies = {};
  raw.split(';').forEach((pair) => {
    const i = pair.indexOf('=');
    if (i > 0) req.cookies[pair.slice(0, i).trim()] = decodeURIComponent(pair.slice(i + 1).trim());
  });
  next();
});

// ---------- 工具 ----------
function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function sendVerifyCode(email, code) {
  // 本地测试：打印到控制台 + 写入文件（stdout 管道缓冲可能不实时落盘）
  const line = `[邮箱验证码] ${email} 的注册验证码: ${code}`;
  console.log('\n========================================');
  console.log(line);
  console.log('========================================\n');
  try {
    const logPath = path.join(__dirname, 'verify-codes.log');
    fs.appendFileSync(logPath, new Date().toISOString() + ' ' + line + '\n', 'utf8');
  } catch (e) { /* 写文件失败不影响流程 */ }

  // SMTP 真实邮件（可选）：.env 设置 SMTP_ENABLED=true 并填写 SMTP_* 后启用
  if (String(process.env.SMTP_ENABLED) === 'true') {
    try {
      const nodemailer = require('nodemailer');
      const smtpPort = Number(process.env.SMTP_PORT || 465);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || '',
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' },
      });
      transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || '寻找小蜘蛛',
        to: email,
        subject: '寻找小蜘蛛 - 注册验证码',
        text: `你的注册验证码是：${code}，5 分钟内有效。`,
        html: `<p>你的注册验证码是：<b style="font-size:20px">${code}</b></p><p>5 分钟内有效，请勿泄露。</p>`,
      }).then(() => console.log('  [SMTP] 验证码邮件已发送至 ' + email))
        .catch((e) => console.warn('  [SMTP] 邮件发送失败:', e.message));
    } catch (e) {
      console.warn('  [SMTP] 发送配置错误（请检查 .env 的 SMTP_*）:', e.message);
    }
  }
}function signToken(uid) {
  return jwt.sign({ uid }, JWT_SECRET, { expiresIn: '30d' });
}
// images 字段兼容：MySQL JSON 列返回已解析数组 / TEXT 列返回字符串
function parseImages(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch (e) {
    return [];
  }
}

// ---------- API: Auth ----------
// 1) 注册：发验证码
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: '邮箱格式不正确' });
    if (!username || String(username).trim().length < 2) return res.status(400).json({ error: '用户名至少 2 个字符' });
    if (!password || String(password).length < 6) return res.status(400).json({ error: '密码至少 6 位' });
    const pool = getPool();
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (rows.length) return res.status(409).json({ error: '该邮箱已注册，请直接登录' });
    const code = genCode();
    await pool.query(
      'INSERT INTO email_codes (email, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [email.trim(), code]
    );
    sendVerifyCode(email.trim(), code);
    res.json({ ok: true, message: '验证码已发送（本地测试请在服务器控制台查看）' });
  } catch (e) {
    console.error('[register]', e);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 2) 验证码 + 创建账号
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { email, code, username, password } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: '参数不完整' });
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM email_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
      [email.trim(), String(code).trim()]
    );
    if (!rows.length) return res.status(400).json({ error: '验证码错误或已过期' });
    await pool.query('UPDATE email_codes SET used = 1 WHERE id = ?', [rows[0].id]);
    const hash = await bcrypt.hash(String(password), 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, username, password_hash, email_verified) VALUES (?, ?, ?, 1)',
      [email.trim(), String(username).trim(), hash]
    );
    const token = signToken(result.insertId);
    res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });
    res.json({ ok: true, user: { id: result.insertId, email: email.trim(), username: String(username).trim() } });
  } catch (e) {
    console.error('[verify]', e);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 3) 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: '请输入邮箱和密码' });
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.trim()]);
    if (!rows.length) return res.status(401).json({ error: '邮箱或密码错误' });
    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: '邮箱或密码错误' });
    const token = signToken(user.id);
    res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });
    res.json({ ok: true, user: { id: user.id, email: user.email, username: user.username, avatar: user.avatar } });
  } catch (e) {
    console.error('[login]', e);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 4) 当前用户
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, email, username, avatar, email_verified, created_at FROM users WHERE id = ?', [req.userId]);
    if (!rows.length) return res.status(404).json({ error: '用户不存在' });
    res.json({ user: rows[0] });
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 5) 退出
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// ---------- API: Sightings ----------
// 列表（含作者信息）
app.get('/api/sightings', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT s.id, s.user_id, s.pin_type, s.title, s.description, s.lat, s.lng, s.address, s.images, s.created_at, u.username, u.avatar FROM sightings s JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC'
    );
    const items = rows.map((r) => ({
      id: 'usr-' + r.id,
      pinType: r.pin_type || 'rumored',
      title: r.title,
      description: r.description || '',
      lat: Number(r.lat),
      lng: Number(r.lng),
      address: r.address || '',
      images: parseImages(r.images),
      cardThumbImg: parseImages(r.images)[0] || '',
      createdAt: r.created_at,
      author: { id: r.user_id, username: r.username, avatar: r.avatar },
    }));
    res.json({ sightings: items });
  } catch (e) {
    console.error('[sightings list]', e);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 发布（图片 + 字段）
app.post('/api/sightings', auth, upload.array('images', 6), async (req, res) => {
  try {
    const { title, description, lat, lng, address, pin_type } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: '请填写标题' });
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN) || Math.abs(latN) > 90 || Math.abs(lngN) > 180) {
      return res.status(400).json({ error: '位置坐标无效，请在地图上点选位置' });
    }
    const files = (req.files || []).map((f) => '/uploads/' + f.filename);
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO sightings (user_id, pin_type, title, description, lat, lng, address, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId, pin_type === 'confirmed' ? 'confirmed' : 'rumored', String(title).trim(), String(description || '').trim(), latN, lngN, String(address || '').trim() || null, JSON.stringify(files)]
    );
    res.json({ ok: true, id: result.insertId, message: '目击已发布！' });
  } catch (e) {
    console.error('[sighting create]', e);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除自己的目击
app.delete('/api/sightings/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM sightings WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!rows.length) return res.status(404).json({ error: '目击不存在或无权删除' });
    // 删除关联图片
    const imgs = parseImages(rows[0].images);
    if (imgs.length) {
      imgs.forEach((p) => {
        const fp = path.join(SITE_DIR, p.replace(/^\//, ''));
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      });
    }
    await pool.query('DELETE FROM sightings WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ---------- API: Favorites ----------
app.post('/api/favorites', auth, async (req, res) => {
  try {
    const { sighting_id, pin_id, title, lat, lng, thumb, pin_type } = req.body || {};
    if (!title || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return res.status(400).json({ error: '收藏信息不完整' });
    }
    const pool = getPool();
    // 防重复
    const [dup] = await pool.query(
      'SELECT id FROM favorites WHERE user_id = ? AND ((sighting_id = ? AND ? IS NOT NULL) OR (pin_id = ? AND pin_id IS NOT NULL))',
      [req.userId, sighting_id || null, sighting_id || null, pin_id || null, pin_id || null]
    );
    if (dup.length) return res.json({ ok: true, duplicated: true, message: '已收藏过' });
    await pool.query(
      'INSERT INTO favorites (user_id, sighting_id, pin_id, title, lat, lng, thumb, pin_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId, sighting_id || null, pin_id || null, String(title).slice(0, 255), Number(lat), Number(lng), thumb || null, pin_type || 'confirmed']
    );
    res.json({ ok: true, message: '已收藏' });
  } catch (e) {
    console.error('[fav add]', e);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/favorites', auth, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, sighting_id, pin_id, title, lat, lng, thumb, pin_type, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ favorites: rows });
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.delete('/api/favorites/:id', auth, async (req, res) => {
  try {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM favorites WHERE id = ? AND user_id = ?', [Number(req.params.id), req.userId]);
    res.json({ ok: true, affected: result.affectedRows });
  } catch (e) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ---------- 启动 ----------
(async () => {
  try {
    await initDb();
  } catch (e) {
    console.error('[DB] 初始化失败:', e.message);
    console.error('请检查 .env 中的 DB_PASS 是否填写了正确的 MySQL root 密码');
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log('');
    console.log('🕷️  寻找小蜘蛛服务器已启动');
    console.log('  地址: http://127.0.0.1:' + PORT + ' / http://spideytracker.net:' + PORT);
    console.log('  静态站点: ' + SITE_DIR);
    console.log('  上传目录: ' + UPLOAD_DIR);
    console.log('');
  });
})();
