import { useState, useRef } from 'react'
import './EncryptDecrypt.css'
import CryptoJS from 'crypto-js'
import { generateSecurePassword } from '../utils/passwordUtils'

function EncryptDecrypt() {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const readFileAsArrayBuffer = (file: File) => {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)))
    }
    return btoa(binary)
  }

  const base64ToUint8Array = (base64: string) => {
    const binary = atob(base64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleEncryptFile = async (file?: File) => {
    const f = file || (fileInputRef.current && fileInputRef.current.files && fileInputRef.current.files[0])
    if (!f) return setStatus('Please select a file to encrypt.')
    if (!password) return setStatus('Please enter a password to encrypt the file.')

    try {
      setStatus('Reading file...')
      const ab = await readFileAsArrayBuffer(f)
      setStatus('Encoding file...')
      const base64 = arrayBufferToBase64(ab)

      const envelope = JSON.stringify({ filename: f.name, data: base64 })

      setStatus('Encrypting...')
      const cipher = CryptoJS.AES.encrypt(envelope, password).toString()

      const blob = new Blob([cipher], { type: 'application/octet-stream' })
      const outName = `${f.name}.enc`
      downloadBlob(blob, outName)
      // mark encrypted available for share
      setEncryptedAvailable(true)
      setStatus(`Encrypted and downloaded as ${outName}`)
    } catch (err) {
      setStatus('Encryption failed: ' + String(err))
    }
  }

  const handleDecryptFile = async (file?: File) => {
    const f = file || (fileInputRef.current && fileInputRef.current.files && fileInputRef.current.files[0])
    if (!f) return setStatus('Please select a file to decrypt.')
    if (!password) return setStatus('Please enter the password to decrypt the file.')

    try {
      setStatus('Reading encrypted file...')
      const text = await f.text()
      setStatus('Decrypting...')
      const bytes = CryptoJS.AES.decrypt(text, password)
      const decrypted = bytes.toString(CryptoJS.enc.Utf8)
      if (!decrypted) {
        setStatus('Incorrect password or corrupted file.')
        return
      }
      setStatus('Parsing decrypted data...')
      const envelope = JSON.parse(decrypted)
      if (!envelope || !envelope.data) {
        setStatus('Decrypted content invalid.')
        return
      }
      const uint8 = base64ToUint8Array(envelope.data)
      const blob = new Blob([uint8], { type: 'application/octet-stream' })
      const outName = envelope.filename || `decrypted-${f.name.replace(/\.enc$/, '')}`
      downloadBlob(blob, outName)
      // Decryption performed; clear encrypted available
      setEncryptedAvailable(false)
      setStatus(`Decrypted and downloaded as ${outName}`)
    } catch (err) {
      setStatus('Decryption failed: ' + String(err))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files && e.dataTransfer.files[0]
    if (file) {
      setSelectedFileName(file.name)
      // keep file in input for actions
      if (fileInputRef.current) {
        // create DataTransfer to set input.files
        const dt = new DataTransfer()
        dt.items.add(file)
        fileInputRef.current.files = dt.files
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    if (file) setSelectedFileName(file.name)
  }

  const [encryptedAvailable, setEncryptedAvailable] = useState(false)

  const [showPassword, setShowPassword] = useState(false)

  const handleGeneratePassword = () => {
    const pw = generateSecurePassword(32)
    setPassword(pw)
    setStatus('Generated secure password')
  }

  const handleShareEncrypted = () => {
    // Redirect to send tab; include file name as hint
    const params = new URLSearchParams()
    params.set('tab', 'send')
    if (selectedFileName) params.set('encName', selectedFileName)
    params.set('encrypted', '1')
    window.location.href = `${window.location.origin}/?${params.toString()}`
  }

  return (
    <div className="encrypt-decrypt-container">
      <div className="ed-header">
        <h2>File Encrypt / Decrypt</h2>
        <p>Encrypt any file with AES using a password — the same password is required to decrypt.</p>
      </div>

      <div className="ed-content">
        <div
          className={`drop-zone ${selectedFileName ? 'has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drop-hint">
            <div className="hint-text">Drag & drop a file here</div>
            <div className="hint-subtext">Or click to choose a file from your device</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="file-input-section">
          {selectedFileName ? (
            <div className="file-info">
              <div className="file-name">{selectedFileName}</div>
              <button className="change-file-btn" onClick={() => { if (fileInputRef.current) fileInputRef.current.click() }}>Change file</button>
            </div>
          ) : (
            <div className="file-info">
              <div className="file-name">No file selected</div>
            </div>
          )}
        </div>

        <div className="password-section">
          <label>Encryption Password</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="change-file-btn" onClick={() => setShowPassword((s) => !s)}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="change-file-btn" onClick={handleGeneratePassword}>Generate Password</button>
          </div>
          <div className="hint-text">Use a strong password. Keep it safe — it's required to decrypt.</div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="action-btn encrypt" onClick={() => handleEncryptFile()}>Encrypt File</button>
          <button className="action-btn decrypt" onClick={() => handleDecryptFile()}>Decrypt File</button>
          <button className="action-btn" onClick={handleShareEncrypted} disabled={!encryptedAvailable}>Share Encrypted File</button>
        </div>

        {status && (
          <div className="output-section">
            <h4>Status</h4>
            <div className="output-display">{status}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EncryptDecrypt
