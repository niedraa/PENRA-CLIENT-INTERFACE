import { nowIso } from './utils.js'
import { fetchWithRetry } from './retry.js'

const IG_API_VERSION = process.env.IG_API_VERSION || 'v22.0'

export function getInstagramOAuthUrl(state) {
  const appId = process.env.META_APP_ID
  const redirectUri = process.env.META_REDIRECT_URI
  if (!appId || !redirectUri) {
    throw new Error('META_APP_ID ou META_REDIRECT_URI non configuré')
  }

  const scopes = [
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'pages_show_list',
    'pages_manage_metadata',
    'business_management',
  ].join(',')

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: 'code',
    state,
  })

  return `https://www.facebook.com/${IG_API_VERSION}/dialog/oauth?${params.toString()}`
}

export async function exchangeInstagramCode(code) {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const redirectUri = process.env.META_REDIRECT_URI

  if (!appId || !appSecret || !redirectUri) {
    throw new Error('Configuration Meta incomplète')
  }

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  })

  const tokenResp = await fetch(`https://graph.facebook.com/${IG_API_VERSION}/oauth/access_token?${params}`)
  if (!tokenResp.ok) {
    throw new Error('Échec échange OAuth Instagram')
  }

  const tokenData = await tokenResp.json()
  const accessToken = tokenData.access_token

  const pagesResp = await fetch(
    `https://graph.facebook.com/${IG_API_VERSION}/me/accounts?access_token=${encodeURIComponent(accessToken)}`,
  )

  if (!pagesResp.ok) {
    throw new Error('Impossible de récupérer les pages Meta')
  }

  const pages = await pagesResp.json()
  const page = (pages.data || [])[0]
  if (!page?.id || !page?.access_token) {
    throw new Error('Aucune page Facebook liée au compte')
  }

  const igResp = await fetch(
    `https://graph.facebook.com/${IG_API_VERSION}/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(page.access_token)}`,
  )
  if (!igResp.ok) {
    throw new Error('Compte Instagram Business introuvable')
  }

  const igData = await igResp.json()
  const igId = igData.instagram_business_account?.id
  if (!igId) {
    throw new Error('Aucun compte Instagram Business connecté')
  }

  const profileResp = await fetch(
    `https://graph.facebook.com/${IG_API_VERSION}/${igId}?fields=username,profile_picture_url,biography,followers_count,follows_count,media_count&access_token=${encodeURIComponent(page.access_token)}`,
  )

  if (!profileResp.ok) {
    throw new Error('Impossible de récupérer le profil Instagram')
  }

  const profile = await profileResp.json()

  return {
    igUserId: igId,
    username: profile.username,
    profilePicUrl: profile.profile_picture_url || '',
    bio: profile.biography || '',
    followers: Number(profile.followers_count || 0),
    followingCount: Number(profile.follows_count || 0),
    postsCount: Number(profile.media_count || 0),
    accessToken: page.access_token,
    connectedAt: nowIso(),
  }
}

export async function fetchInstagramPosts({ igUserId, accessToken }) {
  const fields = 'id,caption,media_url,like_count,comments_count,timestamp,permalink'
  const url = `https://graph.facebook.com/${IG_API_VERSION}/${igUserId}/media?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error('Impossible de récupérer les publications Instagram')
  }
  const data = await resp.json()
  return (data.data || []).map((item) => ({
    id: item.id,
    imageUrl: item.media_url || '',
    caption: item.caption || '',
    likes: Number(item.like_count || 0),
    commentsCount: Number(item.comments_count || 0),
    timestamp: item.timestamp,
    permalink: item.permalink,
  }))
}

export async function createMakeScenario({ webhookUrl, keyword, dmMessage, postId }) {
  const makeToken = process.env.MAKE_API_TOKEN
  const makeTeamId = process.env.MAKE_TEAM_ID

  if (!makeToken || !makeTeamId) {
    return {
      scenarioId: null,
      webhookUrl,
      status: 'skipped',
      reason: 'MAKE_API_TOKEN ou MAKE_TEAM_ID manquant',
    }
  }

  const payload = {
    name: `PENRA IG ${keyword} ${postId}`,
    teamId: makeTeamId,
    metadata: {
      source: 'penra',
      keyword,
      dmMessage,
      postId,
      webhookUrl,
    },
  }

  const resp = await fetch('https://eu1.make.com/api/v2/scenarios', {
    method: 'POST',
    headers: {
      Authorization: `Token ${makeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const body = await resp.text()
    return {
      scenarioId: null,
      webhookUrl,
      status: 'error',
      reason: body,
    }
  }

  const created = await resp.json()
  return {
    scenarioId: String(created.id),
    webhookUrl,
    status: 'created',
  }
}

export async function sendInstagramDM({ igBusinessAccountId, accessToken, recipientIgId, message }) {
  if (!igBusinessAccountId || !accessToken || !recipientIgId || !message) {
    throw new Error('Paramètres manquants pour envoi DM Instagram')
  }

  const url = `https://graph.facebook.com/${IG_API_VERSION}/${igBusinessAccountId}/messages`
  const payload = {
    recipient: { id: recipientIgId },
    message: { text: message },
    messaging_type: 'RESPONSE',
    access_token: accessToken,
  }

  const result = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    {
      maxAttempts: Number(process.env.IG_DM_RETRY_ATTEMPTS || 3),
      baseDelayMs: Number(process.env.IG_DM_RETRY_BASE_DELAY_MS || 350),
    },
  )

  if (!result.response) {
    return { ok: false, status: 0, attempts: result.attempt }
  }

  if (!result.ok) {
    const errorBody = await result.response.text()
    return {
      ok: false,
      status: result.response.status,
      attempts: result.attempt,
      error: errorBody,
    }
  }

  const body = await result.response.json().catch(() => ({}))
  return {
    ok: true,
    status: result.response.status,
    attempts: result.attempt,
    messageId: body?.message_id || body?.id || null,
  }
}

export async function testMakeWebhook(webhookUrl, payload) {
  const result = await fetchWithRetry(
    webhookUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    {
      maxAttempts: Number(process.env.MAKE_WEBHOOK_RETRY_ATTEMPTS || 3),
      baseDelayMs: Number(process.env.MAKE_WEBHOOK_RETRY_BASE_DELAY_MS || 400),
    },
  )

  return {
    ok: Boolean(result.ok),
    status: result.response?.status || 0,
    attempts: result.attempt,
  }
}

export async function forwardToMakeWebhook({ url, payload, automationId }) {
  if (!url) return { ok: false, ignored: 'no_url' }

  try {
    const result = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          penra_automation_id: automationId,
          timestamp: nowIso(),
        }),
      },
      {
        maxAttempts: Number(process.env.MAKE_WEBHOOK_RETRY_ATTEMPTS || 3),
        baseDelayMs: Number(process.env.MAKE_WEBHOOK_RETRY_BASE_DELAY_MS || 400),
      },
    )

    return { ok: result.ok, status: result.response?.status || 0, attempts: result.attempt }
  } catch (error) {
    console.error(`[Make Webhook Error] ${url}:`, error)
    return { ok: false, error: error.message }
  }
}

export async function listElevenLabsVoices(apiKey) {
  if (!apiKey) {
    throw new Error('Clé ElevenLabs manquante')
  }

  const resp = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey },
  })

  if (!resp.ok) {
    throw new Error('Connexion ElevenLabs refusée')
  }

  const json = await resp.json()
  return json.voices || []
}

export async function provisionTwilioPhoneNumber({ accountSid, authToken, voiceWebhookUrl, statusCallbackUrl, dryRun = false }) {
  if (!voiceWebhookUrl) {
    throw new Error('TWILIO_VOICE_WEBHOOK_URL manquant')
  }

  const apiKeySid = process.env.TWILIO_API_KEY_SID
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET

  const hasApiKeyAuth = Boolean(apiKeySid && apiKeySecret)
  const hasTokenAuth = Boolean(accountSid && authToken)
  if (!hasApiKeyAuth && !hasTokenAuth) {
    throw new Error('Twilio non configuré')
  }

  if (accountSid && !String(accountSid).startsWith('AC')) {
    throw new Error('TWILIO_ACCOUNT_SID invalide: il doit commencer par AC')
  }

  const useTokenAuth = hasTokenAuth
  const basicAuth = useTokenAuth
    ? Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    : Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64')

  let resolvedAccountSid = accountSid
  if (!resolvedAccountSid && hasApiKeyAuth && !useTokenAuth) {
    const accountsResp = await fetch('https://api.twilio.com/2010-04-01/Accounts.json?PageSize=1', {
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
    })

    if (!accountsResp.ok) {
      const body = await accountsResp.text().catch(() => '')
      throw new Error(`Impossible de résoudre le Account SID Twilio depuis API Key (HTTP ${accountsResp.status}). Vérifiez TWILIO_API_KEY_SID/TWILIO_API_KEY_SECRET ou fournissez TWILIO_ACCOUNT_SID (AC...). Détail: ${body}`)
    }

    const accounts = await accountsResp.json()
    resolvedAccountSid = accounts.accounts?.[0]?.sid || null
  }

  if (!resolvedAccountSid) {
    throw new Error('TWILIO_ACCOUNT_SID manquant')
  }

  if (dryRun) {
    return {
      ok: true,
      accountSid: resolvedAccountSid,
    }
  }

  const countries = String(process.env.TWILIO_NUMBER_COUNTRIES || process.env.TWILIO_NUMBER_COUNTRY || 'FR')
    .split(',')
    .map((country) => country.trim().toUpperCase())
    .filter(Boolean)
  const addressSid = process.env.TWILIO_ADDRESS_SID || null

  let selectedNumber = null
  let selectedCountry = null
  let lastSearchError = null

  for (const country of countries) {
    const searchResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${resolvedAccountSid}/AvailablePhoneNumbers/${country}/Local.json?PageSize=1`,
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
      },
    )

    if (!searchResp.ok) {
      const body = await searchResp.text().catch(() => '')
      lastSearchError = `Pays ${country}: HTTP ${searchResp.status} ${body}`
      continue
    }

    const search = await searchResp.json()
    const number = search.available_phone_numbers?.[0]?.phone_number
    if (number) {
      selectedNumber = number
      selectedCountry = country
      break
    }
  }

  if (!selectedNumber) {
    throw new Error(`Aucun numéro Twilio disponible pour les pays configurés (${countries.join(', ')}). ${lastSearchError || ''}`.trim())
  }

  const body = new URLSearchParams({
    PhoneNumber: selectedNumber,
    VoiceUrl: voiceWebhookUrl,
    ...(statusCallbackUrl ? { StatusCallback: statusCallbackUrl } : {}),
    ...(statusCallbackUrl ? { StatusCallbackMethod: 'POST' } : {}),
    ...(addressSid ? { AddressSid: addressSid } : {}),
  })

  const buyResp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${resolvedAccountSid}/IncomingPhoneNumbers.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  )

  if (!buyResp.ok) {
    const bodyText = await buyResp.text().catch(() => '')
    if (bodyText.includes('"code":21404')) {
      const existingResp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${resolvedAccountSid}/IncomingPhoneNumbers.json?PageSize=1`,
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
          },
        },
      )

      if (existingResp.ok) {
        const existing = await existingResp.json().catch(() => ({}))
        const first = existing.incoming_phone_numbers?.[0]
        if (first?.sid && first?.phone_number) {
          return {
            sid: first.sid,
            phoneNumber: first.phone_number,
            reused: true,
          }
        }
      }
    }

    if (bodyText.includes('21631')) {
      throw new Error(`Impossible de provisionner un numéro Twilio: le pays ${selectedCountry} exige une adresse réglementaire. Configurez TWILIO_ADDRESS_SID (Twilio Console > Regulatory Compliance > Addresses). Détail: ${bodyText}`)
    }
    throw new Error(`Impossible de provisionner un numéro Twilio (HTTP ${buyResp.status}). Détail: ${bodyText}`)
  }

  const created = await buyResp.json()
  return {
    sid: created.sid,
    phoneNumber: created.phone_number,
  }
}
