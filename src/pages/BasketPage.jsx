import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { fmtPrice } from '../utils/format'
import { PRODUCE, VEGETABLES, FRUITS, UNITS, findProduce } from '../data/produce'
import BottomSheet from '../components/BottomSheet'

export default function BasketPage() {
  const { priceItems, upsertPriceItem, removePriceItem } = useApp()

  const [tab, setTab]         = useState('veg')
  const [search, setSearch]   = useState('')
  const [popup, setPopup]     = useState(null)   // ProduceItem being edited
  const [popupPrice, setPopupPrice] = useState('')
  const [popupUnit, setPopupUnit]   = useState('kg')

  const priceMap = useMemo(() => {
    const m = {}
    for (const p of priceItems) m[p.id] = p
    return m
  }, [priceItems])

  const catalog    = tab === 'veg' ? VEGETABLES : FRUITS
  const isSearching = search.trim().length > 0

  const displayList = useMemo(() => {
    if (!isSearching) return catalog
    const q = search.toLowerCase()
    return PRODUCE.filter(p => p.name.toLowerCase().includes(q))
  }, [catalog, isSearching, search])

  const openPopup = (item) => {
    const existing = priceMap[item.id]
    setPopup(item)
    setPopupPrice(existing ? String(existing.price) : '')
    setPopupUnit(existing ? existing.unit : item.unit)
  }

  const closePopup = () => setPopup(null)

  const handleSave = () => {
    const p = parseFloat(popupPrice)
    if (!p || p <= 0) return
    upsertPriceItem({ id: popup.id, name: popup.name, cat: popup.cat, unit: popupUnit, price: p })
    closePopup()
  }

  const handleRemove = () => {
    removePriceItem(popup.id)
    closePopup()
  }

  const existingInPopup = popup ? priceMap[popup.id] : null
  const validPrice      = parseFloat(popupPrice) > 0

  return (
    <div className="page">
      <div className="page-header page-header--green">
        <h2 className="page-title">Today's Basket</h2>
        {priceItems.length > 0 && (
          <span className="pl-count-badge">{priceItems.length} item{priceItems.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="pl-body">

        {/* TODAY'S BASKET chips */}
        {priceItems.length > 0 && (
          <section className="pl-basket-section">
            <p className="pl-basket-label">In basket — tap to edit</p>
            <div className="pl-chips">
              {priceItems.map(p => (
                <button
                  key={p.id}
                  className="pl-chip"
                  onClick={() => openPopup(findProduce(p.id) || { id: p.id, name: p.name, cat: p.cat, unit: p.unit })}
                >
                  <span className="pl-chip-name">{p.name}</span>
                  <span className="pl-chip-price">{fmtPrice(p.price)}/{p.unit}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Search */}
        <div className="search-wrap">
          <IconSearch />
          <input
            className="search-input"
            placeholder="Search produce…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}><IconX /></button>}
        </div>

        {/* Tabs */}
        {!isSearching && (
          <div className="pl-tabs">
            <button
              className={`pl-tab${tab === 'veg' ? ' pl-tab--active' : ''}`}
              onClick={() => setTab('veg')}
            >
              🥦 Vegetables
            </button>
            <button
              className={`pl-tab${tab === 'fruit' ? ' pl-tab--active' : ''}`}
              onClick={() => setTab('fruit')}
            >
              🍎 Fruits
            </button>
          </div>
        )}

        {isSearching && (
          <p className="pl-search-hint">{displayList.length} result{displayList.length !== 1 ? 's' : ''}</p>
        )}

        {/* Produce grid */}
        <div className="pl-grid">
          {displayList.map(item => {
            const priced = priceMap[item.id]
            return (
              <button
                key={item.id}
                className={`pl-item${priced ? ' pl-item--priced' : ''}`}
                onClick={() => openPopup(item)}
              >
                {priced && <span className="pl-item-check">✓</span>}
                <span className="pl-item-name">{item.name}</span>
                {priced
                  ? <span className="pl-item-price">{fmtPrice(priced.price)}<span className="pl-item-price-unit">/{priced.unit}</span></span>
                  : <span className="pl-item-unit">{item.unit}</span>
                }
              </button>
            )
          })}
        </div>
      </div>

      {/* Price popup */}
      <BottomSheet open={!!popup} onClose={closePopup} title={popup?.name}>
        {popup && (
          <>
            <p className="sheet-sub">Set today's price per unit</p>

            <div className="pl-unit-pills">
              {UNITS.map(u => (
                <button
                  key={u}
                  className={`pl-unit-pill${popupUnit === u ? ' pl-unit-pill--active' : ''}`}
                  onClick={() => setPopupUnit(u)}
                >
                  {u}
                </button>
              ))}
            </div>

            <div className="pl-price-row">
              <span className="pl-price-dollar">$</span>
              <input
                className="pl-price-input"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                autoFocus
                value={popupPrice}
                onChange={e => setPopupPrice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <span className="pl-price-slash">/{popupUnit}</span>
            </div>

            <button
              className={`btn btn--primary btn--full${!validPrice ? ' btn--disabled' : ''}`}
              onClick={handleSave}
              disabled={!validPrice}
            >
              {existingInPopup ? 'Update Price' : '+ Add to Basket'}
            </button>

            {existingInPopup && (
              <button
                className="btn btn--danger-ghost btn--full"
                style={{ marginTop: 10 }}
                onClick={handleRemove}
              >
                Remove from basket
              </button>
            )}
          </>
        )}
      </BottomSheet>
    </div>
  )
}

function IconSearch() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
}
function IconX() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}
