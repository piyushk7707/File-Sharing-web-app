import { useRef, useState } from 'react'
import './FileUpload.css'

interface FileUploadProps {
  onUpload: (files: File[], expiry?: { choice: string; customValue?: number; customUnit?: 'm' | 'h' | 'd' }) => void
}

function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [expiryChoice, setExpiryChoice] = useState<string>('24h')
  const [customValue, setCustomValue] = useState<number | ''>('')
  const [customUnit, setCustomUnit] = useState<'m' | 'h' | 'd'>('h')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    onUpload(droppedFiles, buildExpiry())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      onUpload(selectedFiles, buildExpiry())
      e.target.value = ''
    }
  }

  const handleButtonClick = () => {
    inputRef.current?.click()
  }

  const buildExpiry = () => {
    if (expiryChoice === 'custom') {
      return { choice: 'custom', customValue: Number(customValue), customUnit }
    }
    return { choice: expiryChoice }
  }

  return (
    <div className="file-upload-container">
      <h2>Upload Files</h2>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Expires In</label>
        <select value={expiryChoice} onChange={(e) => setExpiryChoice(e.target.value)}>
          <option value="5m">5 minutes</option>
          <option value="1h">1 hour</option>
          <option value="24h">24 hours</option>
          <option value="none">No expiry</option>
          <option value="custom">Custom...</option>
        </select>
        {expiryChoice === 'custom' && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" min={1} value={customValue as any} onChange={(e) => setCustomValue(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: 100 }} />
            <select value={customUnit} onChange={(e) => setCustomUnit(e.target.value as 'm' | 'h' | 'd')}>
              <option value="m">minutes</option>
              <option value="h">hours</option>
              <option value="d">days</option>
            </select>
          </div>
        )}
      </div>
      <div
        className={`upload-drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <p className="drop-text">
          {isDragging ? 'Drop files here' : 'Drag files here or click to select'}
        </p>
        <p className="drop-hint">Supported: All file types</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleInputChange}
        className="hidden-input"
      />

      <button className="upload-button" onClick={handleButtonClick}>
        Select Files
      </button>
    </div>
  )
}

export default FileUpload
