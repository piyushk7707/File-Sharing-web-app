import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Register.css'

interface RegisterProps {
  onSwitchToLogin: () => void
  onSkip: () => void
}

function Register({ onSwitchToLogin, onSkip }: RegisterProps) {
  const { register, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const checkPasswordStrength = (pwd: string) => {
    let strength = 0
    if (pwd.length >= 6) strength++
    if (pwd.length >= 10) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    setPasswordStrength(strength)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value
    setPassword(pwd)
    checkPasswordStrength(pwd)
  }

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password || !confirmPassword || !displayName) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters long')
      setLoading(false)
      return
    }

    console.log('[Register] Attempting registration...')
    const result = await register(email, password, displayName)
    console.log('[Register] Registration result:', result)
    setLoading(false)

    if (!result.success) {
      console.error('[Register] Registration failed:', result.message)
      setError(result.message)
    } else {
      console.log('[Register] Registration successful! Auth state should update shortly...')
      // Clear form on success
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setDisplayName('')
      // Auth context will handle navigation via user state update
    }
  }

  const handleGoogleRegister = async () => {
    setError('')
    setLoading(true)

    console.log('[Register] Attempting Google registration...')
    
    // Check if popups are allowed
    const testPopup = window.open('', '', 'width=1,height=1')
    if (!testPopup) {
      setError('Pop-ups appear to be blocked. Please check your browser settings and allow pop-ups for this site.')
      setLoading(false)
      return
    }
    testPopup.close()

    const result = await signInWithGoogle()
    console.log('[Register] Google registration result:', result)
    setLoading(false)

    if (!result.success) {
      console.error('[Register] Google registration failed:', result.message)
      setError(result.message)
    } else {
      console.log('[Register] Google registration successful! Auth state should update shortly...')
      // Auth context will handle navigation via user state update
    }
  }

  const getPasswordStrengthLabel = () => {
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
    return labels[passwordStrength]
  }

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p className="auth-subtitle">Join Droply and start sharing files securely</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleEmailRegister}>
          <div className="form-group">
            <label htmlFor="displayName">Full Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
              disabled={loading}
              className="form-input"
            />
          </div>

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
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
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
            {password && (
              <div className={`password-strength strength-${passwordStrength}`}>
                Strength: <strong>{getPasswordStrengthLabel()}</strong>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="form-input"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleRegister}
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
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span>{loading ? 'Signing up with Google...' : 'Sign Up with Google'}</span>
        </button>

        <div className="auth-footer">
          Already have an account?{' '}
          <button 
            className="auth-link" 
            onClick={onSwitchToLogin}
            type="button"
            disabled={loading}
          >
            Sign in
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

export default Register

