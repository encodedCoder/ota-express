import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { normalizePhone } from '../utils/phone.js'
import { sendOtp, verifyOtp, isDevMode, channel } from '../utils/twilio.js'
import { getOrCreateUser } from '../utils/users.js'
import { requireAuth, signToken } from '../middleware/auth.js'

const router = Router()

// Cap OTP requests so an attacker can't pump messages on someone else's number.
const sendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
})

const verifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
})

// POST /api/auth/send-otp { phone, country }
router.post('/send-otp', sendLimiter, async (req, res) => {
  const { phone, country } = req.body || {}
  const normalized = normalizePhone(phone, country)

  if (!normalized) {
    return res.status(400).json({ error: 'invalid_phone' })
  }

  try {
    const result = await sendOtp(normalized.e164)
    return res.json({
      ok: true,
      phone: normalized.e164,
      country: normalized.country,
      devMode: isDevMode,
      channel,
      status: result.status,
    })
  } catch (err) {
    console.error('send-otp failed:', err)
    return res.status(502).json({ error: 'send_failed', detail: err.message })
  }
})

// POST /api/auth/verify-otp { phone, country, code }
router.post('/verify-otp', verifyLimiter, async (req, res) => {
  const { phone, country, code } = req.body || {}
  const normalized = normalizePhone(phone, country)

  if (!normalized) {
    return res.status(400).json({ error: 'invalid_phone' })
  }
  if (!code || typeof code !== 'string' || !/^\d{4,8}$/.test(code)) {
    return res.status(400).json({ error: 'invalid_code' })
  }

  try {
    const approved = await verifyOtp(normalized.e164, code)
    if (!approved) {
      return res.status(401).json({ error: 'wrong_code' })
    }

    const user = getOrCreateUser(normalized.e164)
    const token = signToken({ sub: user.phone })

    return res.json({
      ok: true,
      token,
      user: { phone: user.phone, createdAt: user.createdAt },
    })
  } catch (err) {
    console.error('verify-otp failed:', err)
    return res.status(502).json({ error: 'verify_failed', detail: err.message })
  }
})

// GET /api/auth/me — returns the currently authenticated user.
router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: { phone: req.user.sub } })
})

export default router
