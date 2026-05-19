import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

// GET /api/profile — fetch (or auto-create) the seller's profile
router.get('/', requireAuth, async (req, res) => {
  const phone = req.user.sub

  let { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', phone)
    .single()

  // PGRST116 = row not found — create a default profile on first login
  if (error?.code === 'PGRST116') {
    const { data: created, error: ce } = await supabase
      .from('profiles')
      .insert({ phone, vendor_name: 'My Store', tax_rate: 0.13 })
      .select()
      .single()

    if (ce) return res.status(500).json({ error: 'profile_create_failed', detail: ce.message })
    return res.json({ profile: created })
  }

  if (error) return res.status(500).json({ error: 'profile_fetch_failed', detail: error.message })
  return res.json({ profile: data })
})

// PUT /api/profile — update vendor name and/or tax rate
router.put('/', requireAuth, async (req, res) => {
  const phone = req.user.sub
  const { vendor_name, tax_rate } = req.body || {}

  const updates = { updated_at: new Date().toISOString() }
  if (vendor_name !== undefined) updates.vendor_name = String(vendor_name).trim()
  if (tax_rate    !== undefined) updates.tax_rate    = parseFloat(tax_rate)

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ phone, ...updates }, { onConflict: 'phone' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: 'profile_update_failed', detail: error.message })
  return res.json({ profile: data })
})

export default router
