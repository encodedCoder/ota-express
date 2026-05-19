import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { normalizePhone } from '../utils/phone.js'
import { sendWhatsApp } from '../utils/twilio.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

const CAD = (n) => `$${Number(n).toFixed(2)}`

function fmtPhone(e164) {
  const d = e164.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('1')) {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  }
  return e164
}

function buildBillMessage({ sellerName, sellerPhone, buyerName, items, subtotal, taxRate, tax, grandTotal, amountPaid, balance, note }) {
  const taxPct   = Math.round(taxRate * 100)
  const date     = new Date().toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' })
  const itemLines = items
    .map(l => `• ${l.qty}${l.unit} ${l.name} — ${CAD(l.lineTotal)}`)
    .join('\n')

  const lines = [
    `🌿 *${sellerName}*`,
    `📞 ${fmtPhone(sellerPhone)}`,
    ``,
    `📅 ${date}`,
    ``,
    `*Receipt — ${buyerName}*`,
    ``,
    `────────────────────`,
    itemLines,
    `────────────────────`,
    `Subtotal:      ${CAD(subtotal)}`,
    `HST (${taxPct}%):       ${CAD(tax)}`,
    `*Total:        ${CAD(grandTotal)} CAD*`,
    `Paid now:      ${CAD(amountPaid)}`,
    `Balance:       ${CAD(balance)}`,
    `────────────────────`,
  ]

  if (note) lines.push(`📝 ${note}`)
  lines.push(``, `Thank you! 🙏`)

  return lines.join('\n')
}

// POST /api/messages/send-bill
router.post('/send-bill', requireAuth, async (req, res) => {
  const sellerPhone = req.user.sub  // E.164 from JWT

  const {
    to, toCountry,
    buyerName, items,
    subtotal, taxRate, tax, grandTotal,
    amountPaid, balance, note,
  } = req.body || {}

  const normalized = normalizePhone(to, toCountry || 'CA')
  if (!normalized) return res.status(400).json({ error: 'invalid_phone' })

  // Look up business name from the seller's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('vendor_name, business_name')
    .eq('phone', sellerPhone)
    .single()

  const sellerName = profile?.business_name?.trim() || profile?.vendor_name || 'OtaExpress'

  const body = buildBillMessage({
    sellerName, sellerPhone,
    buyerName, items,
    subtotal, taxRate, tax, grandTotal,
    amountPaid, balance, note,
  })

  try {
    const result = await sendWhatsApp(normalized.e164, body)
    return res.json({ ok: true, sid: result.sid })
  } catch (err) {
    console.error('send-bill failed:', err)
    return res.status(502).json({ error: 'send_failed', detail: err.message })
  }
})

// POST /api/messages/send-prices — send today's price list to a buyer
router.post('/send-prices', requireAuth, async (req, res) => {
  const sellerPhone = req.user.sub
  const { to, toCountry, buyerName, priceLines } = req.body || {}

  const normalized = normalizePhone(to, toCountry || 'CA')
  if (!normalized) return res.status(400).json({ error: 'invalid_phone' })

  const { data: profile } = await supabase
    .from('profiles')
    .select('vendor_name, business_name')
    .eq('phone', sellerPhone)
    .single()

  const sellerName = profile?.business_name?.trim() || profile?.vendor_name || 'OtaExpress'
  const date = new Date().toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' })

  const body = [
    `🌿 *${sellerName}*`,
    `📅 ${date}`,
    ``,
    `*Today's Prices*`,
    ``,
    priceLines,
    ``,
    `Reply to place your order! 🛒`,
  ].join('\n')

  try {
    const result = await sendWhatsApp(normalized.e164, body)
    return res.json({ ok: true, sid: result.sid })
  } catch (err) {
    console.error('send-prices failed:', err)
    return res.status(502).json({ error: 'send_failed', detail: err.message })
  }
})

export default router
