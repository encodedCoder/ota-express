// Thin fetch wrapper that:
//   1. Prefixes the path with /api
//   2. Attaches the JWT from localStorage as a Bearer header
//   3. Throws on non-2xx with the server's error code in err.code
//
// Keep this dumb — no auto-refresh, no retries. The AuthContext handles
// 401s by logging the user out.

const TOKEN_KEY = 'ota_auth_token'

export const tokenStore = {
  get() {
    return localStorage.getItem(TOKEN_KEY)
  },
  set(token) {
    localStorage.setItem(TOKEN_KEY, token)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
  },
}

export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = tokenStore.get()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    /* response may be empty */
  }

  if (!res.ok) {
    const err = new Error(data?.error || `http_${res.status}`)
    err.code = data?.error
    err.status = res.status
    err.detail = data?.detail
    throw err
  }

  return data
}
