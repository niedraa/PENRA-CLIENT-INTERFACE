import crypto from 'node:crypto'
import { nowIso, id } from './utils.js'

const buckets = new Map()

function getClientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim()
}

export function rateLimit({ windowMs, max, keyPrefix = 'global' }) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${getClientIp(req)}`
    const now = Date.now()
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs }

    if (now > bucket.resetAt) {
      bucket.count = 0
      bucket.resetAt = now + windowMs
    }

    bucket.count += 1
    buckets.set(key, bucket)

    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(max - bucket.count, 0)))
    res.setHeader('X-RateLimit-Reset', String(Math.floor(bucket.resetAt / 1000)))

    if (bucket.count > max) {
      return res.status(429).json({ message: 'Trop de requêtes, réessayez plus tard' })
    }

    return next()
  }
}

export function computeHmacSignature(secret, bodyText) {
  return crypto.createHmac('sha256', secret).update(bodyText).digest('hex')
}

export function verifyWebhookSignature({ secret, signature, bodyText }) {
  if (!secret || !signature) return false
  const expected = computeHmacSignature(secret, bodyText)
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export function webhookSignatureRequired(getSecret) {
  return (req, res, next) => {
    const secret = getSecret()
    const signature = req.headers['x-penra-signature']
    const rawBody = req.rawBody || JSON.stringify(req.body || {})

    if (!secret) {
      return res.status(500).json({ message: 'Secret webhook non configuré' })
    }

    if (!verifyWebhookSignature({ secret, signature: String(signature || ''), bodyText: rawBody })) {
      return res.status(401).json({ message: 'Signature webhook invalide' })
    }

    return next()
  }
}

export function createAuditLogger(db) {
  return function logAudit({ type, message, clientId = null }) {
    db.prepare('INSERT INTO activity_logs (id, type, message, client_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id('act'), type, message, clientId, nowIso())
  }
}
