import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Login.css'

interface LoginProps {
  onSwitchToRegister: () => void
  onSwitchToForgot: () => void
  onSkip: () => void
}

function Login({ onSwitchToRegister, onSwitchToForgot, onSkip }: LoginProps) {
  const { login, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    console.log('[Login] Attempting login with email:', email)
    const result = await login(email, password)
    console.log('[Login] Login result:', result)
    setLoading(false)

    if (!result.success) {
      console.error('[Login] Login failed:', result.message)
      setError(result.message)
    } else {
      console.log('[Login] Login successful! Auth state should update shortly...')
      // Clear form on success
      setEmail('')
      setPassword('')
      // Auth context will handle navigation via user state update
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    
    console.log('[Login] Attempting Google login...')
    
    // Check if popups are allowed
    const testPopup = window.open('', '', 'width=1,height=1')
    if (!testPopup) {
      setError('Pop-ups appear to be blocked. Please check your browser settings and allow pop-ups for this site.')
      setLoading(false)
      return
    }
    testPopup.close()

    const result = await signInWithGoogle()
    console.log('[Login] Google login result:', result)
    setLoading(false)

    if (!result.success) {
      console.error('[Login] Google login failed:', result.message)
      setError(result.message)
    } else {
      console.log('[Login] Google login successful! Auth state should update shortly...')
      // Auth context will handle navigation via user state update
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card login-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Sign in to Droply to access your files securely</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleEmailLogin}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <div className="label-row">
              <label htmlFor="password">Password</label>
              <button
                type="button"
                className="forgot-link"
                onClick={onSwitchToForgot}
                disabled={loading}
              >
                Forgot?
              </button>
            </div>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="form-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span>{loading ? 'Signing in with Google...' : 'Continue with Google'}</span>
        </button>

        <div className="auth-footer">
          Don't have an account?{' '}
          <button 
            className="auth-link" 
            onClick={onSwitchToRegister}
            type="button"
            disabled={loading}
          >
            Create one
          </button>
        </div>

        <button
          type="button"
          className="skip-button"
          onClick={onSkip}
          disabled={loading}
        >
          Skip & Use Free Sharing
        </button>
      </div>

      <div className="auth-benefits">
        <div className="benefit">
          <span className="benefit-number">01</span>
          <h3>Secure & Private</h3>
          <p>Your files are encrypted and stored securely</p>
        </div>
        <div className="benefit">
          <span className="benefit-number">02</span>
          <h3>Fast Sharing</h3>
          <p>Share files instantly with anyone</p>
        </div>
        <div className="benefit">
          <span className="benefit-number">03</span>
          <h3>Access Anywhere</h3>
          <p>Secure access from any device</p>
        </div>
      </div>
    </div>
  )
}

export default Login

