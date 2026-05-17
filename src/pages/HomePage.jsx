import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CAD, fmtTime, getGreeting, getDate } from '../utils/format'

export default function HomePage() {
  const { settings, stats, todayActivity, priceItems } = useApp()
  const navigate = useNavigate()

  function sendTodaysPrices() {
    const lines = priceItems.length > 0
      ? priceItems.map(p => `• ${p.name} — $${p.price}/${p.unit}`).join('\n')
      : '(no prices set yet — go to Basket tab first)'
    const msg = encodeURIComponent(
      `📋 Today's prices from ${settings.vendorName}:\n\n${lines}\n\nReply to order! 🥬`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div className="page">
      {/* Solid green header */}
      <div className="home-header">
        <div className="home-header-row">
          <div className="brand">
            <span className="brand-leaf">🥬</span>
            <div>
              <h1 className="brand-name">OtaExpress</h1>
              <p className="brand-tag">Deliver. Track. Get Paid.</p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => navigate('/more')} aria-label="Settings">
            <IconSettings />
          </button>
        </div>
        <div className="greeting">
          <p className="greeting-date">{getDate()}</p>
          <p className="greeting-hello">{getGreeting()}, <strong>{settings.vendorName}</strong></p>
        </div>
      </div>

      <main className="content home-content">
        {/* Primary — Total owed to me */}
        <div className="home-primary-card" onClick={() => navigate('/buyers')}>
          <p className="home-primary-label">Total owed to me</p>
          <p className="home-primary-value">{CAD(stats.totalCustomersOwe)}</p>
          <p className="home-primary-sub">
            {stats.pendingInvoices} pending invoice{stats.pendingInvoices !== 1 ? 's' : ''} · tap to view buyers
          </p>
        </div>

        {/* Today's sales + profit */}
        <div className="home-secondary-row">
          <div className="home-secondary-card home-secondary-card--blue" onClick={() => navigate('/basket')}>
            <p className="home-secondary-label">Today's sales</p>
            <p className="home-secondary-value">{CAD(stats.todayRevenue)}</p>
            <p className="home-secondary-sub">{stats.todayDeliveries} deliver{stats.todayDeliveries !== 1 ? 'ies' : 'y'}</p>
          </div>
          <div className="home-secondary-card home-secondary-card--teal">
            <p className="home-secondary-label">Today's profit</p>
            <p className="home-secondary-value">{CAD(stats.todayProfit)}</p>
            <p className="home-secondary-sub">sales − costs</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="home-actions">
          <button className="home-action-btn home-action-btn--wa" onClick={sendTodaysPrices}>
            <IconWhatsApp />
            Send Today's Prices
          </button>
          <button className="home-action-btn home-action-btn--primary" onClick={() => navigate('/sale')}>
            <IconPlus />
            New Sale
          </button>
        </div>

        {/* Activity feed */}
        <section className="activity-section">
          <h2 className="section-title">Today's Activity</h2>
          {todayActivity.length === 0
            ? <p className="empty-state">No activity today yet.<br />Tap New Sale to get started.</p>
            : (
              <div className="activity-list">
                {todayActivity.map(item => <ActivityRow key={item.id} item={item} />)}
              </div>
            )
          }
        </section>
      </main>
    </div>
  )
}

function ActivityRow({ item }) {
  if (item.kind === 'sale') {
    const credit = item.total - item.amountPaid
    return (
      <div className="activity-item activity-item--sale">
        <div className="activity-icon activity-icon--sale"><IconArrowUp /></div>
        <div className="activity-body">
          <div className="activity-top">
            <span className="activity-name">{item.buyerName}</span>
            <span className="activity-amount activity-amount--sale">+{CAD(item.total)}</span>
          </div>
          <div className="activity-mid">
            <span className="activity-items">{item.items.map(i => i.name).join(', ')}</span>
            <span className={`badge badge--${credit > 0 ? 'pending' : 'paid'}`}>{credit > 0 ? 'credit' : 'paid'}</span>
          </div>
          <span className="activity-time">{fmtTime(item.createdAt)}</span>
        </div>
      </div>
    )
  }

  if (item.kind === 'purchase') {
    return (
      <div className="activity-item activity-item--purchase">
        <div className="activity-icon activity-icon--purchase"><IconArrowDown /></div>
        <div className="activity-body">
          <div className="activity-top">
            <span className="activity-name">{item.supplierName}</span>
            <span className="activity-amount activity-amount--purchase">−{CAD(item.total)}</span>
          </div>
          <div className="activity-mid">
            <span className="activity-items">{item.items.map(i => i.name).join(', ')}</span>
            <span className={`badge badge--${item.total > item.amountPaid ? 'pending' : 'paid'}`}>
              {item.total > item.amountPaid ? 'pending' : 'paid'}
            </span>
          </div>
          <span className="activity-time">{fmtTime(item.createdAt)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="activity-item activity-item--payment">
      <div className="activity-icon activity-icon--payment"><IconCash /></div>
      <div className="activity-body">
        <div className="activity-top">
          <span className="activity-name">{item.buyerName}</span>
          <span className="activity-amount activity-amount--payment">+{CAD(item.amount)}</span>
        </div>
        <div className="activity-mid">
          <span className="activity-items">{item.note || 'Payment received'}</span>
          <span className="badge badge--paid">received</span>
        </div>
        <span className="activity-time">{fmtTime(item.createdAt)}</span>
      </div>
    </div>
  )
}

function IconArrowUp() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
}
function IconArrowDown() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
}
function IconCash() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
}
function IconSettings() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
}
function IconWhatsApp() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}
function IconPlus() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
}
