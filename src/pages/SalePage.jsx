import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CAD, fmtPrice } from '../utils/format'

export default function SalePage() {
  const navigate = useNavigate()
  const { buyers, addBuyer, addSale, priceItems, settings } = useApp()

  const [buyerQuery,    setBuyerQuery]    = useState('')
  const [selectedBuyer, setSelectedBuyer] = useState(null)
  const [showDrop,      setShowDrop]      = useState(false)
  const [qtys,          setQtys]          = useState({})
  const [payMode,       setPayMode]       = useState(null)  // 'cash' | 'partial' | 'credit'
  const [partialAmt,    setPartialAmt]    = useState('')
  const [note,          setNote]          = useState('')
  const [done,          setDone]          = useState(null)

  const filteredBuyers = buyers.filter(b =>
    b.name.toLowerCase().includes(buyerQuery.toLowerCase())
  )

  const selectBuyer = (b) => { setSelectedBuyer(b); setBuyerQuery(b.name); setShowDrop(false) }

  const addNewBuyer = () => {
    if (!buyerQuery.trim()) return
    const b = addBuyer({ name: buyerQuery.trim(), phone: '' })
    selectBuyer(b)
  }

  const setQty = (id, val) => setQtys(prev => ({ ...prev, [id]: val }))
  const clearQty = (id) => setQtys(prev => { const n = { ...prev }; delete n[id]; return n })

  const saleLines = useMemo(() =>
    priceItems
      .map(p => ({ ...p, qty: parseFloat(qtys[p.id]) || 0 }))
      .filter(p => p.qty > 0)
      .map(p => ({ ...p, lineTotal: p.qty * p.price }))
  , [priceItems, qtys])

  const total = saleLines.reduce((a, l) => a + l.lineTotal, 0)

  const computedPaid = useMemo(() => {
    if (payMode === 'cash')    return total
    if (payMode === 'credit')  return 0
    if (payMode === 'partial') return Math.min(parseFloat(partialAmt) || 0, total)
    return 0
  }, [payMode, partialAmt, total])

  const credit = Math.max(0, total - computedPaid)

  const canSave = selectedBuyer && saleLines.length > 0 && payMode !== null
    && (payMode !== 'partial' || (parseFloat(partialAmt) > 0 && parseFloat(partialAmt) < total))

  const buildMsg = (buyer) => {
    const itemLines = saleLines
      .map(l => `• ${l.qty}${l.unit} ${l.name} — ${CAD(l.lineTotal)}`)
      .join('\n')
    return [
      `Hi ${buyer.name} 👋`,
      `Today you bought:`,
      itemLines,
      `Total: ${CAD(total)}`,
      `Paid: ${CAD(computedPaid)}`,
      `Balance: ${CAD(credit)}`,
      `— ${settings.vendorName}`,
    ].join('\n')
  }

  const handleSave = () => {
    if (!canSave) return
    addSale({
      buyerId:    selectedBuyer.id,
      buyerName:  selectedBuyer.name,
      items:      saleLines.map(l => ({ id: l.id, name: l.name, qty: l.qty, unit: l.unit, price: l.price })),
      total,
      amountPaid: computedPaid,
      note:       note.trim(),
    })
    if (selectedBuyer.phone) {
      const msg = encodeURIComponent(buildMsg(selectedBuyer))
      window.open(`https://wa.me/${selectedBuyer.phone.replace(/\D/g, '')}?text=${msg}`)
    }
    setDone({ buyer: selectedBuyer, total, credit, sentWA: !!selectedBuyer.phone })
  }

  const handleNewSale = () => {
    setDone(null); setSelectedBuyer(null); setBuyerQuery('')
    setQtys({}); setPayMode(null); setPartialAmt(''); setNote('')
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
          <p className="saved-sub">{done.buyer.name} — {CAD(done.total)}</p>
          {done.credit > 0 && <p className="saved-credit">Balance: {CAD(done.credit)}</p>}
          {done.sentWA && <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>WhatsApp receipt sent ✓</p>}
          <div className="saved-actions">
            <button className="btn btn--primary btn--full" style={{ fontSize: 17, padding: 16 }} onClick={handleNewSale}>
              New Sale
            </button>
            <button className="btn btn--ghost btn--full" onClick={() => navigate('/')}>Back to Home</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main form ────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header page-header--green">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back"><IconBack /></button>
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
                const q = qtys[p.id] ?? ''
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

        {/* Payment — only when items selected */}
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
                <span className="pay-mode-sub">{CAD(total)}</span>
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
                  <span>Total</span><strong>{CAD(total)}</strong>
                </div>
                <div className="pay-summary-row">
                  <span>Paid now</span><span>{CAD(computedPaid)}</span>
                </div>
                <div className={`pay-summary-row${credit > 0 ? ' pay-summary-row--owed' : ' pay-summary-row--clear'}`}>
                  <span>Balance</span><strong>{CAD(credit)}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Note */}
        <div className="form-section">
          <label className="form-label">Note <span className="form-label-opt">(optional)</span></label>
          <input
            className="form-input"
            placeholder="e.g. next week order"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <button
          className={`btn btn--primary btn--full${!canSave ? ' btn--disabled' : ''}`}
          onClick={handleSave}
          disabled={!canSave}
          style={{ fontSize: 17, padding: 16 }}
        >
          {selectedBuyer?.phone
            ? `Save & Send Receipt · ${CAD(total)}`
            : `Save Sale · ${CAD(total)}`}
        </button>
        {selectedBuyer?.phone && canSave && (
          <p className="pay-wa-hint">Opens WhatsApp with receipt automatically</p>
        )}
      </div>
    </div>
  )
}

function IconBack() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
}
