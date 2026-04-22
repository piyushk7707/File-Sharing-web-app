import { useState } from 'react'
import { authService } from '../utils/authService'
import './ForgotPassword.css'

interface ForgotPasswordProps {
  onBack: () => void
}

function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!email) {
      setError('Please enter your email address')
      setLoading(false)
      return
    }

    console.log('[ForgotPassword] Sending reset email to:', email)
    const result = await authService.sendPasswordReset(email)
    console.log('[ForgotPassword] Reset email result:', result)
    setLoading(false)

    if (result.success) {
      console.log('[ForgotPassword] Password reset email sent successfully')
      setSuccess(result.message)
      setEmail('')
    } else {
      console.error('[ForgotPassword] Password reset failed:', result.message)
      setError(result.message)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card forgot-password-card">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>

        <h2>Reset Your Password</h2>
        <p className="auth-subtitle">
          Enter your email address and we'll send you a link to reset your password
        </p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading || !!success}
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading || !!success}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {success && (
          <div className="success-message">
            <p>Reset link has been sent to your email</p>
            <p className="help-text">
              If you don't see the email, check your spam/trash folder. The link will be valid for 1 hour.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
