import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { CAD, fmtDate, fmtTime } from '../utils/format'
import BottomSheet from '../components/BottomSheet'

export default function BuyersPage() {
  const { buyers, addBuyer, updateBuyer, deleteBuyer, buyerBalance, sales, payments, addPayment } = useApp()

  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [detailBuyer, setDetailBuyer] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')

  const sorted = useMemo(() =>
    buyers
      .filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
      .map(b => ({ ...b, balance: buyerBalance(b.id) }))
      .sort((a, b) => b.balance - a.balance)
  , [buyers, buyerBalance, search])

  const buyerHistory = useMemo(() => {
    if (!detailBuyer) return []
    const s = sales.filter(x => x.buyerId === detailBuyer.id).map(x => ({ ...x, kind: 'sale' }))
    const p = payments.filter(x => x.buyerId === detailBuyer.id).map(x => ({ ...x, kind: 'payment' }))
    return [...s, ...p].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [detailBuyer, sales, payments])

  const detailBalance = detailBuyer ? buyerBalance(detailBuyer.id) : 0

  const handleAdd = () => {
    if (!newName.trim()) return
    addBuyer({ name: newName.trim(), phone: newPhone.trim() })
    setNewName(''); setNewPhone(''); setAddOpen(false)
  }

  const handleEdit = () => {
    if (!editName.trim()) return
    updateBuyer(detailBuyer.id, { name: editName.trim(), phone: editPhone.trim() })
    setDetailBuyer(b => ({ ...b, name: editName.trim(), phone: editPhone.trim() }))
    setEditOpen(false)
  }

  const handlePay = () => {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) return
    addPayment({ buyerId: detailBuyer.id, buyerName: detailBuyer.name, amount: amt, note: payNote.trim() })
    setPayAmount(''); setPayNote(''); setPayOpen(false)
  }

  const openDetail = (b) => {
    setDetailBuyer(b)
    setEditName(b.name)
    setEditPhone(b.phone || '')
  }

  const handleDelete = () => {
    if (!confirm(`Delete ${detailBuyer.name}? This won't delete their transaction history.`)) return
    deleteBuyer(detailBuyer.id)
    setDetailBuyer(null)
  }

  return (
    <div className="page">
      <div className="page-header page-header--green">
        <h2 className="page-title">Buyers</h2>
        <button className="icon-btn" onClick={() => setAddOpen(true)} aria-label="Add buyer">
          <IconPlus />
        </button>
      </div>

      <div className="page-body">
        <div className="search-wrap">
          <IconSearch />
          <input
            className="search-input"
            placeholder="Search buyers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}><IconX /></button>}
        </div>

        {sorted.length === 0
          ? <p className="empty-state">{search ? 'No buyers found.' : 'No buyers yet.\nTap + to add your first buyer.'}</p>
          : (
            <div className="buyer-list">
              {sorted.map(b => (
                <button key={b.id} className="buyer-card" onClick={() => openDetail(b)}>
                  <div className="buyer-avatar">{b.name[0].toUpperCase()}</div>
                  <div className="buyer-info">
                    <span className="buyer-name">{b.name}</span>
                    {b.phone && <span className="buyer-phone">{b.phone}</span>}
                  </div>
                  <div className={`buyer-balance-badge ${b.balance > 0 ? 'buyer-balance-badge--owed' : 'buyer-balance-badge--clear'}`}>
                    {b.balance > 0 ? CAD(b.balance) : 'Settled'}
                  </div>
                  <IconChevron />
                </button>
              ))}
            </div>
          )
        }
      </div>

      {/* Add buyer sheet */}
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Buyer">
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" placeholder="Buyer name" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Phone <span className="form-label-opt">(for WhatsApp)</span></label>
          <input className="form-input" placeholder="+1 416 000 0000" type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
        </div>
        <button className="btn btn--primary btn--full" onClick={handleAdd}>Add Buyer</button>
      </BottomSheet>

      {/* Buyer detail sheet */}
      <BottomSheet open={!!detailBuyer} onClose={() => setDetailBuyer(null)} title={detailBuyer?.name}>
        {detailBuyer && (
          <>
            <div className="detail-balance-row">
              <div>
                <p className="detail-balance-label">Outstanding balance</p>
                <p className={`detail-balance-value ${detailBalance > 0 ? 'detail-balance-value--owed' : 'detail-balance-value--clear'}`}>
                  {detailBalance > 0 ? CAD(detailBalance) : 'Settled ✓'}
                </p>
              </div>
              {detailBuyer.phone && (
                <a
                  className="btn btn--wa"
                  href={`https://wa.me/${detailBuyer.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconWA /> WhatsApp
                </a>
              )}
            </div>

            <div className="detail-actions">
              {detailBalance > 0 && (
                <button className="btn btn--primary" onClick={() => setPayOpen(true)}>
                  Record Payment
                </button>
              )}
              <button className="btn btn--outline" onClick={() => setEditOpen(true)}>Edit</button>
              <button className="btn btn--danger-ghost" onClick={handleDelete}>Delete</button>
            </div>

            {buyerHistory.length > 0 && (
              <div className="detail-history">
                <p className="detail-history-title">History</p>
                {buyerHistory.map(item => (
                  <div key={item.id} className={`history-row history-row--${item.kind}`}>
                    <div className="history-icon">{item.kind === 'payment' ? <IconCash /> : <IconReceipt />}</div>
                    <div className="history-body">
                      <div className="history-top">
                        <span className="history-label">
                          {item.kind === 'sale' ? item.items.map(i => i.name).join(', ') : (item.note || 'Payment received')}
                        </span>
                        <span className={`history-amount history-amount--${item.kind}`}>
                          {item.kind === 'payment' ? `-${CAD(item.amount)}` : `+${CAD(item.total)}`}
                        </span>
                      </div>
                      <span className="history-date">{fmtDate(item.createdAt)} · {fmtTime(item.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </BottomSheet>

      {/* Record payment sheet */}
      <BottomSheet open={payOpen} onClose={() => setPayOpen(false)} title={`Payment from ${detailBuyer?.name}`}>
        <p className="sheet-sub">Balance: <strong>{CAD(detailBalance)}</strong></p>
        <div className="form-group">
          <label className="form-label">Amount received</label>
          <input
            className="form-input form-input--large"
            type="number"
            inputMode="decimal"
            placeholder="0"
            autoFocus
            value={payAmount}
            onChange={e => setPayAmount(e.target.value)}
          />
        </div>
        <button className="quick-btn" onClick={() => setPayAmount(String(Math.max(0, detailBalance)))}>
          Full balance ({CAD(Math.max(0, detailBalance))})
        </button>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Note <span className="form-label-opt">(optional)</span></label>
          <input className="form-input" placeholder="e.g. Cash payment" value={payNote} onChange={e => setPayNote(e.target.value)} />
        </div>
        <button className="btn btn--primary btn--full" onClick={handlePay} style={{ marginTop: 8 }}>
          Confirm Payment
        </button>
      </BottomSheet>

      {/* Edit buyer sheet */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Buyer">
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
        </div>
        <button className="btn btn--primary btn--full" onClick={handleEdit}>Save Changes</button>
      </BottomSheet>
    </div>
  )
}

function IconPlus() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}
function IconSearch() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
}
function IconX() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}
function IconChevron() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
}
function IconCash() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
}
function IconReceipt() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
}
function IconWA() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L.073 23.927l6.244-1.636A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.052-1.393l-.361-.214-3.757.985.999-3.671-.236-.377A9.818 9.818 0 1112 21.818z"/></svg>
}
