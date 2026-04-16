import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { requireEnv } from './utils.js'

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env'

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      clientId: user.client_id || null,
    },
    JWT_SECRET,
    { expiresIn: '24h' },
  )
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function getBearerToken(req) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return null
  return header.slice(7)
}

export function authRequired(req, res, next) {
  const token = getBearerToken(req)
  if (!token) {
    return res.status(401).json({ message: 'Token manquant' })
  }

  try {
    req.auth = verifyToken(token)
    return next()
  } catch {
    return res.status(401).json({ message: 'Token invalide' })
  }
}

export function adminRequired(req, res, next) {
  if (req.auth?.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé' })
  }
  return next()
}

export function ensureConfigured(name) {
  try {
    return requireEnv(name)
  } catch {
    return null
  }
}
