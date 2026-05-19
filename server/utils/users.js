// In-memory user store. Replace with a real database (Postgres, SQLite, etc.)
// when you're ready to deploy to multiple machines.
//
// Schema: { phone: string (E.164), createdAt: ISO date, lastLoginAt: ISO date }

const users = new Map() // phone -> user

export function getOrCreateUser(phoneE164) {
  const existing = users.get(phoneE164)
  const now = new Date().toISOString()

  if (existing) {
    existing.lastLoginAt = now
    return existing
  }

  const user = {
    phone: phoneE164,
    createdAt: now,
    lastLoginAt: now,
  }
  users.set(phoneE164, user)
  return user
}

export function getUser(phoneE164) {
  return users.get(phoneE164) || null
}
