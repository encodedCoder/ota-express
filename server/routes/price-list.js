import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

const todayDate = () => new Date().toISOString().split('T')[0]

// GET /api/price-list — today's priced items for this seller
router.get('/', requireAuth, async (req, res) => {
  const phone = req.user.sub
  const date  = todayDate()

  const { data, error } = await supabase
    .from('price_list')
    .select('*')
    .eq('seller_phone', phone)
    .eq('date', date)

  if (error) return res.status(500).json({ error: 'fetch_failed', detail: error.message })

  // Map DB rows → shape the frontend expects
  const items = data.map(r => ({
    id:    r.product_id,
    name:  r.product_name,
    cat:   r.category,
    unit:  r.unit,
    price: parseFloat(r.price_per_unit),
  }))

  return res.json({ items })
})

// POST /api/price-list — add or update a price item for today
router.post('/', requireAuth, async (req, res) => {
  const phone = req.user.sub
  const date  = todayDate()
  const { id, name, cat, unit, price } = req.body || {}

  if (!id || !name || !price) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  // Delete any existing entry for this product today, then insert fresh
  await supabase
    .from('price_list')
    .delete()
    .eq('seller_phone', phone)
    .eq('product_id', id)
    .eq('date', date)

  const { data, error } = await supabase
    .from('price_list')
    .insert({
      product_id:    id,
      product_name:  name,
      category:      cat,
      unit,
      price_per_unit: price,
      seller_phone:  phone,
      date,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: 'upsert_failed', detail: error.message })
  return res.json({ ok: true, item: data })
})

// DELETE /api/price-list/:productId — remove a price item
router.delete('/:productId', requireAuth, async (req, res) => {
  const phone = req.user.sub
  const date  = todayDate()
  const { productId } = req.params

  const { error } = await supabase
    .from('price_list')
    .delete()
    .eq('seller_phone', phone)
    .eq('product_id', productId)
    .eq('date', date)

  if (error) return res.status(500).json({ error: 'delete_failed', detail: error.message })
  return res.json({ ok: true })
})

export default router
