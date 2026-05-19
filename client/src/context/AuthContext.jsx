import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, tokenStore } from '../utils/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  // 'loading' = checking existing token on boot
  // 'authed'  = logged in
  // 'anon'    = not logged in
  const [status, setStatus] = useState(tokenStore.get() ? 'loading' : 'anon')

  // Fetch the seller profile from Supabase (via our API)
  const fetchProfile = useCallback(async () => {
    try {
      const data = await api('/profile', { auth: true })
      setProfile(data.profile)
    } catch {
      // Non-fatal — profile just stays null
    }
  }, [])

  // On boot, verify token and load profile
  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    api('/auth/me', { auth: true })
      .then(async (data) => {
        if (cancelled) return
        setUser(data.user)
        setStatus('authed')
        // Load the profile right after confirming auth
        const profileData = await api('/profile', { auth: true }).catch(() => null)
        if (!cancelled && profileData) setProfile(profileData.profile)
      })
      .catch(() => {
        if (cancelled) return
        tokenStore.clear()
        setUser(null)
        setStatus('anon')
      })
    return () => { cancelled = true }
  }, [status])

  const sendOtp = useCallback(async ({ phone, country }) => {
    return api('/auth/send-otp', { method: 'POST', body: { phone, country } })
  }, [])

  const verifyOtp = useCallback(async ({ phone, country, code }) => {
    const data = await api('/auth/verify-otp', { method: 'POST', body: { phone, country, code } })
    tokenStore.set(data.token)
    setUser(data.user)
    setStatus('authed')
    // Create / fetch profile after login
    const profileData = await api('/profile', { auth: true }).catch(() => null)
    if (profileData) setProfile(profileData.profile)
    return data
  }, [])

  const updateProfile = useCallback(async (updates) => {
    const data = await api('/profile', { method: 'PUT', auth: true, body: updates })
    setProfile(data.profile)
    return data.profile
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setProfile(null)
    setStatus('anon')
  }, [])

  return (
    <AuthCtx.Provider value={{ user, profile, status, sendOtp, verifyOtp, updateProfile, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
