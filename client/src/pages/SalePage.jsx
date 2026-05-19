import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'
import { CAD, fmtPrice } from '../utils/format'

export default function SalePage() {
  const navigate = useNavigate()
  const { buyers, addBuyer, updateBuyer, addSale, priceItems } = useApp()
  const { user, profile } = useAuth()

  const TAX_RATE = profile?.tax_rate ?? 0.13

  const [buyerQuery,     setBuyerQuery]     = useState('')
  const [selectedBuyer,  setSelectedBuyer]  = useState(null)
  const [buyerPhone,     setBuyerPhone]     = useState('')
  const [phoneCountry,   setPhoneCountry]   = useState('CA') // 'CA' | 'IN'
  const [showDrop,       setShowDrop]       = useState(false)
  const [qtys,           setQtys]           = useState({})
  const [payMode,        setPayMode]        = useState(null)  // 'cash' | 'partial' | 'credit'
  const [partialAmt,     setPartialAmt]     = useState('')
  const [note,           setNote]           = useState('')
  const [done,           setDone]           = useState(null)
  const [sending,        setSending]        = useState(false)
  const [sendError,      setSendError]      = useState('')

  const filteredBuyers = buyers.filter(b =>
    b.name.toLowerCase().includes(buyerQuery.toLowerCase())
  )

  // Buyers who have phones — shown as quick-pick chips
  const recentBuyersWithPhone = buyers
    .filter(b => b.phone && b.phone.trim())
    .slice(-5)
    .reverse()

  const selectBuyer = (b) => {
    setSelectedBuyer(b)
    setBuyerQuery(b.name)
    // Pre-fill phone and detect country from saved number
    const digits = (b.phone || '').replace(/\D/g, '')
    if (digits.startsWith('91') && digits.length === 12) {
      setPhoneCountry('IN')
      setBuyerPhone(digits.slice(2))
    } else {
      setPhoneCountry('CA')
      setBuyerPhone(digits.slice(-10))
    }
    setShowDrop(false)
  }

  const addNewBuyer = () => {
    if (!buyerQuery.trim()) return
    const b = addBuyer({ name: buyerQuery.trim(), phone: '' })
    selectBuyer(b)
  }

  const setQty   = (id, val) => setQtys(prev => ({ ...prev, [id]: val }))
  const clearQty = (id)      => setQtys(prev => { const n = { ...prev }; delete n[id]; return n })

  const saleLines = useMemo(() =>
    priceItems
      .map(p => ({ ...p, qty: parseFloat(qtys[p.id]) || 0 }))
      .filter(p => p.qty > 0)
      .map(p => ({ ...p, lineTotal: p.qty * p.price }))
  , [priceItems, qtys])

  const subtotal   = saleLines.reduce((a, l) => a + l.lineTotal, 0)
  const tax        = Math.round(subtotal * TAX_RATE * 100) / 100
  const grandTotal = subtotal + tax

  const computedPaid = useMemo(() => {
    if (payMode === 'cash')    return grandTotal
    if (payMode === 'credit')  return 0
    if (payMode === 'partial') return Math.min(parseFloat(partialAmt) || 0, grandTotal)
    return 0
  }, [payMode, partialAmt, grandTotal])

  const balance = Math.max(0, grandTotal - computedPaid)

  const COUNTRIES = {
    CA: { dial: '+1',  digits: 10, placeholder: '555 123 4567', flag: '🇨🇦' },
    IN: { dial: '+91', digits: 10, placeholder: '98765 43210',  flag: '🇮🇳' },
  }
  const phoneDigits = buyerPhone.replace(/\D/g, '')
  const hasValidPhone = phoneDigits.length === COUNTRIES[phoneCountry].digits

  const canSave = selectedBuyer && saleLines.length > 0 && payMode !== null
    && (payMode !== 'partial' || (parseFloat(partialAmt) > 0 && parseFloat(partialAmt) < grandTotal))

  const handleSave = async () => {
    if (!canSave || sending) return
    setSendError('')
    setSending(true)

    // Save buyer phone if it changed
    if (selectedBuyer && buyerPhone !== selectedBuyer.phone) {
      const countryCode = phoneCountry === 'IN' ? '91' : '1'
      updateBuyer(selectedBuyer.id, { phone: phoneDigits ? `+${countryCode}${phoneDigits}` : '' })
    }

    // Record the sale
    addSale({
      buyerId:    selectedBuyer.id,
      buyerName:  selectedBuyer.name,
      items:      saleLines.map(l => ({ id: l.id, name: l.name, qty: l.qty, unit: l.unit, price: l.price })),
      subtotal,
      tax,
      total:      grandTotal,
      amountPaid: computedPaid,
      note:       note.trim(),
      sellerPhone: user?.phone,
    })

    // Send WhatsApp bill if phone is provided
    let sentWA = false
    if (hasValidPhone) {
      try {
        await api('/messages/send-bill', {
          method: 'POST',
          auth: true,
          body: {
            to:          phoneDigits,
            toCountry:   phoneCountry,
            buyerName:   selectedBuyer.name,
            items:       saleLines.map(l => ({ name: l.name, qty: l.qty, unit: l.unit, lineTotal: l.lineTotal })),
            subtotal,
            taxRate:     TAX_RATE,
            tax,
            grandTotal,
            amountPaid:  computedPaid,
            balance,
            note:        note.trim(),
          },
        })
        sentWA = true
      } catch (err) {
        setSendError('Sale saved, but WhatsApp failed: ' + (err.detail || err.message))
      }
    }

    setSending(false)
    setDone({ buyer: selectedBuyer, grandTotal, balance, sentWA })
  }

  const handleNewSale = () => {
    setDone(null); setSelectedBuyer(null); setBuyerQuery(''); setBuyerPhone(''); setPhoneCountry('CA')
    setQtys({}); setPayMode(null); setPartialAmt(''); setNote(''); setSendError('')
  }

  // ── Done screen ──────────────────────────────────────────
  if (done) {
    return (
      <div className="page">
        <div className="page-header page-header--green">
          <div style={{ width: 38 }} />
          <h2 className="page-title">Sale Saved</h2>
          <div style={{ width: 38 }} />
        </div>
        <div className="saved-screen">
          <div className="saved-icon">✓</div>
          <h3 className="saved-title">Done!</h3>
          <p className="saved-sub">{done.buyer.name} — {CAD(done.grandTotal)}</p>
          {done.balance > 0 && <p className="saved-credit">Balance: {CAD(done.balance)}</p>}
          {done.sentWA && (
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
              WhatsApp receipt sent ✓
            </p>
          )}
          <div className="saved-actions">
            <button
              className="btn btn--primary btn--full"
              style={{ fontSize: 17, padding: 16 }}
              onClick={handleNewSale}
            >
              New Sale
            </button>
            <button className="btn btn--ghost btn--full" onClick={() => navigate('/')}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main form ────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header page-header--green">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <IconBack />
        </button>
        <h2 className="page-title">New Sale</h2>
        <div style={{ width: 38 }} />
      </div>

      <div className="basket-body">

        {/* Buyer */}
        <div className="form-section">
          <label className="form-label">Customer</label>
          <div className="buyer-search-wrap">
            <input
              className="form-input"
              placeholder="Search or type buyer name…"
              value={buyerQuery}
              autoComplete="off"
              onChange={e => { setBuyerQuery(e.target.value); setSelectedBuyer(null); setShowDrop(true) }}
              onFocus={() => setShowDrop(true)}
            />
            {showDrop && buyerQuery.length > 0 && (
              <div className="buyer-dropdown">
                {filteredBuyers.map(b => (
                  <button key={b.id} className="buyer-opt" onMouseDown={() => selectBuyer(b)}>
                    <span>{b.name}</span>
                    {b.phone && <span className="buyer-opt-phone">{b.phone}</span>}
                  </button>
                ))}
                {!filteredBuyers.some(b => b.name.toLowerCase() === buyerQuery.toLowerCase()) && (
                  <button className="buyer-opt buyer-opt--add" onMouseDown={addNewBuyer}>
                    + Add "{buyerQuery}" as new buyer
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Recent buyers quick-pick */}
          {!selectedBuyer && recentBuyersWithPhone.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Recent</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {recentBuyersWithPhone.map(b => (
                  <button
                    key={b.id}
                    onMouseDown={() => selectBuyer(b)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                      border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer',
                    }}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer WhatsApp number */}
          {selectedBuyer && (
            <div style={{ marginTop: 10 }}>
              <label className="form-label">
                Customer WhatsApp number
                <span className="form-label-opt"> (optional — to send receipt)</span>
              </label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                {Object.entries(COUNTRIES).map(([code, c]) => (
                  <button
                    key={code}
                    onClick={() => { setPhoneCountry(code); setBuyerPhone('') }}
                    style={{
                      padding: '4px 10px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                      border: '1.5px solid',
                      borderColor: phoneCountry === code ? 'var(--green)' : 'var(--border)',
                      background: phoneCountry === code ? 'var(--green-light, #f0faf0)' : 'var(--surface)',
                      fontWeight: phoneCountry === code ? 600 : 400,
                    }}
                  >
                    {c.flag} {c.dial}
                  </button>
                ))}
              </div>
              <div className="login-phone-row">
                <span className="login-dial">{COUNTRIES[phoneCountry].dial}</span>
                <input
                  className="form-input login-phone-input"
                  type="tel"
                  inputMode="numeric"
                  placeholder={COUNTRIES[phoneCountry].placeholder}
                  value={buyerPhone}
                  onChange={e => setBuyerPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {buyerPhone && !hasValidPhone && (
                <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                  Enter {COUNTRIES[phoneCountry].digits} digits
                </p>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        {priceItems.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            Today's basket is empty.<br />
            Go to the <strong>Basket</strong> tab to set your prices first.
          </div>
        ) : (
          <div className="form-section">
            <label className="form-label">Items sold — enter quantity</label>
            <div className="sl-list">
              {priceItems.map(p => {
                const q  = qtys[p.id] ?? ''
                const lt = (parseFloat(q) || 0) * p.price
                return (
                  <div key={p.id} className={`sl-row${q ? ' sl-row--active' : ''}`}>
                    <div className="sl-left">
                      <span className="sl-name">{p.name}</span>
                      <span className="sl-rate">{fmtPrice(p.price)}/{p.unit}</span>
                    </div>
                    <div className="sl-right">
                      <input
                        className="sl-qty"
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        min="0"
                        value={q}
                        onChange={e => {
                          const v = e.target.value
                          if (!v || v === '0') clearQty(p.id)
                          else setQty(p.id, v)
                        }}
                      />
                      <span className="sl-unit">{p.unit}</span>
                      {lt > 0 && <span className="sl-line-total">{CAD(lt)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Payment */}
        {saleLines.length > 0 && (
          <div className="form-section">
            <label className="form-label">Payment</label>

            <div className="pay-mode-grid">
              <button
                className={`pay-mode-btn${payMode === 'credit' ? ' pay-mode-btn--active pay-mode-btn--credit' : ''}`}
                onClick={() => { setPayMode('credit'); setPartialAmt('') }}
              >
                <span className="pay-mode-emoji">📋</span>
                <span className="pay-mode-label">All credit</span>
                <span className="pay-mode-sub">Pay later</span>
              </button>
              <button
                className={`pay-mode-btn${payMode === 'partial' ? ' pay-mode-btn--active pay-mode-btn--partial' : ''}`}
                onClick={() => setPayMode('partial')}
              >
                <span className="pay-mode-emoji">💵</span>
                <span className="pay-mode-label">Partial</span>
                <span className="pay-mode-sub">Part now</span>
              </button>
              <button
                className={`pay-mode-btn${payMode === 'cash' ? ' pay-mode-btn--active pay-mode-btn--cash' : ''}`}
                onClick={() => { setPayMode('cash'); setPartialAmt('') }}
              >
                <span className="pay-mode-emoji">✅</span>
                <span className="pay-mode-label">Full cash</span>
                <span className="pay-mode-sub">{CAD(grandTotal)}</span>
              </button>
            </div>

            {payMode === 'partial' && (
              <div className="pay-partial-wrap">
                <span className="pay-partial-dollar">$</span>
                <input
                  className="pay-partial-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="Amount received"
                  autoFocus
                  value={partialAmt}
                  onChange={e => setPartialAmt(e.target.value)}
                />
              </div>
            )}

            {payMode && (
              <div className="pay-summary">
                <div className="pay-summary-row">
                  <span>Subtotal</span><span>{CAD(subtotal)}</span>
                </div>
                <div className="pay-summary-row">
                  <span>HST ({Math.round(TAX_RATE * 100)}%)</span><span>{CAD(tax)}</span>
                </div>
                <div className="pay-summary-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                  <span>Total</span><strong>{CAD(grandTotal)}</strong>
                </div>
                <div className="pay-summary-row">
                  <span>Paid now</span><span>{CAD(computedPaid)}</span>
                </div>
                <div className={`pay-summary-row${balance > 0 ? ' pay-summary-row--owed' : ' pay-summary-row--clear'}`}>
                  <span>Balance</span><strong>{CAD(balance)}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Note */}
        <div className="form-section">
          <label className="form-label">
            Note <span className="form-label-opt">(optional)</span>
          </label>
          <input
            className="form-input"
            placeholder="e.g. next week order"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {sendError && (
          <p style={{ fontSize: 13, color: 'var(--danger)', padding: '0 16px 8px' }}>
            {sendError}
          </p>
        )}

        <button
          className={`btn btn--primary btn--full${(!canSave || sending) ? ' btn--disabled' : ''}`}
          onClick={handleSave}
          disabled={!canSave || sending}
          style={{ fontSize: 17, padding: 16 }}
        >
          {sending
            ? 'Sending…'
            : hasValidPhone
              ? `Complete Purchase · ${CAD(grandTotal)}`
              : `Save Sale · ${CAD(grandTotal)}`}
        </button>

        {hasValidPhone && canSave && (
          <p className="pay-wa-hint">Will send WhatsApp receipt automatically</p>
        )}
      </div>
    </div>
  )
}

function IconBack() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
