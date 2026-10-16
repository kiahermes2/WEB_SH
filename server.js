import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = path.resolve(__dirname, 'dist');
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Default Admin Account (kiavash / kia@9065)
const DEFAULT_ADMIN = {
  id: 'admin_kiavash',
  name: 'kiavash',
  email: 'kiavashshtzd@gmail.com',
  telegramId: 'Kiavash9065',
  phone: '09155776751',
  passwordHash: '7c363953a9b165a05dd69f25189afd60737e57be125a9a036bc11d5916f3bde3',
  role: 'admin',
  approvalStatus: 'approved',
  completedHomeworkIds: [],
  homeworkProgress: {},
  examTopicProgress: {},
  workReports: [],
  createdAt: '2026-10-15T00:00:00.000Z'
};

// MIME Types Map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

// Database Initialization & Operations
function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      users: [DEFAULT_ADMIN],
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
      parsed.users = [DEFAULT_ADMIN];
    }
    return parsed;
  } catch (err) {
    console.error('[DB] Error reading db.json:', err);
    return { users: [DEFAULT_ADMIN], updatedAt: new Date().toISOString() };
  }
}

function writeDb(data) {
  ensureDb();
  try {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[DB] Error writing db.json:', err);
    return false;
  }
}

// HTTP Helper Functions
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Protect against oversized payload (max 10MB)
      if (body.length > 10 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Static File Server with SPA Fallback
function serveStaticFile(req, res, pathname) {
  // Prevent directory traversal
  const safeSuffix = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(DIST_DIR, safeSuffix);

  // If dist doesn't exist yet, provide helpful message
  if (!fs.existsSync(DIST_DIR)) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<h1>503 - Application assets not found</h1><p>Please make sure the "dist" directory exists alongside server.js.</p>');
    return;
  }

  // Check if target is directory
  let stat = null;
  try {
    if (fs.existsSync(filePath)) {
      stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        if (fs.existsSync(filePath)) {
          stat = fs.statSync(filePath);
        } else {
          stat = null;
        }
      }
    }
  } catch {
    stat = null;
  }

  // If file exists, serve it
  if (stat && stat.isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);

    // Cache control: hashed assets cached 1 year; html files no-cache
    if (pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    return;
  }

  // If path has a file extension and was not found, return 404
  if (path.extname(pathname)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('404 Not Found');
    return;
  }

  // SPA Fallback: serve index.html for all client-side routes
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(indexPath).pipe(res);
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('404 Not Found - index.html missing');
  }
}

// Request Handler
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Health check
  if (pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'Class 1051 Study Planner Server',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  }

  // API Route: GET /api/users
  if (pathname === '/api/users' && req.method === 'GET') {
    const db = readDb();
    return sendJson(res, 200, { success: true, users: db.users });
  }

  // API Route: POST /api/users/register
  if (pathname === '/api/users/register' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      if (!body.name || !body.email || !body.phone || !body.telegramId || !body.passwordHash) {
        return sendJson(res, 400, { success: false, error: 'تمامی فیلدها الزامی هستند.' });
      }

      const db = readDb();
      const cleanEmail = body.email.trim().toLowerCase();
      const cleanPhone = body.phone.trim();
      const cleanTelegram = body.telegramId.trim().toLowerCase();

      const exists = db.users.some(
        (u) =>
          u.email?.trim().toLowerCase() === cleanEmail ||
          u.phone?.trim() === cleanPhone ||
          u.telegramId?.trim().toLowerCase() === cleanTelegram
      );

      if (exists) {
        return sendJson(res, 400, {
          success: false,
          error: 'کاربری با این ایمیل، شماره یا آیدی تلگرام قبلاً ثبت شده است.'
        });
      }

      const newUser = {
        id: body.id || `user_${Date.now()}`,
        name: body.name.trim(),
        email: cleanEmail,
        telegramId: body.telegramId.trim().startsWith('@') ? body.telegramId.trim() : `@${body.telegramId.trim()}`,
        phone: cleanPhone,
        passwordHash: body.passwordHash,
        role: 'student',
        approvalStatus: 'pending',
        completedHomeworkIds: [],
        homeworkProgress: {},
        examTopicProgress: {},
        workReports: [],
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      writeDb(db);

      console.log(`[AUTH] New student registered (pending admin approval): ${newUser.name} (${newUser.email})`);
      return sendJson(res, 200, { success: true, user: newUser, users: db.users });
    } catch (err) {
      console.error('[AUTH] Registration error:', err);
      return sendJson(res, 500, { success: false, error: 'خطای سرور در ثبت‌نام کاربر.' });
    }
  }

  // API Route: POST /api/users/approve
  if (pathname === '/api/users/approve' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { userId } = body;
      if (!userId) {
        return sendJson(res, 400, { success: false, error: 'شناسه کاربر ارسال نشده است.' });
      }

      const db = readDb();
      const user = db.users.find((u) => u.id === userId);
      if (!user) {
        return sendJson(res, 404, { success: false, error: 'کاربر مورد نظر یافت نشد.' });
      }

      user.approvalStatus = 'approved';
      writeDb(db);

      console.log(`[ADMIN] User approved: ${user.name} (${user.email})`);
      return sendJson(res, 200, { success: true, user, users: db.users });
    } catch (err) {
      console.error('[ADMIN] Approval error:', err);
      return sendJson(res, 500, { success: false, error: 'خطای سرور در تایید کاربر.' });
    }
  }

  // API Route: POST /api/users/reject
  if (pathname === '/api/users/reject' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { userId } = body;
      if (!userId) {
        return sendJson(res, 400, { success: false, error: 'شناسه کاربر ارسال نشده است.' });
      }

      const db = readDb();
      const idx = db.users.findIndex((u) => u.id === userId);
      if (idx >= 0) {
        const removed = db.users.splice(idx, 1)[0];
        writeDb(db);
        console.log(`[ADMIN] User registration rejected & deleted: ${removed.name}`);
      }

      return sendJson(res, 200, { success: true, users: db.users });
    } catch (err) {
      console.error('[ADMIN] Rejection error:', err);
      return sendJson(res, 500, { success: false, error: 'خطای سرور در رد کاربر.' });
    }
  }

  // API Route: GET /api/sync
  if (pathname === '/api/sync' && req.method === 'GET') {
    const db = readDb();
    return sendJson(res, 200, { success: true, db });
  }

  // API Route: POST /api/sync
  if (pathname === '/api/sync' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const db = readDb();
      if (Array.isArray(body.users) && body.users.length > 0) {
        const userMap = new Map();
        db.users.forEach((u) => userMap.set(u.id, u));
        body.users.forEach((u) => {
          if (userMap.has(u.id)) {
            userMap.set(u.id, { ...userMap.get(u.id), ...u });
          } else {
            userMap.set(u.id, u);
          }
        });
        db.users = Array.from(userMap.values());
      }
      writeDb(db);
      return sendJson(res, 200, { success: true, users: db.users });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: 'همگام‌سازی ناموفق بود.' });
    }
  }

  // Static Assets and SPA Frontend
  serveStaticFile(req, res, pathname);
});

// Start Server
ensureDb();

server.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log(`🚀 سامانه آموزشی کلاس ۱۰۵۱ با موفقیت روی سرور اجرا شد!`);
  console.log(`🌐 آدرس دسترسی محلی:   http://localhost:${PORT}`);
  console.log(`📡 آدرس دسترسی شبکه:   http://${HOST === '0.0.0.0' ? 'YOUR_SERVER_IP' : HOST}:${PORT}`);
  console.log(`📁 مسیر فایل‌های وب:   ${DIST_DIR}`);
  console.log(`💾 مسیر پایگاه‌داده:    ${DB_FILE}`);
  console.log('====================================================');
});

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\n[SERVER] دریافت سیگنال ${signal}. در حال خاموش کردن ایمن سرور...`);
  server.close(() => {
    console.log('[SERVER] سرور با موفقیت خاموش شد.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
