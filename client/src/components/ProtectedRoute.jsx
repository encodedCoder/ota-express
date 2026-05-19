import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Wraps a route so only authenticated users can see it.
 * - status 'loading': render a tiny splash while we verify the saved token.
 * - status 'anon':    redirect to /login, remembering where they wanted to go.
 * - status 'authed':  render the children.
 */
export default function ProtectedRoute({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="auth-splash">
        <span className="auth-splash-leaf">🥬</span>
        <span>Loading…</span>
      </div>
    )
  }

  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
