import { useState } from 'react'
import './ShareModal.css'

interface ShareModalProps {
  fileName: string
  onShare: (email: string) => void
  onClose: () => void
}

function ShareModal({ fileName, onShare, onClose }: ShareModalProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleShare = () => {
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    onShare(email)
    setEmail('')
    setError('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleShare()
    }
  }

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share File</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-content">
          <p className="file-name-display">
            <strong>File:</strong> {fileName}
          </p>

          <div className="form-group">
            <label htmlFor="email-input">Email Address</label>
            <input
              id="email-input"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              onKeyPress={handleKeyPress}
              className={error ? 'input-error' : ''}
            />
            {error && <p className="error-message">{error}</p>}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-share" onClick={handleShare}>
            Share
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShareModal
