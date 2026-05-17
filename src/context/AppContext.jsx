import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { storage } from '../utils/storage'
import { newId } from '../utils/ids'
import { isToday } from '../utils/format'

const Ctx = createContext(null)

const KEYS = {
  settings:  'ota_settings',
  buyers:    'ota_buyers',
  sales:     'ota_sales',
  purchases: 'ota_purchases',
  payments:  'ota_payments',
}

const todayPriceKey = () => `ota_prices_${new Date().toISOString().split('T')[0]}`

export function AppProvider({ children }) {
  const [settings,   setSettingsRaw]   = useState(() => storage.get(KEYS.settings,  { vendorName: 'Ahmed' }))
  const [buyers,     setBuyersRaw]     = useState(() => storage.get(KEYS.buyers,    []))
  const [sales,      setSalesRaw]      = useState(() => storage.get(KEYS.sales,     []))
  const [purchases,  setPurchasesRaw]  = useState(() => storage.get(KEYS.purchases, []))
  const [payments,   setPaymentsRaw]   = useState(() => storage.get(KEYS.payments,  []))
  const [priceItems, setPriceItemsRaw] = useState(() => storage.get(todayPriceKey(), []))

  const makeSetter = (key, rawSetter) => (updater) =>
    rawSetter(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      storage.set(key, next)
      return next
    })

  const setBuyers    = useCallback(makeSetter(KEYS.buyers,    setBuyersRaw),    [])
  const setSales     = useCallback(makeSetter(KEYS.sales,     setSalesRaw),     [])
  const setPurchases = useCallback(makeSetter(KEYS.purchases, setPurchasesRaw), [])
  const setPayments  = useCallback(makeSetter(KEYS.payments,  setPaymentsRaw),  [])
  const setSettings  = useCallback(makeSetter(KEYS.settings,  setSettingsRaw),  [])

  // ── Buyers ──────────────────────────────────────────────
  const addBuyer = useCallback((data) => {
    const b = { id: newId(), ...data, createdAt: new Date().toISOString() }
    setBuyers(prev => [...prev, b])
    return b
  }, [setBuyers])

  const updateBuyer = useCallback((id, data) =>
    setBuyers(prev => prev.map(b => b.id === id ? { ...b, ...data } : b))
  , [setBuyers])

  const deleteBuyer = useCallback((id) =>
    setBuyers(prev => prev.filter(b => b.id !== id))
  , [setBuyers])

  // ── Sales ────────────────────────────────────────────────
  const addSale = useCallback((data) => {
    const s = { id: newId(), ...data, createdAt: new Date().toISOString() }
    setSales(prev => [s, ...prev])
    return s
  }, [setSales])

  const deleteSale = useCallback((id) =>
    setSales(prev => prev.filter(s => s.id !== id))
  , [setSales])

  // ── Purchases ────────────────────────────────────────────
  const addPurchase = useCallback((data) => {
    const p = { id: newId(), ...data, createdAt: new Date().toISOString() }
    setPurchases(prev => [p, ...prev])
    return p
  }, [setPurchases])

  const markPurchasePaid = useCallback((id) =>
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, amountPaid: p.total } : p))
  , [setPurchases])

  const deletePurchase = useCallback((id) =>
    setPurchases(prev => prev.filter(p => p.id !== id))
  , [setPurchases])

  // ── Price List ───────────────────────────────────────────
  const upsertPriceItem = useCallback((item) => {
    const key = todayPriceKey()
    setPriceItemsRaw(prev => {
      const idx = prev.findIndex(p => p.id === item.id)
      const next = idx >= 0
        ? prev.map((p, i) => i === idx ? item : p)
        : [...prev, item]
      storage.set(key, next)
      return next
    })
  }, [])

  const removePriceItem = useCallback((id) => {
    const key = todayPriceKey()
    setPriceItemsRaw(prev => {
      const next = prev.filter(p => p.id !== id)
      storage.set(key, next)
      return next
    })
  }, [])

  // ── Payments ─────────────────────────────────────────────
  const addPayment = useCallback((data) => {
    const p = { id: newId(), ...data, createdAt: new Date().toISOString() }
    setPayments(prev => [p, ...prev])
    return p
  }, [setPayments])

  // ── Derived ──────────────────────────────────────────────
  const buyerBalance = useCallback((buyerId) => {
    const credit = sales
      .filter(s => s.buyerId === buyerId)
      .reduce((a, s) => a + (s.total - s.amountPaid), 0)
    const paid = payments
      .filter(p => p.buyerId === buyerId)
      .reduce((a, p) => a + p.amount, 0)
    return credit - paid
  }, [sales, payments])

  const stats = useMemo(() => {
    const balMap = {}
    for (const s of sales)    balMap[s.buyerId] = (balMap[s.buyerId] || 0) + (s.total - s.amountPaid)
    for (const p of payments) balMap[p.buyerId] = (balMap[p.buyerId] || 0) - p.amount

    const totalCustomersOwe  = Object.values(balMap).reduce((a, v) => a + Math.max(0, v), 0)
    const totalSuppliersOwed = purchases.reduce((a, p) => a + (p.total - p.amountPaid), 0)

    const todaySalesList = sales.filter(s => isToday(s.createdAt))
    const todayRevenue   = todaySalesList.reduce((a, s) => a + s.total, 0)
    const todayCosts     = purchases.filter(p => isToday(p.createdAt)).reduce((a, p) => a + p.total, 0)
    const pendingInvoices = Object.values(balMap).filter(v => v > 0).length

    return {
      totalCustomersOwe,
      totalSuppliersOwed,
      pendingInvoices,
      todayRevenue,
      todayCosts,
      todayProfit:    todayRevenue - todayCosts,
      todayDeliveries: todaySalesList.length,
    }
  }, [sales, purchases, payments])

  const todayActivity = useMemo(() => {
    const list = [
      ...sales.filter(s => isToday(s.createdAt)).map(s => ({ ...s, kind: 'sale' })),
      ...purchases.filter(p => isToday(p.createdAt)).map(p => ({ ...p, kind: 'purchase' })),
      ...payments.filter(p => isToday(p.createdAt)).map(p => ({ ...p, kind: 'payment' })),
    ]
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [sales, purchases, payments])

  return (
    <Ctx.Provider value={{
      settings, setSettings,
      buyers, addBuyer, updateBuyer, deleteBuyer,
      sales, addSale, deleteSale,
      purchases, addPurchase, markPurchasePaid, deletePurchase,
      payments, addPayment,
      priceItems, upsertPriceItem, removePriceItem,
      buyerBalance, stats, todayActivity,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
