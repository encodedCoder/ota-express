import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Canada is the production country. India is included for testing only and
// will be removed before launch. (See README.)
const COUNTRIES = [
  { code: 'CA', label: 'Canada',  dial: '+1',  flag: '🇨🇦', expectedDigits: 10 },
  { code: 'IN', label: 'India',   dial: '+91', flag: '🇮🇳', expectedDigits: 10, note: 'testing' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sendOtp, verifyOtp, status } = useAuth()

  const [step, setStep] = useState('phone') // 'phone' | 'code'
  const [country, setCountry] = useState(COUNTRIES[0])
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [devMode, setDevMode] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  const codeInputRef = useRef(null)

  // If they navigate here while already logged in, bounce home.
  useEffect(() => {
    if (status === 'authed') {
      const dest = location.state?.from || '/'
      navigate(dest, { replace: true })
    }
  }, [status, navigate, location.state])

  // Resend cooldown
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const phoneDigits = phone.replace(/\D/g, '')
  const phoneIsValid = phoneDigits.length === country.expectedDigits

  async function handleSendOtp(e) {
    e?.preventDefault?.()
    if (!phoneIsValid || busy) return
    setError('')
    setBusy(true)
    try {
      const res = await sendOtp({ phone: phoneDigits, country: country.code })
      setDevMode(!!res.devMode)
      setStep('code')
      setResendIn(30)
      // Focus code input after step transition
      setTimeout(() => codeInputRef.current?.focus(), 50)
    } catch (err) {
      setError(humanizeError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleVerifyOtp(e) {
    e?.preventDefault?.()
    if (code.length < 4 || busy) return
    setError('')
    setBusy(true)
    try {
      await verifyOtp({ phone: phoneDigits, country: country.code, code })
      // Auth context flips status to 'authed' and the effect above redirects.
    } catch (err) {
      setError(humanizeError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    if (resendIn > 0 || busy) return
    setCode('')
    await handleSendOtp()
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-brand">
          <span className="login-brand-leaf">🥬</span>
          <h1 className="login-brand-name">OtaExpress</h1>
        </div>
        <p className="login-tag">Deliver. Track. Get Paid.</p>
      </div>

      <div className="login-card">
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp}>
            <h2 className="login-title">Sign in</h2>
            <p className="login-sub">
              We'll send a 6-digit code to your phone.
            </p>

            <label className="form-label" htmlFor="login-country">
              Country
            </label>
            <select
              id="login-country"
              className="form-select login-country-select"
              value={country.code}
              onChange={(e) =>
                setCountry(
                  COUNTRIES.find((c) => c.code === e.target.value) ||
                    COUNTRIES[0],
                )
              }
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.label} ({c.dial})
                  {c.note ? ` — ${c.note}` : ''}
                </option>
              ))}
            </select>

            <label className="form-label" htmlFor="login-phone">
              Phone number
            </label>
            <div className="login-phone-row">
              <span className="login-dial">{country.dial}</span>
              <input
                id="login-phone"
                className="form-input login-phone-input"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder={
                  country.code === 'CA' ? '555 123 4567' : '98765 43210'
                }
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
            </div>
            <p className="login-help">
              {phoneDigits.length}/{country.expectedDigits} digits
            </p>

            {error && <p className="login-error">{error}</p>}

            <button
              type="submit"
              className={`btn btn--primary btn--full login-btn ${
                !phoneIsValid || busy ? 'btn--disabled' : ''
              }`}
              disabled={!phoneIsValid || busy}
            >
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <h2 className="login-title">Enter the code</h2>
            <p className="login-sub">
              Sent to <strong>{country.dial} {formatPhone(phoneDigits, country.code)}</strong>{' '}
              <button
                type="button"
                className="login-link"
                onClick={() => {
                  setStep('phone')
                  setCode('')
                  setError('')
                }}
              >
                Change
              </button>
            </p>

            {devMode && (
              <div className="login-devmode">
                <strong>Dev mode:</strong> backend has no Twilio credentials.
                Use code <code>123456</code>.
              </div>
            )}

            <label className="form-label" htmlFor="login-code">
              6-digit code
            </label>
            <input
              ref={codeInputRef}
              id="login-code"
              className="form-input login-code-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="• • • • • •"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />

            {error && <p className="login-error">{error}</p>}

            <button
              type="submit"
              className={`btn btn--primary btn--full login-btn ${
                code.length < 4 || busy ? 'btn--disabled' : ''
              }`}
              disabled={code.length < 4 || busy}
            >
              {busy ? 'Verifying…' : 'Verify and sign in'}
            </button>

            <button
              type="button"
              className="login-resend"
              onClick={handleResend}
              disabled={resendIn > 0 || busy}
            >
              {resendIn > 0
                ? `Resend code in ${resendIn}s`
                : 'Resend code'}
            </button>
          </form>
        )}
      </div>

      <p className="login-fineprint">
        By continuing you agree to receive a one-time code from OtaExpress.
        Standard message rates may apply.
      </p>
    </div>
  )
}

function formatPhone(digits, country) {
  if (country === 'CA' && digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (country === 'IN' && digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  return digits
}

function humanizeError(err) {
  switch (err.code) {
    case 'invalid_phone':
      return 'That phone number doesn\'t look right. Check the digits.'
    case 'invalid_code':
      return 'Code should be 4–8 digits.'
    case 'wrong_code':
      return 'That code didn\'t match. Try again or resend.'
    case 'too_many_requests':
      return 'Too many attempts. Wait a moment, then try again.'
    case 'send_failed':
      return 'Couldn\'t send the code. Check the number and try again.'
    case 'verify_failed':
      return 'Verification failed. Try resending the code.'
    default:
      return err.detail || err.message || 'Something went wrong. Try again.'
  }
}
