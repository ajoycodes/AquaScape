import { Router } from 'express'
import crypto from 'crypto'
import { query, execute } from '../db.js'

const router = Router()

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'aquascape-dev-secret'
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours

// ── Password hashing (scrypt, no external deps) ──────────────────────────
export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(plain, stored) {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const candidate = crypto.scryptSync(plain, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'))
}

// ── Signed token (HMAC) ───────────────────────────────────────────────────
export function signToken(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url')
  const sig  = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyToken(token) {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url')
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

// ── Middleware ────────────────────────────────────────────────────────────
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null
  const payload = verifyToken(token)
  if (!payload) return res.status(401).json({ error: 'Please sign in to continue' })
  req.auth = payload
  next()
}

// ── POST /auth/register — new customer account ────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, address, city } = req.body
    if (!first_name || !last_name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' })
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email address' })

    const existing = await query(
      `SELECT customer_id FROM customers WHERE LOWER(email) = LOWER(:email)`, { email }
    )
    if (existing.length > 0)
      return res.status(409).json({ error: 'An account with this email already exists' })

    const password_hash = hashPassword(password)
    await execute(
      `INSERT INTO customers (customer_id, first_name, last_name, email, phone, address, city, password_hash)
       VALUES (seq_customer.NEXTVAL, :first_name, :last_name, :email, :phone, :address, :city, :password_hash)`,
      { first_name, last_name, email, phone: phone || null, address: address || null, city: city || null, password_hash }
    )

    const rows = await query(
      `SELECT customer_id, first_name, last_name, email FROM customers WHERE LOWER(email) = LOWER(:email)`, { email }
    )
    const c = rows[0]
    const customer = { id: c.CUSTOMER_ID, name: `${c.FIRST_NAME} ${c.LAST_NAME}`, email: c.EMAIL }
    const token = signToken({ sub: customer.id, role: 'customer' })
    res.status(201).json({ token, customer })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /auth/login — customer sign-in ────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' })

    const rows = await query(
      `SELECT customer_id, first_name, last_name, email, password_hash
       FROM customers WHERE LOWER(email) = LOWER(:email) AND is_active = 1`, { email }
    )
    if (rows.length === 0 || !verifyPassword(password, rows[0].PASSWORD_HASH))
      return res.status(401).json({ error: 'Incorrect email or password' })

    const c = rows[0]
    const customer = { id: c.CUSTOMER_ID, name: `${c.FIRST_NAME} ${c.LAST_NAME}`, email: c.EMAIL }
    const token = signToken({ sub: customer.id, role: 'customer' })
    res.json({ token, customer })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /auth/admin/login — staff sign-in against USERS table ────────────
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required' })

    const rows = await query(
      `SELECT u.user_id, u.username, u.email, u.password_hash, r.role_name
       FROM users u JOIN roles r ON u.role_id = r.role_id
       WHERE LOWER(u.username) = LOWER(:username) AND u.is_active = 1`, { username }
    )
    if (rows.length === 0 || !verifyPassword(password, rows[0].PASSWORD_HASH))
      return res.status(401).json({ error: 'Incorrect username or password' })

    const u = rows[0]
    await execute(`UPDATE users SET last_login = SYSDATE WHERE user_id = :id`, { id: u.USER_ID })
    const user = { id: u.USER_ID, name: u.USERNAME, email: u.EMAIL, role: u.ROLE_NAME.toLowerCase() }
    const token = signToken({ sub: user.id, role: 'admin' })
    res.json({ token, user })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /auth/me — validate current token ──────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    if (req.auth.role === 'customer') {
      const rows = await query(
        `SELECT customer_id, first_name, last_name, email FROM customers WHERE customer_id = :id`,
        { id: req.auth.sub }
      )
      if (rows.length === 0) return res.status(404).json({ error: 'Account not found' })
      const c = rows[0]
      return res.json({ role: 'customer', customer: { id: c.CUSTOMER_ID, name: `${c.FIRST_NAME} ${c.LAST_NAME}`, email: c.EMAIL } })
    }
    const rows = await query(`SELECT user_id, username, email FROM users WHERE user_id = :id`, { id: req.auth.sub })
    if (rows.length === 0) return res.status(404).json({ error: 'Account not found' })
    const u = rows[0]
    res.json({ role: 'admin', user: { id: u.USER_ID, name: u.USERNAME, email: u.EMAIL } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
