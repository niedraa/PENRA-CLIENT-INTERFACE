import 'dotenv/config'

const accountSid = process.env.TWILIO_ACCOUNT_SID || ''
const authToken = process.env.TWILIO_AUTH_TOKEN || ''
const apiKeySid = process.env.TWILIO_API_KEY_SID || ''
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET || ''

function mask(value, start = 4, end = 3) {
  if (!value) return 'MISSING'
  if (value.length <= start + end) return `${value.slice(0, 2)}***`
  return `${value.slice(0, start)}***${value.slice(-end)}`
}

async function checkWithAccountToken() {
  if (!accountSid || !authToken) {
    return { ok: false, mode: 'AC+TOKEN', reason: 'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing' }
  }

  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
    },
  })

  const text = await resp.text()
  if (!resp.ok) {
    return { ok: false, mode: 'AC+TOKEN', status: resp.status, body: text }
  }

  let parsed = null
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = { sid: accountSid, status: 'unknown' }
  }

  return {
    ok: true,
    mode: 'AC+TOKEN',
    sid: parsed.sid || accountSid,
    status: parsed.status || 'unknown',
    type: parsed.type || 'unknown',
  }
}

async function checkWithApiKey() {
  if (!apiKeySid || !apiKeySecret) {
    return { ok: false, mode: 'API_KEY', reason: 'TWILIO_API_KEY_SID or TWILIO_API_KEY_SECRET missing' }
  }

  const resp = await fetch('https://api.twilio.com/2010-04-01/Accounts.json?PageSize=1', {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64')}`,
    },
  })

  const text = await resp.text()
  if (!resp.ok) {
    return { ok: false, mode: 'API_KEY', status: resp.status, body: text }
  }

  let parsed = null
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = { accounts: [] }
  }

  return {
    ok: true,
    mode: 'API_KEY',
    firstAccountSid: parsed.accounts?.[0]?.sid || null,
  }
}

async function main() {
  console.log('Twilio env snapshot:')
  console.log(`- TWILIO_ACCOUNT_SID=${mask(accountSid)}`)
  console.log(`- TWILIO_AUTH_TOKEN=${mask(authToken)}`)
  console.log(`- TWILIO_API_KEY_SID=${mask(apiKeySid)}`)
  console.log(`- TWILIO_API_KEY_SECRET=${mask(apiKeySecret)}`)

  const [acResult, apiKeyResult] = await Promise.all([
    checkWithAccountToken(),
    checkWithApiKey(),
  ])

  console.log('\nAC+TOKEN check:')
  console.log(JSON.stringify(acResult, null, 2))

  console.log('\nAPI_KEY check:')
  console.log(JSON.stringify(apiKeyResult, null, 2))

  const ok = acResult.ok || apiKeyResult.ok
  process.exitCode = ok ? 0 : 1
}

await main()
