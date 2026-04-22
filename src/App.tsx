import { useState, useEffect } from 'react'
import './App.css'
import FileUpload from './components/FileUpload'
import FileList from './components/FileList'
import FileStats from './components/FileStats'
import ReceiveFile from './components/ReceiveFile'
import EncryptDecrypt from './components/EncryptDecrypt'
import Login from './components/Login'
import Register from './components/Register'
import ForgotPassword from './components/ForgotPassword'
import ProfileMenu from './components/ProfileMenu'
import { useAuth } from './context/AuthContext'
import {
  uploadFileToStorage,
  saveFileMetadata,

} from './utils/firebaseUtils'
import { buildShareLink, getShareLinkFromURL, getTabFromURL } from './utils/qrCodeUtils'
import { generateSecurePassword } from './utils/passwordUtils'
import { sendFileViaEmail } from './utils/emailService'
import { config } from './config/appConfig'
import { Timestamp } from 'firebase/firestore'

interface SharedFile {
  id: string
  name: string
  size: number
  type: string
  uploadDate: Date
  sharedWith: string[]
  qrCode?: string
  sharingProgress?: number
  downloadLink: string
  expiryTime?: Date | null
  uploadStatus?: 'uploading' | 'success' | 'failed'
}

function App() {
  const { isAuthenticated, isLoading } = useAuth()
  const [files, setFiles] = useState<SharedFile[]>([])
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'encrypt'>('send')
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [hasSkipped, setHasSkipped] = useState(false)

  // Auto-switch to Receive tab if QR code was scanned
  useEffect(() => {
    const tab = getTabFromURL()
    if (tab) {
      console.log('QR Code Detected: Auto-switching to ' + tab + ' tab')
      setActiveTab(tab)
    }
  }, [])

  const handleFileUpload = async (uploadedFiles: File[], expirySelection?: { choice: string; customValue?: number; customUnit?: 'm' | 'h' | 'd' }) => {
    try {
      console.log('Starting upload for ' + uploadedFiles.length + ' file(s)')

      for (const file of uploadedFiles) {
        console.log('\nProcessing: ' + file.name + ' (' + file.size + ' bytes)')

        const fileId = Math.random().toString(36).substr(2, 9)
        const shareLink = buildShareLink(fileId)
        const qrValue = shareLink

        // Compute expiry time based on selection (defaults to config.file.expiryHours)
        let expiryTime: Date | null = new Date()
        try {
          if (!expirySelection || !expirySelection.choice) {
            expiryTime.setHours(expiryTime.getHours() + config.file.expiryHours)
          } else if (expirySelection.choice === 'none') {
            expiryTime = null
          } else if (expirySelection.choice === '5m') {
            expiryTime.setMinutes(expiryTime.getMinutes() + 5)
          } else if (expirySelection.choice === '1h') {
            expiryTime.setHours(expiryTime.getHours() + 1)
          } else if (expirySelection.choice === '24h') {
            expiryTime.setHours(expiryTime.getHours() + 24)
          } else if (expirySelection.choice === 'custom') {
            const v = expirySelection.customValue || 0
            const u = expirySelection.customUnit || 'h'
            if (u === 'm') expiryTime.setMinutes(expiryTime.getMinutes() + v)
            else if (u === 'h') expiryTime.setHours(expiryTime.getHours() + v)
            else expiryTime.setDate(expiryTime.getDate() + v)
          } else {
            expiryTime.setHours(expiryTime.getHours() + config.file.expiryHours)
          }
        } catch (e) {
          // fallback
          expiryTime = new Date()
          expiryTime.setHours(expiryTime.getHours() + config.file.expiryHours)
        }

        const newFile: SharedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadDate: new Date(),
          sharedWith: [],
          qrCode: qrValue,
          downloadLink: shareLink,
          expiryTime: expiryTime,
          sharingProgress: 0,
          uploadStatus: 'uploading',
        }

        // Add to UI immediately
        setFiles((prevFiles) => [...prevFiles, newFile])
        console.log('Added to UI: ' + fileId)

        // Upload to Firebase in background
        ;(async () => {
          try {
            const password = generateSecurePassword(32) // Generate unique password for each file
            console.log('\n[' + fileId + '] Starting Firebase upload...')
            console.log('Generated encryption password (length: ' + password.length + ')')

            const storagePath = await uploadFileToStorage(file, password, fileId)
            console.log('[' + fileId + '] Firebase upload complete: ' + storagePath)

            // Save metadata to Firestore
            console.log('[' + fileId + '] Saving metadata to Firestore...')
            console.log('Metadata to save:', {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              storagePath: storagePath,
              shareLink: shareLink,
              qrLink: qrValue,
            })

            try {
              await saveFileMetadata({
                shareId: fileId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                uploadDate: Timestamp.now(),
                expiryTime: expiryTime ? Timestamp.fromDate(expiryTime) : null,
                storagePath: storagePath,
                shareLink: shareLink,
                qrLink: qrValue,
                sharedWith: [],
                encryption: true,
                encryptionPassword: password, // Store the password with metadata
              })
              console.log('[' + fileId + '] Metadata saved to Firestore!')
            } catch (metadataError: any) {
              console.error('[' + fileId + '] CRITICAL: Metadata save failed!', metadataError)
              console.error('Error code: ' + metadataError.code)
              console.error('Error message: ' + metadataError.message)
              
              // Show error about metadata save failure
              throw new Error('Failed to save file metadata to database: ' + metadataError.message)
            }

            // Update upload status to success
            setFiles((prevFiles) =>
              prevFiles.map((f) =>
                f.id === fileId ? { ...f, uploadStatus: 'success' } : f,
              ),
            )

            console.log('[' + fileId + '] ' + file.name + ' FULLY UPLOADED!')
            console.log('Share link: ' + shareLink)
            console.log('QR value: ' + qrValue)
            
            // Show success popup
            alert('\nSUCCESS!\n\n"' + file.name + '" uploaded to Firebase!\n\nShare link: ' + shareLink + '\n\nQR code + Email in the file card below.')
          } catch (error: any) {
            console.error('[' + fileId + '] UPLOAD FAILED:', error)
            console.error('Error details:', {
              code: error.code,
              message: error.message,
              stack: error.stack,
            })
            
            // Update upload status to failed
            setFiles((prevFiles) =>
              prevFiles.map((f) =>
                f.id === fileId ? { ...f, uploadStatus: 'failed' } : f,
              ),
            )
            
            // Show user-friendly error message
            alert('\nUpload Failed: ' + file.name + '\n\nError: ' + error.message + '\n\nCheck Console (F12) for details.\n\nCommon fixes:\n1. Check Firebase Rules (allow read, write)\n2. Check browser console for errors\n3. Check Firebase Storage quota')
          }
        })()
      }
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const handleDeleteFile = (fileId: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId))
  }

  const handleShareFile = (fileId: string, email: string) => {
    const file = files.find((f) => f.id === fileId)
    if (!file) return

    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, sharingProgress: 1 } : file,
      ),
    )

    // Send email with file download link
    const shareEmailWithFile = async () => {
      try {
        console.log('Sending email to ' + email + ' for file: ' + file.name)
        
        // Actually send the email
            // Compute human-friendly expiry text
            let expiryText = 'No expiry'
            try {
              if (file.expiryTime) {
                const expires = new Date(file.expiryTime)
                const diffMs = expires.getTime() - Date.now()
                if (diffMs <= 0) expiryText = 'Expired'
                else {
                  const mins = Math.round(diffMs / 60000)
                  if (mins < 60) expiryText = `${mins} minutes`
                  else if (mins < 60 * 24) expiryText = `${Math.round(mins / 60)} hours`
                  else expiryText = `${Math.round(mins / (60*24))} days`
                }
              }
            } catch (e) {
              expiryText = '24 hours'
            }

            await sendFileViaEmail({
              recipientEmail: email,
              fileName: file.name,
              shareLink: file.downloadLink,
              senderName: 'Droply User',
              expiryText,
            })

        // Update progress and shared list
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  sharedWith: Array.from(new Set([...f.sharedWith, email])),
                  sharingProgress: 0,
                }
              : f,
          ),
        )

        console.log('Email sent successfully to ' + email)
        alert('Email sent successfully to ' + email)
      } catch (error) {
        console.error('Error sending email:', error)
        alert(
          'Failed to send email: ' + (error instanceof Error ? error.message : 'Unknown error') + '\n\nDownload Link:\n' + file.downloadLink,
        )
        setFiles((prevFiles) =>
          prevFiles.map((f) => (f.id === fileId ? { ...f, sharingProgress: 0 } : f)),
        )
      }
    }

    shareEmailWithFile()
  }

  const handleUnshareFile = (fileId: string, email: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId
          ? {
              ...file,
              sharedWith: file.sharedWith.filter((e) => e !== email),
            }
          : file,
      ),
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="app-container app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth screens if not authenticated
  if (!isAuthenticated && !hasSkipped) {
    return (
      <>
        {authMode === 'login' ? (
          <Login
            onSwitchToRegister={() => setAuthMode('register')}
            onSwitchToForgot={() => setAuthMode('forgot')}
            onSkip={() => setHasSkipped(true)}
          />
        ) : authMode === 'register' ? (
          <Register 
            onSwitchToLogin={() => setAuthMode('login')}
            onSkip={() => setHasSkipped(true)}
          />
        ) : (
          <ForgotPassword onBack={() => setAuthMode('login')} />
        )}
      </>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <img src="/droply-icon.svg" alt="Droply" className="logo-img" />
            <h1>Droply</h1>
          </div>
          <p className="subtitle">Secure File Sharing Built for Everyone</p>
        </div>
      </header>

      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-tabs">
            <button
              className={`tab-button ${activeTab === 'send' ? 'active' : ''}`}
              onClick={() => setActiveTab('send')}
            >
              <span className="tab-label">Send</span> Share Files
            </button>
            <button
              className={`tab-button ${activeTab === 'receive' ? 'active' : ''}`}
              onClick={() => setActiveTab('receive')}
            >
              <span className="tab-label">Receive</span> Files
            </button>
            {isAuthenticated && !hasSkipped && (
              <button
                className={`tab-button ${activeTab === 'encrypt' ? 'active' : ''}`}
                onClick={() => setActiveTab('encrypt')}
              >
                <span className="tab-label">Encrypt</span> Files
              </button>
            )}
            
            <div className="profile-tab">
              <ProfileMenu onSignInClick={() => {
                setAuthMode('login')
                setHasSkipped(false)
              }} />
            </div>
          </div>
          <div className="nav-security">
            <label className="security-toggle">
              <input
                type="checkbox"
                checked={encryptionEnabled}
                onChange={(e) => setEncryptionEnabled(e.target.checked)}
              />
              <span className="toggle-label">Encryption</span>
            </label>
            {encryptionEnabled && (
              <span className="security-badge">AES-256 Enabled</span>
            )}
          </div>
        </div>
      </nav>

      <main className="app-main">
        <div className="content-wrapper">
          {activeTab === 'send' ? (
            <>
              <section className="upload-section">
                <FileUpload onUpload={handleFileUpload} />
              </section>

              <section className="stats-section">
                <FileStats files={files} />
              </section>

              <section className="files-section">
                {files.length > 0 ? (
                  <>
                    <div className="section-header">
                      <h2>Your Files ({files.length})</h2>
                    </div>
                    <FileList
                      files={files}
                      onDelete={handleDeleteFile}
                      onShare={handleShareFile}
                      onUnshare={handleUnshareFile}
                    />
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon"></div>
                    <p className="empty-text">
                      No files uploaded yet. Start by uploading a file!
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : activeTab === 'receive' ? (
            <section className="files-section">
              <ReceiveFile initialShareLink={getShareLinkFromURL()} />
            </section>
          ) : isAuthenticated ? (
            <section className="files-section">
              <EncryptDecrypt />
            </section>
          ) : null}
        </div>
      </main>

      <footer className="app-footer">
        <p>&copy; 2026 Droply. Secure file sharing for everyone.</p>
      </footer>
    </div>
  )
}

export default App
