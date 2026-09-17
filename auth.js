// src/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function register({ name, email, password }) {
  if (!name || !email || !password) {
    const e = new Error('name, email and password are all required.');
    e.status = 400;
    throw e;
  }
  if (password.length < 6) {
    const e = new Error('Password must be at least 6 characters.');
    e.status = 400;
    throw e;
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    const e = new Error('An account with this email already exists.');
    e.status = 409;
    throw e;
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, hash);
  return issueToken({ id: info.lastInsertRowid, name, email });
}

function login({ email, password }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    const e = new Error('Invalid email or password.');
    e.status = 401;
    throw e;
  }
  return issueToken({ id: user.id, name: user.name, email: user.email });
}

function issueToken(payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
  return { token, user: payload };
}

/** Express middleware: requires a valid `Authorization: Bearer <token>` header. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing Authorization header.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { register, login, requireAuth };
