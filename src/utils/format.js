export const CAD = (n) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n ?? 0)

export const fmtPrice = (n) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n ?? 0)

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })

export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })

export const isToday = (iso) => {
  const d = new Date(iso)
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

export const getGreeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export const getDate = () =>
  new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })
