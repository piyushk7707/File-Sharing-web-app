import { useState } from 'react'
import ShareModal from './ShareModal'
import { buildShareLink, generateQRCodeURL } from '../utils/qrCodeUtils'
import './FileItem.css'

interface FileItemProps {
  file: {
    id: string
    name: string
    size: number
    type: string
    uploadDate: Date
    sharedWith: string[]
    qrCode?: string
    sharingProgress?: number
    downloadLink: string
    expiryTime: Date
    uploadStatus?: 'uploading' | 'success' | 'failed'
  }
  onDelete: (id: string) => void
  onShare: (id: string, email: string) => void
  onUnshare: (id: string, email: string) => void
}

function FileItem({ file, onDelete, onShare, onUnshare }: FileItemProps) {
  const [showShareModal, setShowShareModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getFileIcon = (): string => {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const iconMap: Record<string, string> = {
      pdf: 'icon-pdf',
      doc: 'icon-doc',
      docx: 'icon-doc',
      xls: 'icon-sheet',
      xlsx: 'icon-sheet',
      ppt: 'icon-slide',
      pptx: 'icon-slide',
      jpg: 'icon-image',
      jpeg: 'icon-image',
      png: 'icon-image',
      gif: 'icon-image',
      zip: 'icon-zip',
      rar: 'icon-zip',
      txt: 'icon-text',
      mp4: 'icon-video',
      mp3: 'icon-audio',
    }
    return iconMap[extension] || 'icon-file'
  }

  const getTimeRemaining = (): string => {
    const now = new Date().getTime()
    const expiry = new Date(file.expiryTime).getTime()
    const diff = expiry - now

    if (diff <= 0) return 'Expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) return `${hours}h ${minutes}m remaining`
    return `${minutes}m remaining`
  }

  const isExpired = new Date() > new Date(file.expiryTime)
  const shareLink = file.downloadLink || buildShareLink(file.id)
  const receivePageLink = `${window.location.origin}/?tab=receive&shareLink=${encodeURIComponent(shareLink)}`

  return (
    <>
      <div className="file-item">
        <div className="file-header">
          <div className="file-info">
            <div className={`file-icon ${getFileIcon()}`}></div>
            <div className="file-details">
              <div className="file-name-container">
                <p className="file-name">{file.name}</p>
                {file.uploadStatus === 'uploading' && (
                  <span className="upload-badge uploading">Uploading...</span>
                )}
                {file.uploadStatus === 'success' && (
                  <span className="upload-badge success">Uploaded</span>
                )}
                {file.uploadStatus === 'failed' && (
                  <span className="upload-badge failed">Failed</span>
                )}
              </div>
              <p className="file-meta">
                {formatBytes(file.size)} • {formatDate(file.uploadDate)}
              </p>
            </div>
          </div>
          <div className="file-actions">
            <button
              className="action-button view-btn"
              onClick={() => setShowViewModal(true)}
              title="View"
            >
              View
            </button>
            <button
              className="action-button delete-btn"
              onClick={() => onDelete(file.id)}
              title="Delete"
            >
              Delete
            </button>
          </div>
        </div>

        {file.qrCode && (
          <>
            <div className="qr-section-large">
              <h4 className="section-title">Scan QR Code or Click Below</h4>
              <div className="qr-container-large">
                <a
                  href={receivePageLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Click to open share link. QR can also be scanned."
                  style={{ textDecoration: 'none', cursor: 'pointer' }}
                >
                  <img
                    src={generateQRCodeURL(file.id)}
                    alt="QR Code"
                    className="qr-code-large"
                    style={{ cursor: 'pointer', transition: 'transform 0.2s', borderRadius: '8px' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  />
                </a>
              </div>
              <p className="qr-label">Click QR code or scan with phone camera</p>
              <p className="expiry-info">{isExpired ? 'Access Expired' : getTimeRemaining()}</p>
            </div>

            <div className="link-share-section">
              <h4 className="section-title">Share Link</h4>
              <div className="link-container">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className="share-link-input"
                />
                <button
                  className="copy-link-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink)
                    alert('Link copied to clipboard!')
                  }}
                >
                  Copy Link
                </button>
              </div>
              <p className="expiry-info">{isExpired ? 'Link Expired' : getTimeRemaining()}</p>
            </div>

            <div className="email-share-section">
              <h4 className="section-title">Send File via Email</h4>
              <button
                className="share-button-main"
                onClick={() => setShowShareModal(true)}
                disabled={file.sharingProgress !== undefined && file.sharingProgress > 0}
              >
                {file.sharingProgress !== undefined && file.sharingProgress > 0
                  ? `Sending... ${file.sharingProgress}%`
                  : 'Send Email'}
              </button>

              {file.sharingProgress !== undefined && file.sharingProgress > 0 && (
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${file.sharingProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </>
        )}

        {file.sharedWith.length > 0 && (
          <div className="shared-with">
            <p className="shared-label">Shared with:</p>
            <div className="shared-list">
              {file.sharedWith.map((email) => (
                <div key={email} className="share-tag">
                  <span>{email}</span>
                  <button
                    className="remove-share"
                    onClick={() => onUnshare(file.id, email)}
                    title="Remove access"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showShareModal && (
        <ShareModal
          fileName={file.name}
          onShare={(email) => {
            onShare(file.id, email)
            setShowShareModal(false)
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showViewModal && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{file.name}</h3>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>File Info:</strong></p>
              <p>Name: {file.name}</p>
              <p>Size: {formatBytes(file.size)}</p>
              <p>Uploaded: {formatDate(file.uploadDate)}</p>
              <p>Access: Read-only</p>
              <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>This file is view-only. To share with others, use the QR code or share link below.</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn close-btn" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default FileItem
