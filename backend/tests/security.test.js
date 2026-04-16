import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import request from 'supertest'
import { computeHmacSignature } from '../lib/security.js'
import { id, nowIso } from '../lib/utils.js'

process.env.NODE_ENV = 'test'
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000'
process.env.AUTH_RATE_LIMIT_MAX = '2'
process.env.PENRA_IG_WEBHOOK_SECRET = 'test-ig-secret'
process.env.PENRA_CALLS_WEBHOOK_SECRET = 'test-calls-secret'
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token'
process.env.PUBLIC_API_BASE_URL = 'http://localhost'

const { app } = await import('../server.js')
const { db } = await import('../lib/db.js')

function twilioSignature(url, params) {
  const sortedKeys = Object.keys(params).sort()
  const data = sortedKeys.reduce((acc, key) => acc + key + String(params[key]), url)
  return createHmac('sha1', process.env.TWILIO_AUTH_TOKEN).update(data, 'utf8').digest('base64')
}

test('rate limit blocks excessive auth attempts', async () => {
  const payload = { email: 'nope@example.com', password: 'bad-password' }

  const first = await request(app).post('/api/auth/login').send(payload)
  const second = await request(app).post('/api/auth/login').send(payload)
  const third = await request(app).post('/api/auth/login').send(payload)

  assert.equal(first.status, 401)
  assert.equal(second.status, 401)
  assert.equal(third.status, 429)
})

test('instagram webhook requires valid signature and is idempotent', async () => {
  const body = { postId: 'post_test', comment: 'hello keyword', user: 'u1' }
  const raw = JSON.stringify(body)
  const signature = computeHmacSignature(process.env.PENRA_IG_WEBHOOK_SECRET, raw)
  const eventId = `evt_${Date.now()}`

  const bad = await request(app)
    .post('/api/instagram/webhook/comment')
    .set('Content-Type', 'application/json')
    .set('x-event-id', eventId)
    .set('x-penra-signature', 'invalid')
    .send(body)
  assert.equal(bad.status, 401)

  const first = await request(app)
    .post('/api/instagram/webhook/comment')
    .set('Content-Type', 'application/json')
    .set('x-event-id', eventId)
    .set('x-penra-signature', signature)
    .send(body)

  assert.equal(first.status, 200)
  assert.equal(first.body.ok, true)

  const second = await request(app)
    .post('/api/instagram/webhook/comment')
    .set('Content-Type', 'application/json')
    .set('x-event-id', eventId)
    .set('x-penra-signature', signature)
    .send(body)

  assert.equal(second.status, 200)
  assert.equal(second.body.duplicate, true)
})

test('twilio voice and status webhooks require signature and persist calls', async () => {
  const clientId = id('client')
  const agentId = id('agt')
  const toNumber = '+33123456789'
  const fromNumber = '+33600000000'
  const callSid = `CA${Date.now()}TESTSID`

  db.prepare(`INSERT INTO clients (id, name, email, company, services, status, subscription_plan, monthly_price, next_renewal, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(clientId, 'Client Test', 'client-test@example.com', 'Client Test', JSON.stringify(['vocal']), 'active', 'Premium', 99, nowIso(), nowIso())

  db.prepare(`INSERT INTO agents (id, client_id, client_name, name, phone_number, voice, sector, language, status, system_prompt, tone, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(agentId, clientId, 'Client Test', 'Agent Test', toNumber, 'test-voice', 'test', 'fr-FR', 'active', 'Bonjour test PENRA', 'professional', nowIso(), nowIso())

  const voicePayload = { To: toNumber, From: fromNumber, CallSid: callSid }
  const voiceSig = twilioSignature('http://localhost/api/twilio/voice', voicePayload)

  const voiceBad = await request(app)
    .post('/api/twilio/voice')
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('x-twilio-signature', 'bad-signature')
    .send(voicePayload)
  assert.equal(voiceBad.status, 401)

  const voiceOk = await request(app)
    .post('/api/twilio/voice')
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('x-twilio-signature', voiceSig)
    .send(voicePayload)
  assert.equal(voiceOk.status, 200)
  assert.match(voiceOk.text, /<Response>/)

  const statusPayload = { To: toNumber, From: fromNumber, CallSid: callSid, CallStatus: 'completed', CallDuration: '21' }
  const statusSig = twilioSignature('http://localhost/api/twilio/status', statusPayload)

  const statusOk = await request(app)
    .post('/api/twilio/status')
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('x-twilio-signature', statusSig)
    .send(statusPayload)
  assert.equal(statusOk.status, 204)

  const stored = db.prepare('SELECT * FROM calls WHERE id = ?').get(callSid)
  assert.ok(stored)
  assert.equal(stored.status, 'completed')
  assert.equal(stored.duration, 21)

  db.prepare('DELETE FROM calls WHERE id = ?').run(callSid)
  db.prepare('DELETE FROM agents WHERE id = ?').run(agentId)
  db.prepare('DELETE FROM clients WHERE id = ?').run(clientId)
})
