import dotenv from 'dotenv'
import crypto from 'node:crypto'
import express from 'express'
import cors from 'cors'
import { db } from './lib/db.js'
import { authRequired, signToken, hashPassword, comparePassword, adminRequired } from './lib/auth.js'
import {
  getInstagramOAuthUrl,
  exchangeInstagramCode,
  fetchInstagramPosts,
  sendInstagramDM,
  forwardToMakeWebhook,
  listElevenLabsVoices,
  provisionTwilioPhoneNumber,
} from './lib/integrations.js'
import { id, nowIso, parseJson } from './lib/utils.js'
import { rateLimit, webhookSignatureRequired, createAuditLogger } from './lib/security.js'
import {
  registerSchema,
  loginSchema,
  settingsSchema,
  createClientSchema,
  updateClientSchema,
  createAgentSchema,
  updateAgentSchema,
  connectInstagramSchema,
  createAutomationSchema,
  updateAutomationSchema,
  createInvoiceSchema,
  createCommissionSchema,
  changePasswordSchema,
} from './lib/validators.js'

dotenv.config({ override: process.env.NODE_ENV !== 'test' })

const app = express()
const PORT = Number(process.env.API_PORT || 3000)


app.use(cors({ origin: '*', credentials: false }));
app.use(express.urlencoded({ extended: false }))
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString('utf8')
  },
}))

const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  keyPrefix: 'auth',
})

const logAudit = createAuditLogger(db)

function mapClient(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    phone: row.phone || undefined,
    avatar: row.avatar || undefined,
    services: parseJson(row.services, []),
    status: row.status,
    subscriptionPlan: row.subscription_plan,
    monthlyPrice: row.monthly_price,
    nextRenewal: row.next_renewal,
    createdAt: row.created_at,
    notes: row.notes || undefined,
  }
}

function mapAgent(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name || undefined,
    name: row.name,
    phoneNumber: row.phone_number || '',
    voice: row.voice || '',
    sector: row.sector || '',
    language: row.language || 'fr-FR',
    status: row.status,
    systemPrompt: row.system_prompt || undefined,
    callsThisMonth: row.calls_this_month,
    callsTotal: row.calls_total,
    lastActivity: row.last_activity || null,
  }
}

function mapIgAutomation(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    postUrl: row.post_url,
    triggerKeyword: row.trigger_keyword,
    dmMessage: row.dm_message,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    commentsSeen: row.comments_seen,
    dmsSent: row.dms_sent,
    webhookUrl: row.webhook_url,
    makeScenarioId: row.make_scenario_id,
  }
}

function authUser(req) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth.sub)
}

function safeUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    company: row.company || undefined,
    clientId: row.client_id || undefined,
    createdAt: row.created_at,
  }
}

function isAdmin(req) {
  return req.auth?.role === 'admin'
}

function canAccessClient(req, clientId) {
  if (isAdmin(req)) return true
  return Boolean(clientId && req.auth?.clientId && req.auth.clientId === clientId)
}

function denyClientAccess(res) {
  return res.status(403).json({ message: 'Accès interdit pour ce client' })
}

function buildPublicUrl(req, routePath) {
  const base = process.env.PUBLIC_API_BASE_URL || `${req.protocol}://${req.get('host')}`
  return `${base.replace(/\/$/, '')}${routePath}`
}

function toXmlSafeText(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const elevenVoicesCache = new Map()

function parseVoiceSelection(value) {
  const raw = String(value || '').trim()
  if (!raw) return { name: '', voiceId: '' }

  if (raw.includes('::')) {
    const [name, voiceId] = raw.split('::')
    return { name: String(name || '').trim(), voiceId: String(voiceId || '').trim() }
  }

  if (/^[A-Za-z0-9]{20,}$/.test(raw)) {
    return { name: '', voiceId: raw }
  }

  return { name: raw, voiceId: '' }
}

function getElevenLabsApiKeyForAgent(agent) {
  const clientOwner = db.prepare('SELECT id FROM users WHERE client_id = ? ORDER BY created_at ASC LIMIT 1').get(agent.client_id)
  if (clientOwner?.id) {
    const settings = db.prepare('SELECT eleven_labs_key FROM app_settings WHERE owner_user_id = ?').get(clientOwner.id)
    if (settings?.eleven_labs_key) return settings.eleven_labs_key
  }

  return process.env.ELEVENLABS_API_KEY || ''
}

async function resolveElevenLabsVoiceId({ apiKey, configuredVoice, normalizeFn }) {
  const parsed = parseVoiceSelection(configuredVoice)
  if (parsed.voiceId) return parsed.voiceId

  const candidate = parsed.name || String(configuredVoice || '')
  if (!candidate || !apiKey) return ''

  const cache = elevenVoicesCache.get(apiKey)
  const now = Date.now()
  let voices = cache?.voices
  if (!voices || now - Number(cache?.ts || 0) > 10 * 60 * 1000) {
    voices = await listElevenLabsVoices(apiKey)
    elevenVoicesCache.set(apiKey, { ts: now, voices })
  }

  const simplified = normalizeFn(candidate).split(' - ')[0].trim()
  const match = voices.find((v) => {
    const name = normalizeFn(v.name)
    return name === simplified || simplified.includes(name) || name.includes(simplified)
  })
  return match?.voice_id || ''
}

function ttsSignaturePayload({ callSid, voiceId, text, tone, language }) {
  return [callSid, voiceId, text, tone, language].join('|')
}

function computeInternalTtsSignature({ callSid, voiceId, text, tone, language }) {
  const secret = process.env.TWILIO_AUTH_TOKEN || process.env.JWT_SECRET || 'penra-tts'
  return crypto.createHmac('sha256', secret).update(ttsSignaturePayload({ callSid, voiceId, text, tone, language }), 'utf8').digest('hex')
}

function verifyInternalTtsSignature({ callSid, voiceId, text, tone, language, signature }) {
  const expected = computeInternalTtsSignature({ callSid, voiceId, text, tone, language })
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature || '')))
  } catch {
    return false
  }
}

function buildSignedTtsUrl({ req, callSid, voiceId, text, tone, language }) {
  const base = buildPublicUrl(req, '/api/twilio/tts')
  const sig = computeInternalTtsSignature({ callSid, voiceId, text, tone, language })
  const params = new URLSearchParams({ callSid, voiceId, text, tone, language, sig })
  return `${base}?${params.toString()}`
}

function elevenVoiceSettingsFromTone(tone) {
  const t = String(tone || '').toLowerCase()
  if (t === 'warm') {
    return { stability: 0.35, similarity_boost: 0.85, style: 0.45, use_speaker_boost: true, speed: 0.98 }
  }
  if (t === 'direct') {
    return { stability: 0.62, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 1.03 }
  }
  return { stability: 0.5, similarity_boost: 0.84, style: 0.25, use_speaker_boost: true, speed: 1 }
}

function normalizeText(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function resolveTwilioVoice(agent) {
  const rawConfigured = String(agent?.voice || '').trim()
  const configured = rawConfigured.includes('::') ? rawConfigured.split('::')[0].trim() : rawConfigured
  const lower = configured.toLowerCase()
  const language = agent?.language || 'fr-FR'

  if (!configured) {
    return { voice: 'Polly.Celine', language }
  }

  if (configured.startsWith('Polly.') || configured.startsWith('Google.') || ['alice', 'man', 'woman'].includes(lower)) {
    return { voice: configured, language }
  }

  if (['rachel', 'bella', 'aria', 'jessica', 'sarah', 'celine', 'claire', 'fr'].includes(lower)) {
    return { voice: 'Polly.Celine', language: 'fr-FR' }
  }

  if (['antoni', 'adam', 'sam', 'josh', 'mathieu', 'male', 'homme', 'man'].includes(lower)) {
    return { voice: 'Polly.Mathieu', language: 'fr-FR' }
  }

  if (['lea', 'femme', 'woman'].includes(lower)) {
    return { voice: 'Polly.Lea', language: 'fr-FR' }
  }

  return { voice: 'Polly.Celine', language }
}

function twimlSay({ text, voice, language }) {
  const escaped = toXmlSafeText(text)
  const attrs = [
    voice ? ` voice="${toXmlSafeText(voice)}"` : '',
    language ? ` language="${toXmlSafeText(language)}"` : '',
  ].join('')
  return `<Say${attrs}>${escaped}</Say>`
}

function parseSystemPromptProfile(agent) {
  const prompt = String(agent?.system_prompt || '')
  const nameMatch = prompt.match(/boulangerie\s*\[([^\]]+)\]/i)
  return {
    bakeryName: nameMatch?.[1]?.trim() || agent?.client_name || 'PENRA',
  }
}

function loadCallSession(callSid, agent) {
  const row = db.prepare('SELECT * FROM call_ai_sessions WHERE call_sid = ?').get(callSid)
  if (row) {
    const state = parseJson(row.state_json, {})
    return {
      stage: state.stage || 'idle',
      order: state.order || { items: [], quantity: null, pickupTime: null, customerName: null },
      turns: Number(state.turns || 0),
    }
  }

  return {
    stage: 'idle',
    order: { items: [], quantity: null, pickupTime: null, customerName: null },
    turns: 0,
    agentId: agent.id,
    clientId: agent.client_id,
  }
}

function saveCallSession(callSid, agent, session) {
  const now = nowIso()
  const stateJson = JSON.stringify({
    stage: session.stage,
    order: session.order,
    turns: Number(session.turns || 0),
  })
  const exists = db.prepare('SELECT call_sid FROM call_ai_sessions WHERE call_sid = ?').get(callSid)
  if (exists) {
    db.prepare('UPDATE call_ai_sessions SET state_json = ?, updated_at = ? WHERE call_sid = ?')
      .run(stateJson, now, callSid)
    return
  }

  db.prepare('INSERT INTO call_ai_sessions (call_sid, agent_id, client_id, state_json, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(callSid, agent.id, agent.client_id, stateJson, now, now)
}

function appendCallTranscription(callSid, speaker, text) {
  if (!callSid || !text) return
  const existing = db.prepare('SELECT transcription FROM calls WHERE id = ?').get(callSid)
  if (!existing) return
  const line = `[${new Date().toISOString()}] ${speaker}: ${String(text).trim()}`
  const merged = [existing.transcription || '', line].filter(Boolean).join('\n')
  db.prepare('UPDATE calls SET transcription = ? WHERE id = ?').run(merged, callSid)
}

function detectPickupTime(text) {
  const raw = String(text || '')
  const hhmm = raw.match(/\b([01]?\d|2[0-3])\s*[:h]\s*([0-5]\d)\b/)
  if (hhmm) {
    return `${hhmm[1].padStart(2, '0')}:${hhmm[2]}`
  }
  const hourOnly = raw.match(/\b([01]?\d|2[0-3])\s*h\b/i)
  if (hourOnly) {
    return `${hourOnly[1].padStart(2, '0')}:00`
  }
  return null
}

function detectQuantity(text) {
  const match = String(text || '').match(/\b(\d{1,2})\b/)
  if (!match) return null
  return Number(match[1])
}

function detectName(text) {
  const raw = String(text || '').trim()
  const explicit = raw.match(/(?:au nom de|je m'?appelle|nom)\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40})/i)
  if (explicit?.[1]) return explicit[1].trim()
  if (raw.split(' ').length <= 3 && /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(raw)) return raw
  return null
}

function detectOrderProduct(text) {
  const raw = String(text || '')
  const stripped = raw
    .replace(/je veux|je souhaite|j\'aimerais|commander|une commande|s\'il vous plait|svp/gi, ' ')
    .replace(/au nom de\s+[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40}/gi, ' ')
    .replace(/\b([01]?\d|2[0-3])\s*[:h]\s*([0-5]\d)?\b/gi, ' ')
    .replace(/\b\d{1,2}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return stripped || null
}

function respondBakeryCall({ session, speechText, profile }) {
  const text = normalizeText(speechText)
  const original = String(speechText || '').trim()

  if (!original) {
    return {
      say: 'Je vous entends mal. Pouvez-vous répéter s\'il vous plaît ?',
      hangup: false,
    }
  }

  if (/(au revoir|merci au revoir|bonne journee|bonne soiree|c\'est tout|rien d\'autre|bye)\b/.test(text)) {
    return {
      say: 'Merci pour votre appel, à très bientôt.',
      hangup: true,
    }
  }

  if (session.stage === 'collect_product') {
    session.order.items = [original]
    session.stage = 'collect_quantity'
    return { say: 'Bien sûr. Quelle quantité souhaitez-vous ?', hangup: false }
  }

  if (session.stage === 'collect_quantity') {
    const quantity = detectQuantity(text)
    if (!quantity) {
      return { say: 'Je vous écoute. Quelle quantité souhaitez-vous ?', hangup: false }
    }
    session.order.quantity = quantity
    session.stage = 'collect_time'
    return { say: 'Avec plaisir. Pour quelle heure de retrait ?', hangup: false }
  }

  if (session.stage === 'collect_time') {
    const pickupTime = detectPickupTime(text)
    if (!pickupTime) {
      return { say: 'Pas de souci. Pouvez-vous préciser l\'heure de retrait ?', hangup: false }
    }
    session.order.pickupTime = pickupTime
    session.stage = 'collect_name'
    return { say: 'Très bien. Au nom de qui, s\'il vous plaît ?', hangup: false }
  }

  if (session.stage === 'collect_name') {
    const customerName = detectName(original)
    if (!customerName) {
      return { say: 'Je n\'ai pas bien saisi le nom. Pouvez-vous le répéter, s\'il vous plaît ?', hangup: false }
    }
    session.order.customerName = customerName
    session.stage = 'confirm_order'
    return {
      say: `Je récapitule : vous souhaitez ${session.order.quantity} ${session.order.items.join(', ')} pour ${session.order.pickupTime}, au nom de ${session.order.customerName}, c\'est bien ça ?`,
      hangup: false,
    }
  }

  if (session.stage === 'confirm_order') {
    if (/(oui|exact|c\'est ca|parfait)/.test(text)) {
      session.stage = 'idle'
      session.order = { items: [], quantity: null, pickupTime: null, customerName: null }
      return { say: 'Parfait, votre commande est bien enregistrée.', hangup: false }
    }
    if (/(non|pas ca|modifier|changer)/.test(text)) {
      session.stage = 'collect_product'
      session.order = { items: [], quantity: null, pickupTime: null, customerName: null }
      return { say: 'D\'accord, on recommence. Quel produit souhaitez-vous commander ?', hangup: false }
    }
    return { say: 'Je n\'ai pas compris. Est-ce que la commande vous convient ?', hangup: false }
  }

  if (/(commande|commander|reservation|reserver|preparer)/.test(text)) {
    const quantity = detectQuantity(text)
    const pickupTime = detectPickupTime(text)
    const customerName = detectName(original)
    const product = detectOrderProduct(original)

    if (quantity && pickupTime && customerName && product) {
      session.order = {
        items: [product],
        quantity,
        pickupTime,
        customerName,
      }
      session.stage = 'confirm_order'
      return {
        say: `Je récapitule : vous souhaitez ${quantity} ${product} pour ${pickupTime}, au nom de ${customerName}, c\'est bien ça ?`,
        hangup: false,
      }
    }

    session.stage = 'collect_product'
    return { say: 'Avec plaisir. Quel produit souhaitez-vous commander ?', hangup: false }
  }

  if (/(horaire|ouvert|ouverture|ferme|fermeture)/.test(text)) {
    return { say: 'Nous sommes ouverts de 6 heures 30 à 19 heures 30, du mardi au dimanche.', hangup: false }
  }

  if (/(adresse|ou etes vous|situe|venir)/.test(text)) {
    return { say: `Nous sommes à l\'adresse de ${profile.bakeryName}. Je peux aussi vous envoyer un point de repère si vous voulez.`, hangup: false }
  }

  if (/(prix|tarif|combien)/.test(text)) {
    return { say: 'Bien sûr. Les prix varient selon le produit. Dites-moi l\'article exact et je vous donne le tarif.', hangup: false }
  }

  if (/(sans gluten|gluten)/.test(text)) {
    return { say: 'Nous avons quelques options sans gluten selon le jour. Je peux vous proposer les disponibilités du matin.', hangup: false }
  }

  if (/(anniversaire|gateau|piece montee)/.test(text)) {
    return { say: 'Oui, nous faisons des gâteaux sur commande. Idéalement 48 heures à l\'avance.', hangup: false }
  }

  if (/(produit|pain|baguette|croissant|viennoiserie|patisserie)/.test(text)) {
    return { say: 'Aujourd\'hui nous avons pains tradition, viennoiseries et pâtisseries maison. Dites-moi ce qui vous ferait plaisir.', hangup: false }
  }

  return {
    say: 'Je préfère vérifier cela, puis-je vous rappeler ?',
    hangup: false,
  }
}

function computeTwilioSignature({ authToken, url, params }) {
  const sortedKeys = Object.keys(params || {}).sort()
  const data = sortedKeys.reduce((acc, key) => acc + key + String(params[key]), url)
  return crypto.createHmac('sha1', authToken).update(data, 'utf8').digest('base64')
}

function verifyTwilioSignature(req) {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) return true

  const provided = String(req.headers['x-twilio-signature'] || '')
  if (!provided) return false

  const url = buildPublicUrl(req, req.originalUrl)
  const expected = computeTwilioSignature({ authToken: token, url, params: req.body || {} })
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  } catch {
    return false
  }
}

function validateBody(schema, body, res) {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return {
      ok: false,
      response: res.status(400).json({
        message: 'Payload invalide',
        details: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      }),
    }
  }
  return { ok: true, data: parsed.data }
}

function payloadHash(req) {
  return crypto.createHash('sha256').update(req.rawBody || JSON.stringify(req.body || {})).digest('hex')
}

function webhookEventKey(req, fallbackPrefix) {
  return String(req.headers['x-event-id'] || req.headers['x-request-id'] || `${fallbackPrefix}:${payloadHash(req)}`)
}

function isWebhookDuplicate(source, eventKey) {
  const row = db.prepare('SELECT id FROM processed_webhooks WHERE source = ? AND event_key = ?').get(source, eventKey)
  return Boolean(row)
}

function markWebhookProcessed(source, eventKey, hash) {
  db.prepare('INSERT INTO processed_webhooks (id, source, event_key, payload_hash, processed_at) VALUES (?, ?, ?, ?, ?)')
    .run(id('whk'), source, eventKey, hash, nowIso())
}

function enqueueOutboundJob({ type, targetUrl, payload, clientId = null, maxAttempts = 5 }) {
  const jobId = id('job')
  const now = nowIso()
  db.prepare(`
    INSERT INTO outbound_jobs (id, type, target_url, payload_json, status, attempts, max_attempts, next_attempt_at, last_error, client_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, NULL, ?, ?, ?)
  `).run(jobId, type, targetUrl, JSON.stringify(payload), maxAttempts, now, clientId, now, now)
  return jobId
}

function extractInstagramCommentEvent(body) {
  if (!body || typeof body !== 'object') {
    return { postId: null, comment: '', userId: null, username: null, type: 'unknown' }
  }

  // Handle simplified test payloads
  if (body.postId || body.comment) {
    return {
      postId: body.postId || body.mediaId || null,
      comment: body.comment || body.text || '',
      userId: body.userId || body.user_id || body.from?.id || null,
      username: body.username || body.user || body.from?.username || null,
      type: 'comment',
    }
  }

  const entry = body.entry?.[0]
  const change = entry?.changes?.[0]
  const changeValue = change?.value
  const field = change?.field

  // Comments
  if (field === 'comments') {
    return {
      postId: changeValue.media?.id || changeValue.media_id || null,
      comment: changeValue.text || '',
      userId: changeValue.from?.id || null,
      username: changeValue.from?.username || null,
      type: 'comment',
      id: changeValue.id,
    }
  }

  // Mentions
  if (field === 'mentions') {
    return {
      postId: changeValue.media_id || null,
      comment: changeValue.text || '',
      userId: changeValue.from?.id || null, // Might be empty in some mention events
      username: null,
      type: 'mention',
      id: changeValue.comment_id || changeValue.media_id,
    }
  }

  // Story Tags (can come via messaging or mentions depending on app settings)
  if (body.object === 'instagram' && entry?.messaging) {
    const msg = entry.messaging[0]
    if (msg.message?.is_echo) return { type: 'echo' }
    
    return {
      userId: msg.sender?.id,
      comment: msg.message?.text || '',
      type: 'dm',
      isStory: !!msg.message?.reply_to?.story,
    }
  }

  return { type: 'unknown' }
}

async function processOutboundJobs() {
  const now = nowIso()
  const jobs = db.prepare(`
    SELECT * FROM outbound_jobs
    WHERE status IN ('pending', 'retrying')
      AND next_attempt_at <= ?
    ORDER BY created_at ASC
    LIMIT 20
  `).all(now)

  for (const job of jobs) {
    try {
      db.prepare('UPDATE outbound_jobs SET status = ?, updated_at = ? WHERE id = ?').run('processing', nowIso(), job.id)
      const payload = parseJson(job.payload_json, {})
      let result = { ok: false, status: 0 }

      if (job.type === 'instagram_dm') {
        result = await sendInstagramDM({
          igBusinessAccountId: payload.igBusinessAccountId,
          accessToken: payload.accessToken,
          recipientIgId: payload.recipientIgId,
          message: payload.message,
        })
      } else if (job.type === 'make_webhook') {
        result = await forwardToMakeWebhook({
          url: job.target_url,
          payload: payload.data,
          automationId: payload.automationId,
        })
      }

      if (result.ok) {
        db.prepare('UPDATE outbound_jobs SET status = ?, attempts = attempts + 1, last_error = NULL, updated_at = ? WHERE id = ?')
          .run('done', nowIso(), job.id)
        if (job.type === 'instagram_dm' && payload.automationId) {
          db.prepare('UPDATE ig_automations SET dms_sent = dms_sent + 1, updated_at = ? WHERE id = ?')
            .run(nowIso(), payload.automationId)
          db.prepare('INSERT INTO automation_logs (id, automation_id, event_type, status, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id('alog'), payload.automationId, 'dm_retry_sent', 'ok', JSON.stringify(payload), nowIso())
        }
        logAudit({ type: 'outbound_job_done', message: `Job ${job.type} délivré`, clientId: job.client_id })
      } else {
        const nextAttempts = Number(job.attempts || 0) + 1
        if (nextAttempts >= Number(job.max_attempts || 5)) {
          db.prepare('UPDATE outbound_jobs SET status = ?, attempts = ?, last_error = ?, updated_at = ? WHERE id = ?')
            .run('failed', nextAttempts, `HTTP ${result.status}`, nowIso(), job.id)
          logAudit({ type: 'outbound_job_failed', message: `Job ${job.type} échoué définitivement`, clientId: job.client_id })
        } else {
          const retryAt = new Date(Date.now() + 1000 * 2 ** Math.min(nextAttempts, 6)).toISOString()
          db.prepare('UPDATE outbound_jobs SET status = ?, attempts = ?, next_attempt_at = ?, last_error = ?, updated_at = ? WHERE id = ?')
            .run('retrying', nextAttempts, retryAt, `HTTP ${result.status}`, nowIso(), job.id)
        }
      }
    } catch (error) {
      const nextAttempts = Number(job.attempts || 0) + 1
      const retryAt = new Date(Date.now() + 1000 * 2 ** Math.min(nextAttempts, 6)).toISOString()
      const status = nextAttempts >= Number(job.max_attempts || 5) ? 'failed' : 'retrying'
      db.prepare('UPDATE outbound_jobs SET status = ?, attempts = ?, next_attempt_at = ?, last_error = ?, updated_at = ? WHERE id = ?')
        .run(status, nextAttempts, retryAt, String(error?.message || error), nowIso(), job.id)
      if (status === 'failed') {
        logAudit({ type: 'outbound_job_failed', message: `Job ${job.type} échoué définitivement`, clientId: job.client_id })
      }
    }
  }
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true, ts: nowIso() })
})

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const validated = validateBody(registerSchema, req.body, res)
    if (!validated.ok) return validated.response
    const { email, password, name, company, role } = validated.data

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (exists) {
      return res.status(409).json({ message: 'Email déjà utilisé' })
    }

    let clientId = null
    if (role === 'client') {
      clientId = id('client')
      db.prepare(`INSERT INTO clients (id, name, email, company, services, status, subscription_plan, monthly_price, next_renewal, created_at)
                  VALUES (?, ?, ?, ?, ?, 'active', 'Premium', 0, ?, ?)`)
        .run(clientId, name, email, company || name, JSON.stringify(['instagram', 'vocal']), nowIso(), nowIso())
    }

    const userId = id('usr')
    const passwordHash = await hashPassword(password)
    db.prepare(`INSERT INTO users (id, email, password_hash, name, role, company, client_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(userId, email, passwordHash, name, role, company || null, clientId, nowIso())

    db.prepare(`INSERT INTO app_settings (id, owner_user_id, webhook_url, calendly_url, twilio_token, eleven_labs_key, default_system_prompt, updated_at)
                VALUES (?, ?, '', '', '', '', '', ?)`)
      .run(id('stg'), userId, nowIso())

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
    const token = signToken(user)
    logAudit({ type: 'user_registered', message: `Nouvel utilisateur ${email}`, clientId })
    return res.status(201).json({ user: safeUser(user), token, refreshToken: token })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const validated = validateBody(loginSchema, req.body, res)
    if (!validated.ok) return validated.response
    const { email, password } = validated.data
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user) return res.status(401).json({ message: 'Email ou mot de passe incorrect' })

    const ok = await comparePassword(password, user.password_hash)
    if (!ok) return res.status(401).json({ message: 'Email ou mot de passe incorrect' })

    const token = signToken(user)
    return res.json({ user: safeUser(user), token, refreshToken: token })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

app.post('/api/auth/logout', authRequired, (_, res) => {
  res.status(204).send()
})

app.post('/api/auth/refresh', authRequired, authLimiter, (req, res) => {
  const user = authUser(req)
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })
  const token = signToken(user)
  return res.json({ token })
})

app.get('/api/auth/me', authRequired, (req, res) => {
  const user = authUser(req)
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })
  return res.json(safeUser(user))
})

app.put('/api/auth/profile', authRequired, (req, res) => {
  const user = authUser(req)
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })
  const { name, company } = req.body || {}
  db.prepare('UPDATE users SET name = ?, company = ? WHERE id = ?').run(name || user.name, company || user.company, user.id)
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
  return res.json(safeUser(updated))
})

app.post('/api/auth/change-password', authRequired, async (req, res) => {
  const user = authUser(req)
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })

  const validated = validateBody(changePasswordSchema, req.body, res)
  if (!validated.ok) return validated.response
  const { oldPassword, newPassword } = validated.data
  const valid = await comparePassword(oldPassword, user.password_hash)
  if (!valid) return res.status(400).json({ message: 'Mot de passe actuel invalide' })

  const newHash = await hashPassword(newPassword)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id)
  return res.status(204).send()
})

app.get('/api/settings', authRequired, (req, res) => {
  const settings = db.prepare('SELECT * FROM app_settings WHERE owner_user_id = ?').get(req.auth.sub)
  if (!settings) return res.json({ webhookUrl: '', calendlyUrl: '', twilioToken: '', elevenLabsKey: '', defaultSystemPrompt: '' })
  return res.json({
    webhookUrl: settings.webhook_url || '',
    calendlyUrl: settings.calendly_url || '',
    twilioToken: settings.twilio_token || '',
    elevenLabsKey: settings.eleven_labs_key || '',
    defaultSystemPrompt: settings.default_system_prompt || '',
  })
})

app.put('/api/settings', authRequired, (req, res) => {
  const validated = validateBody(settingsSchema, req.body, res)
  if (!validated.ok) return validated.response
  const body = validated.data
  const settings = db.prepare('SELECT * FROM app_settings WHERE owner_user_id = ?').get(req.auth.sub)
  const merged = {
    webhook_url: body.webhookUrl ?? settings?.webhook_url ?? '',
    calendly_url: body.calendlyUrl ?? settings?.calendly_url ?? '',
    twilio_token: body.twilioToken ?? settings?.twilio_token ?? '',
    eleven_labs_key: body.elevenLabsKey ?? settings?.eleven_labs_key ?? '',
    default_system_prompt: body.defaultSystemPrompt ?? settings?.default_system_prompt ?? '',
  }

  if (settings) {
    db.prepare(`UPDATE app_settings SET webhook_url = ?, calendly_url = ?, twilio_token = ?, eleven_labs_key = ?, default_system_prompt = ?, updated_at = ? WHERE owner_user_id = ?`)
      .run(merged.webhook_url, merged.calendly_url, merged.twilio_token, merged.eleven_labs_key, merged.default_system_prompt, nowIso(), req.auth.sub)
  } else {
    db.prepare(`INSERT INTO app_settings (id, owner_user_id, webhook_url, calendly_url, twilio_token, eleven_labs_key, default_system_prompt, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id('stg'), req.auth.sub, merged.webhook_url, merged.calendly_url, merged.twilio_token, merged.eleven_labs_key, merged.default_system_prompt, nowIso())
  }

  return res.json({
    webhookUrl: merged.webhook_url,
    calendlyUrl: merged.calendly_url,
    twilioToken: merged.twilio_token,
    elevenLabsKey: merged.eleven_labs_key,
    defaultSystemPrompt: merged.default_system_prompt,
  })
})

app.get('/api/elevenlabs/voices', authRequired, async (req, res) => {
  try {
    const settings = db.prepare('SELECT eleven_labs_key FROM app_settings WHERE owner_user_id = ?').get(req.auth.sub)
    const elevenLabsKey = settings?.eleven_labs_key || process.env.ELEVENLABS_API_KEY
    const voices = await listElevenLabsVoices(elevenLabsKey)
    return res.json({ data: voices })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

app.get('/api/clients', authRequired, (req, res) => {
  if (!isAdmin(req)) {
    const ownClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.auth.clientId)
    if (!ownClient) return res.json({ data: [], total: 0, page: 1, limit: 50 })
    return res.json({ data: [mapClient(ownClient)], total: 1, page: 1, limit: 50 })
  }
  const search = req.query.search ? `%${String(req.query.search)}%` : null
  const rows = search
    ? db.prepare('SELECT * FROM clients WHERE company LIKE ? OR email LIKE ? ORDER BY created_at DESC').all(search, search)
    : db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all()
  return res.json({ data: rows.map(mapClient), total: rows.length, page: 1, limit: 50 })
})

app.get('/api/clients/stats', authRequired, (req, res) => {
  if (!isAdmin(req)) {
    const own = db.prepare('SELECT status, monthly_price FROM clients WHERE id = ?').all(req.auth.clientId)
    const total = own.length
    const active = own.filter((r) => r.status === 'active').length
    const inactive = own.filter((r) => r.status !== 'active').length
    const mrr = own.filter((r) => r.status === 'active').reduce((sum, r) => sum + Number(r.monthly_price || 0), 0)
    return res.json({ total, active, inactive, mrr })
  }
  const rows = db.prepare('SELECT status, monthly_price FROM clients').all()
  const total = rows.length
  const active = rows.filter((r) => r.status === 'active').length
  const inactive = rows.filter((r) => r.status !== 'active').length
  const mrr = rows.filter((r) => r.status === 'active').reduce((sum, r) => sum + Number(r.monthly_price || 0), 0)
  return res.json({ total, active, inactive, mrr })
})

app.get('/api/clients/:id', authRequired, (req, res) => {
  const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ message: 'Client introuvable' })
  if (!canAccessClient(req, row.id)) return denyClientAccess(res)
  return res.json(mapClient(row))
})

app.post('/api/clients', authRequired, adminRequired, (req, res) => {
  const validated = validateBody(createClientSchema, req.body, res)
  if (!validated.ok) return validated.response
  const data = validated.data
  const clientId = id('client')
  db.prepare(`INSERT INTO clients (id, name, email, company, phone, services, status, subscription_plan, monthly_price, next_renewal, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(clientId, data.name, data.email, data.company, data.phone || null, JSON.stringify(data.services || []), data.status || 'active', data.subscriptionPlan || 'Premium', Number(data.monthlyPrice || 0), data.nextRenewal || nowIso(), data.notes || null, nowIso())

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId)
  logAudit({ type: 'client_created', message: `Client créé: ${client.company}`, clientId })
  res.status(201).json(mapClient(client))
})

app.put('/api/clients/:id', authRequired, (req, res) => {
  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Client introuvable' })
  if (!canAccessClient(req, existing.id)) return denyClientAccess(res)
  const validated = validateBody(updateClientSchema, req.body, res)
  if (!validated.ok) return validated.response
  const body = validated.data
  db.prepare(`UPDATE clients SET
      name = ?, email = ?, company = ?, phone = ?, services = ?, status = ?, subscription_plan = ?,
      monthly_price = ?, next_renewal = ?, notes = ? WHERE id = ?`)
    .run(
      body.name ?? existing.name,
      body.email ?? existing.email,
      body.company ?? existing.company,
      body.phone ?? existing.phone,
      JSON.stringify(body.services ?? parseJson(existing.services, [])),
      body.status ?? existing.status,
      body.subscriptionPlan ?? existing.subscription_plan,
      body.monthlyPrice ?? existing.monthly_price,
      body.nextRenewal ?? existing.next_renewal,
      body.notes ?? existing.notes,
      existing.id,
    )
  const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(existing.id)
  logAudit({ type: 'client_updated', message: `Client modifié: ${updated.company}`, clientId: updated.id })
  return res.json(mapClient(updated))
})

app.delete('/api/clients/:id', authRequired, adminRequired, (req, res) => {
  const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id)
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id)
  db.prepare('DELETE FROM agents WHERE client_id = ?').run(req.params.id)
  db.prepare('DELETE FROM ig_automations WHERE client_id = ?').run(req.params.id)
  if (row) {
    logAudit({ type: 'client_deleted', message: `Client supprimé: ${row.company}`, clientId: row.id })
  }
  return res.status(204).send()
})

app.get('/api/agents', authRequired, (req, res) => {
  const clientId = isAdmin(req) ? req.query.clientId : req.auth.clientId
  const rows = clientId
    ? db.prepare('SELECT * FROM agents WHERE client_id = ? ORDER BY created_at DESC').all(clientId)
    : db.prepare('SELECT * FROM agents ORDER BY created_at DESC').all()
  return res.json({ data: rows.map(mapAgent), total: rows.length })
})

app.post('/api/agents', authRequired, (req, res) => {
  const validated = validateBody(createAgentSchema, req.body, res)
  if (!validated.ok) return validated.response
  const body = validated.data
  if (!canAccessClient(req, body.clientId)) return denyClientAccess(res)
  const agentId = id('agt')
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(body.clientId)
  if (!client) return res.status(404).json({ message: 'Client introuvable' })

  db.prepare(`INSERT INTO agents (id, client_id, client_name, name, phone_number, voice, sector, language, status, system_prompt, tone, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'configuring', ?, ?, ?, ?)`)
    .run(agentId, body.clientId, client.company, body.name, body.phoneNumber || '', body.voice || '', body.sector || '', body.language || 'fr-FR', body.systemPrompt || '', body.tone || 'professional', nowIso(), nowIso())

  const created = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId)
  logAudit({ type: 'agent_created', message: `Agent créé: ${created.name}`, clientId: created.client_id })
  return res.status(201).json(mapAgent(created))
})

app.put('/api/agents/:id', authRequired, (req, res) => {
  const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Agent introuvable' })
  if (!canAccessClient(req, existing.client_id)) return denyClientAccess(res)
  const validated = validateBody(updateAgentSchema, req.body, res)
  if (!validated.ok) return validated.response
  const body = validated.data

  db.prepare(`UPDATE agents SET
    name = ?, phone_number = ?, voice = ?, sector = ?, language = ?, status = ?, system_prompt = ?, client_name = ?, tone = ?, updated_at = ?, last_activity = ?
    WHERE id = ?`)
    .run(
      body.name ?? existing.name,
      body.phoneNumber ?? existing.phone_number,
      body.voice ?? existing.voice,
      body.sector ?? existing.sector,
      body.language ?? existing.language,
      body.status ?? existing.status,
      body.systemPrompt ?? existing.system_prompt,
      body.clientName ?? existing.client_name,
      body.tone ?? existing.tone,
      nowIso(),
      nowIso(),
      existing.id,
    )

  const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(existing.id)
  logAudit({ type: 'agent_updated', message: `Agent modifié: ${updated.name}`, clientId: updated.client_id })
  return res.json(mapAgent(updated))
})

app.post('/api/agents/:id/provision-phone', authRequired, async (req, res) => {
  try {
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id)
    if (!agent) return res.status(404).json({ message: 'Agent introuvable' })
    if (!canAccessClient(req, agent.client_id)) return denyClientAccess(res)

    const singleNumberMode = String(process.env.TWILIO_SINGLE_NUMBER_MODE || 'true').toLowerCase() === 'true'
    if (singleNumberMode) {
      const existingNumber = db.prepare(`
        SELECT id, name, phone_number, twilio_number_sid
        FROM agents
        WHERE phone_number IS NOT NULL
          AND trim(phone_number) <> ''
          AND twilio_number_sid IS NOT NULL
          AND trim(twilio_number_sid) <> ''
          AND id <> ?
        ORDER BY updated_at DESC
        LIMIT 1
      `).get(agent.id)

      if (existingNumber?.phone_number) {
        const reassignedAt = nowIso()
        db.prepare('UPDATE agents SET phone_number = ?, twilio_number_sid = ?, status = ?, updated_at = ? WHERE id = ?')
          .run('', null, 'configuring', reassignedAt, existingNumber.id)
        db.prepare('UPDATE agents SET phone_number = ?, twilio_number_sid = ?, status = ?, updated_at = ? WHERE id = ?')
          .run(existingNumber.phone_number, existingNumber.twilio_number_sid || null, 'active', reassignedAt, agent.id)

        const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent.id)
        logAudit({
          type: 'phone_reassigned_single_number',
          message: `Numéro unique réattribué de ${existingNumber.name} vers ${updated.name}`,
          clientId: updated.client_id,
        })

        return res.json({
          ...mapAgent(updated),
          warning: `Mode numéro unique actif: numéro réattribué depuis ${existingNumber.name}.`,
          code: 'TWILIO_SINGLE_NUMBER_REASSIGNED',
        })
      }
    }

    const settings = db.prepare('SELECT * FROM app_settings WHERE owner_user_id = ?').get(req.auth.sub)
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
    const twilioAuthToken = settings?.twilio_token || process.env.TWILIO_AUTH_TOKEN
    const voiceWebhookUrl = process.env.TWILIO_VOICE_WEBHOOK_URL || buildPublicUrl(req, '/api/twilio/voice')
    const statusCallbackUrl = process.env.TWILIO_STATUS_CALLBACK_URL || buildPublicUrl(req, '/api/twilio/status')

    const twilio = await provisionTwilioPhoneNumber({
      accountSid: twilioAccountSid,
      authToken: twilioAuthToken,
      voiceWebhookUrl,
      statusCallbackUrl,
    })

    if (singleNumberMode) {
      // Keep exactly one active phone assignment when single-number mode is enabled.
      db.prepare(`
        UPDATE agents
        SET phone_number = '', twilio_number_sid = NULL, status = 'configuring', updated_at = ?
        WHERE id <> ?
          AND phone_number IS NOT NULL
          AND trim(phone_number) <> ''
      `).run(nowIso(), agent.id)
    }

    db.prepare('UPDATE agents SET phone_number = ?, twilio_number_sid = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(twilio.phoneNumber, twilio.sid, 'active', nowIso(), agent.id)

    const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent.id)
    logAudit({ type: 'phone_provisioned', message: `Numéro provisionné pour agent ${updated.name}`, clientId: updated.client_id })
    if (twilio.reused) {
      return res.json({
        ...mapAgent(updated),
        warning: 'Compte Twilio Trial: numéro existant réutilisé automatiquement.',
        code: 'TWILIO_TRIAL_REUSED_EXISTING_NUMBER',
      })
    }
    return res.json(mapAgent(updated))
  } catch (error) {
    const rawMessage = String(error?.message || error)
    if (rawMessage.includes('"code":21404')) {
      const alreadyAssigned = db.prepare(`
        SELECT id, name, phone_number, twilio_number_sid
        FROM agents
        WHERE phone_number IS NOT NULL
          AND trim(phone_number) <> ''
          AND twilio_number_sid IS NOT NULL
          AND trim(twilio_number_sid) <> ''
          AND id <> ?
        ORDER BY updated_at DESC
        LIMIT 1
      `).get(req.params.id)

      if (alreadyAssigned?.phone_number) {
        const transferAt = nowIso()
        db.prepare('UPDATE agents SET phone_number = ?, twilio_number_sid = ?, status = ?, updated_at = ? WHERE id = ?')
          .run('', null, 'configuring', transferAt, alreadyAssigned.id)
        db.prepare('UPDATE agents SET phone_number = ?, twilio_number_sid = ?, status = ?, updated_at = ? WHERE id = ?')
          .run(alreadyAssigned.phone_number, alreadyAssigned.twilio_number_sid || null, 'active', transferAt, req.params.id)

        const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id)
        logAudit({
          type: 'phone_reassigned_trial',
          message: `Numéro Trial réattribué de ${alreadyAssigned.name} vers ${updated.name}`,
          clientId: updated.client_id,
        })

        return res.json({
          ...mapAgent(updated),
          warning: `Compte Twilio Trial: numéro unique réattribué depuis ${alreadyAssigned.name}.`,
          code: 'TWILIO_TRIAL_NUMBER_REASSIGNED',
        })
      }

      return res.status(409).json({
        code: 'TWILIO_TRIAL_LIMIT',
        message: 'Compte Twilio Trial: un seul numéro peut être attribué. Achetez/upgradez Twilio pour créer des numéros supplémentaires.',
      })
    }
    return res.status(400).json({ message: error.message })
  }
})

app.post('/api/twilio/voice', async (req, res) => {
  if (!verifyTwilioSignature(req)) {
    return res.status(401).json({ message: 'Signature Twilio invalide' })
  }

  const toNumber = String(req.body?.To || '')
  const callSid = String(req.body?.CallSid || '')
  const fromNumber = String(req.body?.From || '')
  const speechResult = String(req.body?.SpeechResult || '').trim()
  const agent = db.prepare('SELECT * FROM agents WHERE phone_number = ?').get(toNumber)

  if (!agent) {
    res.setHeader('Content-Type', 'text/xml; charset=utf-8')
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Say language="fr-FR">Ce numéro n\'est pas configuré.</Say><Hangup/></Response>')
  }

  const profile = parseSystemPromptProfile(agent)
  const voice = resolveTwilioVoice(agent)

  if (callSid) {
    const existingCall = db.prepare('SELECT id FROM calls WHERE id = ?').get(callSid)
    if (!existingCall) {
      db.prepare('INSERT INTO calls (id, agent_id, client_id, from_number, to_number, duration, summary, transcription, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(callSid, agent.id, agent.client_id, fromNumber || null, toNumber || null, 0, '', '', 'in-progress', nowIso())
    }
  }

  db.prepare('UPDATE agents SET last_activity = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), agent.id)

  const session = loadCallSession(callSid, agent)
  session.turns = Number(session.turns || 0) + 1

  let responseText = `Bonjour, boulangerie ${profile.bakeryName}, je vous écoute.`
  let shouldHangup = false

  if (speechResult) {
    appendCallTranscription(callSid, 'CLIENT', speechResult)
    const response = respondBakeryCall({ session, speechText: speechResult, profile })
    responseText = response.say
    shouldHangup = Boolean(response.hangup)
    appendCallTranscription(callSid, 'AGENT', responseText)
  } else {
    appendCallTranscription(callSid, 'AGENT', responseText)
  }

  saveCallSession(callSid, agent, session)

  res.setHeader('Content-Type', 'text/xml; charset=utf-8')

  let spokenBlock = twimlSay({ text: responseText, voice: voice.voice, language: voice.language })
  try {
    const apiKey = getElevenLabsApiKeyForAgent(agent)
    if (apiKey) {
      const voiceId = await resolveElevenLabsVoiceId({
        apiKey,
        configuredVoice: agent.voice,
        normalizeFn: normalizeText,
      })
      if (voiceId) {
        const ttsUrl = buildSignedTtsUrl({
          req,
          callSid,
          voiceId,
          text: responseText,
          tone: agent.tone || 'professional',
          language: agent.language || 'fr-FR',
        })
        spokenBlock = `<Play>${toXmlSafeText(ttsUrl)}</Play>`
      }
    }
  } catch {
    // Keep Twilio Say fallback if ElevenLabs resolution fails.
  }

  const gatherPrompt = shouldHangup
    ? ''
    : '<Gather input="speech" language="fr-FR" speechTimeout="auto" timeout="4" action="/api/twilio/voice" method="POST"/>'
  const ending = shouldHangup
    ? '<Hangup/>'
    : ''
  const fallback = shouldHangup
    ? ''
    : twimlSay({ text: 'Je n\'ai rien entendu. Merci pour votre appel, à très bientôt.', voice: voice.voice, language: voice.language }) + '<Hangup/>'

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response>${spokenBlock}${gatherPrompt}${fallback}${ending}</Response>`)
})

app.get('/api/twilio/tts', async (req, res) => {
  const callSid = String(req.query.callSid || '')
  const voiceId = String(req.query.voiceId || '')
  const text = String(req.query.text || '')
  const tone = String(req.query.tone || 'professional')
  const language = String(req.query.language || 'fr-FR')
  const sig = String(req.query.sig || '')

  if (!callSid || !voiceId || !text || !sig) {
    return res.status(400).json({ message: 'Paramètres TTS manquants' })
  }

  const validSignature = verifyInternalTtsSignature({ callSid, voiceId, text, tone, language, signature: sig })
  if (!validSignature) {
    return res.status(401).json({ message: 'Signature TTS invalide' })
  }

  const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(callSid)
  if (!call?.agent_id) {
    return res.status(404).json({ message: 'Appel introuvable' })
  }
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(call.agent_id)
  if (!agent) {
    return res.status(404).json({ message: 'Agent introuvable' })
  }

  const apiKey = getElevenLabsApiKeyForAgent(agent)
  if (!apiKey) {
    return res.status(400).json({ message: 'Clé ElevenLabs manquante' })
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: language.startsWith('fr') ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5',
        voice_settings: elevenVoiceSettingsFromTone(tone),
      }),
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      return res.status(502).json({ message: `ElevenLabs TTS échoué (${response.status})`, details })
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(buffer)
  } catch (error) {
    return res.status(500).json({ message: String(error?.message || error) })
  }
})

app.post('/api/twilio/status', (req, res) => {
  if (!verifyTwilioSignature(req)) {
    return res.status(401).json({ message: 'Signature Twilio invalide' })
  }

  const callSid = String(req.body?.CallSid || '')
  const callStatus = String(req.body?.CallStatus || 'completed')
  const duration = Number(req.body?.CallDuration || 0)
  const fromNumber = String(req.body?.From || '') || null
  const toNumber = String(req.body?.To || '') || null
  const endedAt = nowIso()

  if (!callSid) {
    return res.status(400).json({ message: 'CallSid manquant' })
  }

  const existing = db.prepare('SELECT * FROM calls WHERE id = ?').get(callSid)
  const terminalStatuses = ['completed', 'busy', 'failed', 'no-answer', 'canceled']

  if (existing) {
    db.prepare('UPDATE calls SET status = ?, duration = ?, from_number = ?, to_number = ? WHERE id = ?')
      .run(callStatus, duration, fromNumber, toNumber, callSid)
  } else {
    const agent = toNumber
      ? db.prepare('SELECT * FROM agents WHERE phone_number = ?').get(toNumber)
      : null

    if (agent) {
      db.prepare('INSERT INTO calls (id, agent_id, client_id, from_number, to_number, duration, summary, transcription, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(callSid, agent.id, agent.client_id, fromNumber, toNumber, duration, '', '', callStatus, endedAt)
    }
  }

  const linkedCall = db.prepare('SELECT * FROM calls WHERE id = ?').get(callSid)
  if (linkedCall?.agent_id && terminalStatuses.includes(callStatus) && (!existing || !terminalStatuses.includes(existing.status))) {
    db.prepare('UPDATE agents SET calls_this_month = calls_this_month + 1, calls_total = calls_total + 1, last_activity = ?, updated_at = ? WHERE id = ?')
      .run(endedAt, endedAt, linkedCall.agent_id)
  }

  if (terminalStatuses.includes(callStatus)) {
    db.prepare('DELETE FROM call_ai_sessions WHERE call_sid = ?').run(callSid)
  }

  return res.status(204).send()
})

app.get('/api/integrations/status', authRequired, adminRequired, async (req, res) => {
  const checks = {
    meta: {
      configured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_REDIRECT_URI),
      message: 'Meta OAuth prêt',
    },
    elevenlabs: {
      configured: Boolean(process.env.ELEVENLABS_API_KEY),
      message: process.env.ELEVENLABS_API_KEY ? 'ElevenLabs prêt' : 'ELEVENLABS_API_KEY manquant',
    },
    twilio: {
      configured: Boolean(
        (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
          || (process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET),
      ),
      voiceWebhookUrl: process.env.TWILIO_VOICE_WEBHOOK_URL || buildPublicUrl(req, '/api/twilio/voice'),
      statusWebhookUrl: process.env.TWILIO_STATUS_CALLBACK_URL || buildPublicUrl(req, '/api/twilio/status'),
      message: 'Twilio prêt',
    },
  }

  if (checks.twilio.configured) {
    try {
      const probe = await provisionTwilioPhoneNumber({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        voiceWebhookUrl: checks.twilio.voiceWebhookUrl,
        statusCallbackUrl: checks.twilio.statusWebhookUrl,
        dryRun: true,
      })
      checks.twilio.connected = Boolean(probe.ok)
      checks.twilio.accountSid = probe.accountSid || null
      checks.twilio.message = probe.ok ? 'Connexion Twilio OK' : 'Connexion Twilio non confirmée'
    } catch (error) {
      checks.twilio.connected = false
      checks.twilio.message = String(error.message || error)
    }
  } else {
    checks.twilio.connected = false
    checks.twilio.message = 'Configuration Twilio incomplète'
  }

  return res.json(checks)
})

app.delete('/api/agents/:id', authRequired, (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id)
  if (!agent) return res.status(404).json({ message: 'Agent introuvable' })
  if (!canAccessClient(req, agent.client_id)) return denyClientAccess(res)
  db.prepare('DELETE FROM agents WHERE id = ?').run(agent.id)
  db.prepare('DELETE FROM calls WHERE agent_id = ?').run(agent.id)
  logAudit({ type: 'agent_deleted', message: `Agent supprimé: ${agent.name}`, clientId: agent.client_id })
  return res.status(204).send()
})

app.get('/api/agents/:id/calls', authRequired, (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id)
  if (!agent) return res.status(404).json({ message: 'Agent introuvable' })
  if (!canAccessClient(req, agent.client_id)) return denyClientAccess(res)
  const rows = db.prepare('SELECT * FROM calls WHERE agent_id = ? ORDER BY created_at DESC').all(req.params.id)
  const data = rows.map((r) => ({
    id: r.id,
    agentId: r.agent_id,
    date: r.created_at,
    duration: `${r.duration}s`,
    summary: r.summary || '',
    transcription: r.transcription || '',
    status: r.status,
  }))
  return res.json({ data, total: data.length })
})

app.get('/api/agents/:id/stats', authRequired, (req, res) => {
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ message: 'Agent introuvable' })
  if (!canAccessClient(req, row.client_id)) return denyClientAccess(res)
  return res.json({
    callsThisMonth: row.calls_this_month,
    totalCalls: row.calls_total,
    averageDuration: '0m',
    resolutionRate: 0,
  })
})

app.get('/api/agents/:id/chart-data', authRequired, (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id)
  if (!agent) return res.status(404).json({ message: 'Agent introuvable' })
  if (!canAccessClient(req, agent.client_id)) return denyClientAccess(res)
  const rows = db.prepare('SELECT created_at FROM calls WHERE agent_id = ? ORDER BY created_at ASC').all(req.params.id)
  const byDay = rows.reduce((acc, row) => {
    const d = row.created_at.slice(0, 10)
    acc[d] = (acc[d] || 0) + 1
    return acc
  }, {})
  const data = Object.entries(byDay).map(([date, calls]) => ({ date, calls }))
  return res.json(data)
})

app.post('/api/calls/webhook', webhookSignatureRequired(() => process.env.PENRA_CALLS_WEBHOOK_SECRET), (req, res) => {
  const eventKey = webhookEventKey(req, 'calls')
  if (isWebhookDuplicate('calls', eventKey)) {
    return res.status(200).json({ ok: true, duplicate: true })
  }

  const event = req.body
  const callId = id('call')
  const createdAt = event.timestamp || nowIso()
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(event.agentId)
  if (!agent) return res.status(404).json({ message: 'Agent introuvable' })

  db.prepare('INSERT INTO calls (id, agent_id, client_id, from_number, to_number, duration, summary, transcription, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(callId, agent.id, agent.client_id, event.fromNumber || null, agent.phone_number || null, Number(event.duration || 0), event.summary || '', event.transcription || '', event.status || 'completed', createdAt)

  db.prepare('UPDATE agents SET calls_this_month = calls_this_month + 1, calls_total = calls_total + 1, last_activity = ?, updated_at = ? WHERE id = ?')
    .run(createdAt, nowIso(), agent.id)

  markWebhookProcessed('calls', eventKey, payloadHash(req))

  logAudit({ type: 'call_received', message: `Appel reçu pour agent ${agent.name}`, clientId: agent.client_id })

  res.status(201).json({ ok: true, id: callId })
})

app.get('/api/instagram/oauth/url', authRequired, (req, res) => {
  try {
    const state = `${req.auth.sub}:${Date.now()}`
    const url = getInstagramOAuthUrl(state)
    return res.json({ url, state })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

app.get('/api/instagram/oauth/callback', (req, res) => {
  const code = req.query.code
  const error = req.query.error
  const frontendUrl = process.env.FRONTEND_IG_CALLBACK_URL || 'http://localhost:5173/client/instagram'

  if (error) {
    const url = new URL(frontendUrl)
    url.searchParams.set('error', String(error))
    return res.redirect(url.toString())
  }

  if (!code) {
    return res.status(400).send('Code OAuth manquant')
  }

  const url = new URL(frontendUrl)
  url.searchParams.set('code', String(code))
  return res.redirect(url.toString())
})

app.post('/api/instagram/connect', authRequired, async (req, res) => {
  try {
    const validated = validateBody(connectInstagramSchema, req.body, res)
    if (!validated.ok) return validated.response
    const { code } = validated.data
    if (!code) return res.status(400).json({ message: 'Code OAuth manquant' })

    const account = await exchangeInstagramCode(code)
    const user = authUser(req)
    const accountId = id('igacc')
    const clientId = user.client_id || req.body.clientId || ''

    db.prepare('DELETE FROM ig_accounts WHERE user_id = ?').run(user.id)
    db.prepare(`INSERT INTO ig_accounts (id, user_id, client_id, ig_user_id, username, display_name, profile_pic_url, followers, following_count, posts_count, bio, access_token, token_expires_at, connected_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(accountId, user.id, clientId, account.igUserId, account.username, account.username, account.profilePicUrl, account.followers, account.followingCount, account.postsCount, account.bio, account.accessToken, null, account.connectedAt)

    return res.json({
      username: account.username,
      displayName: account.username,
      profilePicUrl: account.profilePicUrl,
      followers: account.followers,
      following: account.followingCount,
      postsCount: account.postsCount,
      bio: account.bio,
      connectedAt: account.connectedAt,
    })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

app.get('/api/instagram/account', authRequired, (req, res) => {
  const row = db.prepare('SELECT * FROM ig_accounts WHERE user_id = ? AND disconnected_at IS NULL').get(req.auth.sub)
  if (!row) return res.json(null)
  return res.json({
    username: row.username,
    displayName: row.display_name || row.username,
    profilePicUrl: row.profile_pic_url || '',
    followers: row.followers,
    following: row.following_count,
    postsCount: row.posts_count,
    bio: row.bio || '',
    connectedAt: row.connected_at,
  })
})

app.delete('/api/instagram/account', authRequired, (req, res) => {
  db.prepare('UPDATE ig_accounts SET disconnected_at = ? WHERE user_id = ? AND disconnected_at IS NULL').run(nowIso(), req.auth.sub)
  return res.status(204).send()
})

app.get('/api/instagram/posts', authRequired, async (req, res) => {
  try {
    const account = db.prepare('SELECT * FROM ig_accounts WHERE user_id = ? AND disconnected_at IS NULL').get(req.auth.sub)
    if (!account) return res.status(404).json({ message: 'Compte Instagram non connecté' })
    const posts = await fetchInstagramPosts({ igUserId: account.ig_user_id, accessToken: account.access_token })
    return res.json({ data: posts })
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

app.get('/api/instagram/stats', authRequired, (req, res) => {
  const user = authUser(req)
  const automations = isAdmin(req)
    ? db.prepare('SELECT * FROM ig_automations').all()
    : db.prepare('SELECT * FROM ig_automations WHERE client_id = ?').all(user.client_id)
  const commentsProcessed = automations.reduce((s, a) => s + a.comments_seen, 0)
  const dmSent = automations.reduce((s, a) => s + a.dms_sent, 0)
  const responseRate = commentsProcessed > 0 ? Math.round((dmSent / commentsProcessed) * 100) : 0
  const dailyData = []
  return res.json({ commentsProcessed, dmSent, responseRate, dailyData })
})

app.get('/api/instagram/automations', authRequired, (req, res) => {
  const user = authUser(req)
  const rows = user.client_id
    ? db.prepare('SELECT * FROM ig_automations WHERE client_id = ? ORDER BY created_at DESC').all(user.client_id)
    : db.prepare('SELECT * FROM ig_automations ORDER BY created_at DESC').all()
  return res.json({ data: rows.map(mapIgAutomation), total: rows.length })
})

app.post('/api/instagram/automations', authRequired, async (req, res) => {
  try {
    const user = authUser(req)
    const ig = db.prepare('SELECT * FROM ig_accounts WHERE user_id = ? AND disconnected_at IS NULL').get(user.id)
    if (!ig) return res.status(400).json({ message: 'Connectez Instagram avant de créer une automatisation' })

    const validated = validateBody(createAutomationSchema, req.body, res)
    if (!validated.ok) return validated.response
    const body = validated.data
    const effectiveClientId = body.clientId || user.client_id
    if (!canAccessClient(req, effectiveClientId)) return denyClientAccess(res)
    const webhookUrl = body.webhookUrl || null

    const automationId = id('iga')
    db.prepare(`INSERT INTO ig_automations (id, client_id, ig_account_id, post_id, post_url, trigger_keyword, dm_message, webhook_url, make_scenario_id, enabled, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        automationId,
        effectiveClientId,
        ig.id,
        body.postId,
        body.postUrl,
        String(body.triggerKeyword || '').toUpperCase(),
        body.dmMessage,
        webhookUrl,
        null,
        body.enabled ? 1 : 0,
        nowIso(),
        nowIso(),
      )

    const row = db.prepare('SELECT * FROM ig_automations WHERE id = ?').get(automationId)
    logAudit({ type: 'automation_created', message: `Automatisation IG créée (${row.trigger_keyword})`, clientId: row.client_id })
    return res.status(201).json(mapIgAutomation(row))
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

app.put('/api/instagram/automations/:id', authRequired, (req, res) => {
  const existing = db.prepare('SELECT * FROM ig_automations WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Automatisation introuvable' })
  if (!canAccessClient(req, existing.client_id)) return denyClientAccess(res)
  const validated = validateBody(updateAutomationSchema, req.body, res)
  if (!validated.ok) return validated.response
  const body = validated.data

  db.prepare(`UPDATE ig_automations SET post_url = ?, trigger_keyword = ?, dm_message = ?, webhook_url = ?, enabled = ?, updated_at = ? WHERE id = ?`)
    .run(body.postUrl ?? existing.post_url, String(body.triggerKeyword ?? existing.trigger_keyword).toUpperCase(), body.dmMessage ?? existing.dm_message, body.webhookUrl ?? existing.webhook_url, body.enabled === undefined ? existing.enabled : body.enabled ? 1 : 0, nowIso(), existing.id)

  const updated = db.prepare('SELECT * FROM ig_automations WHERE id = ?').get(existing.id)
  logAudit({ type: 'automation_updated', message: `Automatisation IG mise à jour (${updated.trigger_keyword})`, clientId: updated.client_id })
  return res.json(mapIgAutomation(updated))
})

app.post('/api/instagram/automations/:id/toggle', authRequired, (req, res) => {
  const existing = db.prepare('SELECT * FROM ig_automations WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Automatisation introuvable' })
  if (!canAccessClient(req, existing.client_id)) return denyClientAccess(res)
  db.prepare('UPDATE ig_automations SET enabled = ?, updated_at = ? WHERE id = ?').run(existing.enabled ? 0 : 1, nowIso(), existing.id)
  const updated = db.prepare('SELECT * FROM ig_automations WHERE id = ?').get(existing.id)
  logAudit({ type: 'automation_toggled', message: `Automatisation IG ${updated.enabled ? 'activée' : 'désactivée'}`, clientId: updated.client_id })
  return res.json(mapIgAutomation(updated))
})

app.delete('/api/instagram/automations/:id', authRequired, (req, res) => {
  const existing = db.prepare('SELECT * FROM ig_automations WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Automatisation introuvable' })
  if (!canAccessClient(req, existing.client_id)) return denyClientAccess(res)
  db.prepare('DELETE FROM ig_automations WHERE id = ?').run(existing.id)
  db.prepare('DELETE FROM automation_logs WHERE automation_id = ?').run(existing.id)
  logAudit({ type: 'automation_deleted', message: `Automatisation IG supprimée (${existing.trigger_keyword})`, clientId: existing.client_id })
  return res.status(204).send()
})

app.post('/api/instagram/automations/:id/test-webhook', authRequired, async (req, res) => {
  try {
    const automation = db.prepare('SELECT * FROM ig_automations WHERE id = ?').get(req.params.id)
    if (!automation) return res.status(404).json({ message: 'Automatisation introuvable' })
    if (!canAccessClient(req, automation.client_id)) return denyClientAccess(res)

    const igAccount = db.prepare('SELECT * FROM ig_accounts WHERE id = ?').get(automation.ig_account_id)
    if (!igAccount) return res.status(400).json({ message: 'Compte Instagram introuvable pour cette automatisation' })

    const recipientIgId = req.body.userId || process.env.TEST_IG_RECIPIENT_ID
    if (!recipientIgId) {
      return res.status(400).json({
        message: 'Ajoutez TEST_IG_RECIPIENT_ID dans .env ou fournissez userId pour tester le DM',
      })
    }

    const payload = {
      event: 'automation.test',
      automationId: automation.id,
      keyword: automation.trigger_keyword,
      user: req.body.user || 'test_user',
      recipientIgId,
      text: req.body.text || automation.trigger_keyword,
      timestamp: nowIso(),
    }

    const result = await sendInstagramDM({
      igBusinessAccountId: igAccount.ig_user_id,
      accessToken: igAccount.access_token,
      recipientIgId,
      message: automation.dm_message,
    })

    db.prepare('INSERT INTO automation_logs (id, automation_id, event_type, status, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id('alog'), automation.id, 'webhook_test', result.ok ? 'ok' : 'error', JSON.stringify(payload), nowIso())
    return res.json(result)
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
})

app.get('/api/instagram/webhook/comment', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  console.log(`[IG Webhook Verify] mode=${mode}, token=${token}, hasChallenge=${!!challenge}`)

  if (mode === 'subscribe' && token === process.env.PENRA_IG_WEBHOOK_SECRET) {
    console.log('[IG Webhook Verify] SUCCESS')
    return res.status(200).send(challenge)
  }

  console.error('[IG Webhook Verify] FAILED: Invalid token or mode')
  return res.status(403).send('Verification failed')
})

app.post('/api/instagram/webhook/comment', webhookSignatureRequired(() => process.env.PENRA_IG_WEBHOOK_SECRET), async (req, res) => {
  const body = req.body
  const signature = req.headers['x-hub-signature-256']
  
  console.log(`[IG WEBHOOK] Event received: object=${body.object}, entries=${body.entry?.length}`)
  
  const eventKey = webhookEventKey(req, 'instagram-comment')
  if (isWebhookDuplicate('instagram', eventKey)) {
    console.log(`[IG WEBHOOK] Duplicate detected (key: ${eventKey}). Ignoring.`)
    return res.status(200).json({ ok: true, duplicate: true })
  }

  const event = extractInstagramCommentEvent(body)
  console.log(`[IG WEBHOOK] Parsed event: type=${event.type}, userId=${event.userId}, postId=${event.postId}`)

  if (event.type === 'echo') {
    return res.json({ ok: true, ignored: 'self_echo' })
  }

  // Multi-type handling
  if (body.object === 'instagram' && body.entry?.[0]?.messaging) {
    const messaging = body.entry[0].messaging[0]
    const senderId = messaging.sender?.id
    const recipientId = messaging.recipient?.id
    const messageText = messaging.message?.text
    const isStory = !!messaging.message?.reply_to?.story

    console.log(`[IG WEBHOOK] Message/Story Event: from=${senderId}, to=${recipientId}, text=${messageText}, story=${isStory}`)

    if (senderId && messageText) {
      const account = db.prepare('SELECT * FROM ig_accounts WHERE ig_user_id = ?').get(recipientId)
      if (account) {
        // Find automations for DM/Stories
        const automations = db.prepare(`
          SELECT * FROM ig_automations 
          WHERE ig_account_id = ? AND enabled = 1 
          AND (post_id = 'direct_message' OR post_id = 'story_tag' OR post_id = '*')
        `).all(account.id)
        
        console.log(`[IG WEBHOOK] Found ${automations.length} potential automations for this account.`)

        for (const auto of automations) {
          const keyword = String(auto.trigger_keyword || '').toLowerCase()
          const matched = messageText.toLowerCase().includes(keyword) || keyword === '*'
          
          if (matched) {
            console.log(`[IG WEBHOOK] Match found! Automation=${auto.id}, trigger=${auto.trigger_keyword}`)
            if (auto.webhook_url) {
              const resMake = await forwardToMakeWebhook({
                url: auto.webhook_url,
                payload: {
                  type: isStory ? 'story_tag' : 'direct_message',
                  senderId,
                  text: messageText,
                  username: account.username,
                  ig_user_id: account.ig_user_id,
                },
                automationId: auto.id,
              })

              if (!resMake.ok) {
                enqueueOutboundJob({
                  type: 'make_webhook',
                  targetUrl: auto.webhook_url,
                  payload: {
                    automationId: auto.id,
                    data: {
                      type: isStory ? 'story_tag' : 'direct_message',
                      senderId,
                      text: messageText,
                      username: account.username,
                      ig_user_id: account.ig_user_id,
                    },
                  },
                  clientId: auto.client_id,
                })
              }
            } else {
              await sendInstagramDM({
                igBusinessAccountId: account.ig_user_id,
                accessToken: account.access_token,
                recipientIgId: senderId,
                message: auto.dm_message,
              })
            }

            db.prepare('UPDATE ig_automations SET comments_seen = comments_seen + 1, dms_sent = dms_sent + 1, last_event_at = ?, updated_at = ? WHERE id = ?')
              .run(nowIso(), nowIso(), auto.id)
              
            db.prepare('INSERT INTO automation_logs (id, automation_id, event_type, status, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
              .run(id('alog'), auto.id, isStory ? 'story_dm_sent' : 'dm_dm_sent', 'ok', JSON.stringify({ senderId, messageText, isStory }), nowIso())
          }
        }
      }
    }
    markWebhookProcessed('instagram', eventKey, payloadHash(req))
    return res.json({ ok: true, type: 'messaging' })
  }

  // Handle Mentions & Comments
  if (event.type === 'comment' || event.type === 'mention') {
    // Find matching automations
    const query = event.type === 'mention' 
      ? 'SELECT * FROM ig_automations WHERE enabled = 1 AND (post_id = "mentions" OR post_id = "*")'
      : 'SELECT * FROM ig_automations WHERE enabled = 1 AND (post_id = ? OR post_id = "*")'
    
    const automations = event.type === 'mention' 
      ? db.prepare(query).all()
      : db.prepare(query).all(event.postId)

    console.log(`[IG WEBHOOK] ${event.type} event: Found ${automations.length} potential automations.`)

    for (const auto of automations) {
      const keyword = String(auto.trigger_keyword || '').toLowerCase()
      if (String(event.comment || '').toLowerCase().includes(keyword) || keyword === '*') {
        console.log(`[IG WEBHOOK] Match found for ${event.type}! Automation=${auto.id}`)
        const account = db.prepare('SELECT * FROM ig_accounts WHERE id = ?').get(auto.ig_account_id)
        const recipientIgId = event.userId

        if (account && recipientIgId) {
          // Robust sending: enqueue first if it's critical, or try directly and enqueue on fail
          const result = await sendInstagramDM({
            igBusinessAccountId: account.ig_user_id,
            accessToken: account.access_token,
            recipientIgId,
            message: auto.dm_message,
          })

          if (!result.ok) {
            console.warn(`[IG WEBHOOK] Direct DM failed, enqueuing job. Error: ${result.error}`)
            enqueueOutboundJob({
              type: 'instagram_dm',
              targetUrl: 'graph://instagram/messages',
              payload: {
                automationId: auto.id,
                igBusinessAccountId: account.ig_user_id,
                accessToken: account.access_token,
                recipientIgId,
                message: auto.dm_message,
                eventText: event.comment,
                eventUser: event.username,
              },
              clientId: auto.client_id,
              maxAttempts: Number(process.env.IG_DM_QUEUE_MAX_ATTEMPTS || 10),
            })
          }

          db.prepare('UPDATE ig_automations SET comments_seen = comments_seen + 1, dms_sent = dms_sent + ?, last_event_at = ?, updated_at = ? WHERE id = ?')
            .run(result.ok ? 1 : 0, nowIso(), nowIso(), auto.id)

          if (auto.webhook_url) {
            const payload = {
              type: event.type,
              postId: event.postId,
              comment: event.comment,
              userId: event.userId,
              username: event.username,
              automationId: auto.id,
            }
            const resMake = await forwardToMakeWebhook({
              url: auto.webhook_url,
              payload,
              automationId: auto.id,
            })
            if (!resMake.ok) {
              enqueueOutboundJob({
                type: 'make_webhook',
                targetUrl: auto.webhook_url,
                payload: {
                  automationId: auto.id,
                  data: payload,
                },
                clientId: auto.client_id,
              })
            }
          }

          db.prepare('INSERT INTO automation_logs (id, automation_id, event_type, status, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id('alog'), auto.id, `${event.type}_dm_sent`, result.ok ? 'ok' : 'queued', JSON.stringify({ ...event, result }), nowIso())
        }
      }
    }
  }

  markWebhookProcessed('instagram', eventKey, payloadHash(req))
  return res.json({ ok: true })
})

app.get('/api/instagram/logs', authRequired, (req, res) => {
  const user = authUser(req)
  if (isAdmin(req)) {
    const adminRows = db.prepare('SELECT * FROM automation_logs ORDER BY created_at DESC LIMIT 100').all()
    return res.json({ data: adminRows.map((row) => ({
      id: row.id,
      automationId: row.automation_id,
      eventType: row.event_type,
      status: row.status,
      payload: parseJson(row.payload_json, {}),
      createdAt: row.created_at,
    })) })
  }
  const rows = db.prepare(`
    SELECT l.* FROM automation_logs l
    JOIN ig_automations a ON a.id = l.automation_id
    WHERE a.client_id = ?
    ORDER BY l.created_at DESC
    LIMIT 100
  `).all(user.client_id)

  res.json({ data: rows.map((row) => ({
    id: row.id,
    automationId: row.automation_id,
    eventType: row.event_type,
    status: row.status,
    payload: parseJson(row.payload_json, {}),
    createdAt: row.created_at,
  })) })
})

app.get('/api/dashboard/admin', authRequired, (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Accès admin requis' })
  const clients = db.prepare('SELECT * FROM clients').all()
  const agents = db.prepare('SELECT * FROM agents').all()
  const autos = db.prepare('SELECT * FROM ig_automations').all()
  const calls = db.prepare('SELECT * FROM calls').all()

  const mrr = clients.filter((c) => c.status === 'active').reduce((s, c) => s + Number(c.monthly_price), 0)
  const activeClients = clients.filter((c) => c.status === 'active').length

  const revenueByMonth = db.prepare("SELECT substr(date, 1, 7) AS month, sum(amount) as revenue FROM invoices GROUP BY substr(date, 1, 7) ORDER BY month").all()

  const recentActivity = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10').all()

  return res.json({
    mrr,
    activeClients,
    totalCalls: calls.length,
    activeAutomations: autos.filter((a) => a.enabled).length,
    mrrChange: 0,
    clientsChange: 0,
    callsChange: 0,
    automationsChange: 0,
    revenueChart: revenueByMonth.map((row) => ({ month: row.month, revenue: Number(row.revenue || 0) })),
    recentActivity: recentActivity.map((row) => ({
      id: row.id,
      type: row.type,
      message: row.message,
      timestamp: row.created_at,
    })),
  })
})

app.get('/api/dashboard/client/:clientId', authRequired, (req, res) => {
  const clientId = req.params.clientId
  if (!canAccessClient(req, clientId)) return denyClientAccess(res)
  const autos = db.prepare('SELECT * FROM ig_automations WHERE client_id = ?').all(clientId)
  const calls = db.prepare('SELECT * FROM calls WHERE client_id = ?').all(clientId)

  const comments = autos.reduce((sum, a) => sum + a.comments_seen, 0)
  const dms = autos.reduce((sum, a) => sum + a.dms_sent, 0)

  return res.json({
    dmsThisMonth: dms,
    commentsThisMonth: comments,
    callsThisMonth: calls.length,
    responseRate: comments > 0 ? Math.round((dms / comments) * 100) : 0,
    dmsChange: 0,
    commentsChange: 0,
    callsChange: 0,
    responseRateChange: 0,
    instagramStats: [],
    vocalStats: [],
  })
})

app.get('/api/dashboard/recent-activity', authRequired, (req, res) => {
  const limit = Number(req.query.limit || 10)
  const rows = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?').all(limit)
  return res.json(rows.map((r) => ({ id: r.id, type: r.type, message: r.message, timestamp: r.created_at })))
})

app.get('/api/invoices', authRequired, (req, res) => {
  const rows = isAdmin(req)
    ? db.prepare('SELECT * FROM invoices ORDER BY date DESC').all()
    : db.prepare('SELECT * FROM invoices WHERE client_id = ? ORDER BY date DESC').all(req.auth.clientId)
  return res.json({ data: rows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    clientName: r.client_name,
    amount: r.amount,
    date: r.date,
    dueDate: r.due_date,
    status: r.status,
    items: [],
  })), total: rows.length })
})

app.get('/api/invoices/:id', authRequired, (req, res) => {
  const r = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id)
  if (!r) return res.status(404).json({ message: 'Facture introuvable' })
  if (!canAccessClient(req, r.client_id)) return denyClientAccess(res)
  return res.json({
    id: r.id,
    clientId: r.client_id,
    clientName: r.client_name,
    amount: r.amount,
    date: r.date,
    dueDate: r.due_date,
    status: r.status,
    items: [],
  })
})

app.get('/api/invoices/:id/pdf', authRequired, (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id)
  if (!invoice) return res.status(404).json({ message: 'Facture introuvable' })
  if (!canAccessClient(req, invoice.client_id)) return denyClientAccess(res)
  const content = `PENRA INVOICE\nID: ${invoice.id}\nClient: ${invoice.client_name}\nMontant: ${invoice.amount} EUR\nStatut: ${invoice.status}\nDate: ${invoice.date}`
  res.setHeader('Content-Type', 'application/pdf')
  return res.send(Buffer.from(content, 'utf-8'))
})

app.post('/api/invoices', authRequired, (req, res) => {
  const validated = validateBody(createInvoiceSchema, req.body, res)
  if (!validated.ok) return validated.response
  const body = validated.data
  if (!canAccessClient(req, body.clientId)) return denyClientAccess(res)
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(body.clientId)
  if (!client) return res.status(404).json({ message: 'Client introuvable' })
  const amount = body.items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitPrice), 0)
  const invoiceId = id('inv')
  db.prepare('INSERT INTO invoices (id, client_id, client_name, amount, status, date, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(invoiceId, client.id, client.company, amount, 'pending', nowIso(), nowIso())
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId)
  logAudit({ type: 'invoice_created', message: `Facture créée: ${inv.id}`, clientId: inv.client_id })
  return res.status(201).json({
    id: inv.id,
    clientId: inv.client_id,
    clientName: inv.client_name,
    amount: inv.amount,
    date: inv.date,
    dueDate: inv.due_date,
    status: inv.status,
    items: body.items,
  })
})

app.put('/api/invoices/:id/mark-paid', authRequired, (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id)
  if (!inv) return res.status(404).json({ message: 'Facture introuvable' })
  if (!canAccessClient(req, inv.client_id)) return denyClientAccess(res)
  db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run('paid', req.params.id)
  logAudit({ type: 'invoice_paid', message: `Facture payée: ${inv.id}`, clientId: inv.client_id })
  return res.json({
    id: inv.id,
    clientId: inv.client_id,
    clientName: inv.client_name,
    amount: inv.amount,
    date: inv.date,
    dueDate: inv.due_date,
    status: inv.status,
    items: [],
  })
})

app.get('/api/commissions', authRequired, (req, res) => {
  const rows = isAdmin(req)
    ? db.prepare('SELECT * FROM commissions ORDER BY created_at DESC').all()
    : db.prepare('SELECT * FROM commissions WHERE client_id = ? ORDER BY created_at DESC').all(req.auth.clientId)
  return res.json({ data: rows.map((r) => ({
    id: r.id,
    closerId: r.closer_id,
    closerName: r.closer_name,
    clientId: r.client_id,
    clientName: r.client_name,
    dealAmount: r.deal_amount,
    rate: r.rate,
    commissionAmount: r.commission_amount,
    status: r.status,
    createdAt: r.created_at,
  })), total: rows.length, totalPending: rows.filter((r) => r.status === 'pending').reduce((s, r) => s + Number(r.commission_amount), 0) })
})

app.post('/api/commissions', authRequired, (req, res) => {
  const validated = validateBody(createCommissionSchema, req.body, res)
  if (!validated.ok) return validated.response
  const body = validated.data
  if (!canAccessClient(req, body.clientId)) return denyClientAccess(res)
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(body.clientId)
  if (!client) return res.status(404).json({ message: 'Client introuvable' })
  const commissionAmount = Number(body.dealAmount) * Number(body.commissionRate)
  const commissionId = id('com')
  db.prepare('INSERT INTO commissions (id, closer_id, closer_name, client_id, client_name, deal_amount, rate, commission_amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(commissionId, body.closerId, `Closer ${body.closerId}`, client.id, client.company, Number(body.dealAmount), Number(body.commissionRate), commissionAmount, 'pending', nowIso())

  const row = db.prepare('SELECT * FROM commissions WHERE id = ?').get(commissionId)
  logAudit({ type: 'commission_created', message: `Commission créée: ${row.id}`, clientId: row.client_id })
  return res.status(201).json({
    id: row.id,
    closerId: row.closer_id,
    closerName: row.closer_name,
    clientId: row.client_id,
    clientName: row.client_name,
    dealAmount: row.deal_amount,
    rate: row.rate,
    commissionAmount: row.commission_amount,
    status: row.status,
    createdAt: row.created_at,
  })
})

app.put('/api/commissions/:id/mark-paid', authRequired, (req, res) => {
  const row = db.prepare('SELECT * FROM commissions WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ message: 'Commission introuvable' })
  if (!canAccessClient(req, row.client_id)) return denyClientAccess(res)
  db.prepare('UPDATE commissions SET status = ? WHERE id = ?').run('paid', req.params.id)
  logAudit({ type: 'commission_paid', message: `Commission payée: ${row.id}`, clientId: row.client_id })
  return res.json({
    id: row.id,
    closerId: row.closer_id,
    closerName: row.closer_name,
    clientId: row.client_id,
    clientName: row.client_name,
    dealAmount: row.deal_amount,
    rate: row.rate,
    commissionAmount: row.commission_amount,
    status: row.status,
    createdAt: row.created_at,
  })
})

app.use((error, _, res, __) => {
  console.error(error)
  return res.status(500).json({ message: 'Erreur interne serveur' })
})

const queueIntervalMs = Number(process.env.OUTBOUND_QUEUE_INTERVAL_MS || 3000)
if (process.env.NODE_ENV !== 'test') {
  const timer = setInterval(() => {
    void processOutboundJobs()
  }, queueIntervalMs)
  // timer.unref?.()
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`PENRA API running on http://localhost:${PORT}/api`)
  })
}

export { app }
