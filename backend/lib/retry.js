export async function sleepMs(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export function shouldRetryStatus(status) {
  return status >= 500 || status === 408 || status === 429
}

export async function fetchWithRetry(url, options = {}, config = {}) {
  const maxAttempts = Number(config.maxAttempts || 3)
  const baseDelayMs = Number(config.baseDelayMs || 400)

  let lastError = null
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, options)
      if (response.ok) {
        return { ok: true, response, attempt }
      }

      if (!shouldRetryStatus(response.status) || attempt === maxAttempts) {
        return { ok: false, response, attempt }
      }
    } catch (error) {
      lastError = error
      if (attempt === maxAttempts) {
        break
      }
    }

    const jitter = Math.floor(Math.random() * 120)
    await sleepMs(baseDelayMs * 2 ** (attempt - 1) + jitter)
  }

  if (lastError) {
    throw lastError
  }

  return { ok: false, response: null, attempt: maxAttempts }
}
