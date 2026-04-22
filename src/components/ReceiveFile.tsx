import { useState, useEffect } from 'react'
import {
  getFileMetadataByLink,
  getFileMetadataByShareId,
  downloadFileFromStorage,
  isFileExpired,
  getAllUserFiles,
} from '../utils/firebaseUtils'
import { buildShareLink, extractFileIdFromShareInput } from '../utils/qrCodeUtils'
import './ReceiveFile.css'

interface ReceivedFile {
  id: string
  name: string
  size: number
  uploadDate: Date
  storagePath: string
  encryptionPassword: string
}

interface ReceiveFileProps {
  initialShareLink?: string | null
}

function ReceiveFile({ initialShareLink }: ReceiveFileProps) {
  const [shareLink, setShareLink] = useState(initialShareLink || '')
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadingFileName, setDownloadingFileName] = useState('')

  // Auto-retrieve file if shareLink is in URL (from QR scan)
  useEffect(() => {
    if (initialShareLink) {
      console.log('Auto-retrieving file from QR: ' + initialShareLink)
      // Trigger retrieve immediately
      retrieveFile(initialShareLink)
    }
  }, [initialShareLink])

  const retrieveFile = async (fileIdToUse: string) => {
    if (!fileIdToUse.trim()) {
      setError('Please scan QR code or enter a file ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      const fileId = extractFileIdFromShareInput(fileIdToUse)

      if (!fileId || fileId.length === 0) {
        setError('Invalid share link format')
        setLoading(false)
        return
      }

      console.log('Retrieving file for ID: ' + fileId)
      console.log('Searching Firestore for file...')

      const fullShareLink = buildShareLink(fileId)
      console.log('Query link: ' + fullShareLink)

      // Fetch metadata from Firestore
      let metadata = await getFileMetadataByShareId(fileId)

      if (!metadata) {
        metadata = await getFileMetadataByLink(fullShareLink)
      }
      
      if (!metadata) {
        console.error('File not found with link: ' + fullShareLink)
        console.log('Trying fallback search...')
        // Fallback: Try to get all files and find by ID
        const allFiles = await getAllUserFiles()
        console.log('Total files in Firestore: ' + allFiles.length)
        
        for (const f of allFiles) {
          console.log('   - File in DB: ID=' + (f.id?.substring(0,8) || '') + '... Name=' + f.fileName + ' Path=' + (f.storagePath?.substring(0,20) || '') + '...')
          // Search by shareLink, storagePath, or ID
          if (
            f.shareId === fileId ||
            f.shareLink?.includes(fileId) ||
            f.storagePath?.includes(fileId) ||
            f.id?.includes(fileId)
          ) {
            metadata = f
            console.log('Found via fallback search! Using: ' + f.fileName)
            break
          }
        }
      }

      if (!metadata) {
        setError('File not found!\n\nPossible reasons:\n- Link has expired\n- File was deleted\n- File ID is incorrect\n\nCheck Console (F12) for debug info.')
        setLoading(false)
        return
      }

      // Check if expired
      if (isFileExpired(metadata.expiryTime)) {
        setError('This file link has expired. Links are valid for 24 hours only.')
        setLoading(false)
        return
      }

      // Create file object for display
      const receivedFile: ReceivedFile = {
        id: metadata.id || fileId,
        name: metadata.fileName,
        size: metadata.fileSize,
        uploadDate: metadata.uploadDate.toDate(),
        storagePath: metadata.storagePath,
        encryptionPassword: metadata.encryptionPassword || 'droply123', // Fallback to default if not present
      }

      setReceivedFiles([receivedFile])
      setShareLink('')
      console.log('File retrieved: ' + metadata.fileName)
      console.log('Storage path: ' + metadata.storagePath)
      console.log('Encryption password from metadata')
    } catch (err) {
      console.error('Retrieve Error:', err)
      setError('Error retrieving file: ' + (err instanceof Error ? err.message : 'Unknown error') + '\n\nCheck Console (F12)')
    } finally {
      setLoading(false)
    }
  }

  const handleRetrieveFiles = async () => {
    await retrieveFile(shareLink)
  }

  const handleDownloadFile = async (fileId: string) => {
    const file = receivedFiles.find((f) => f.id === fileId)
    if (!file) {
      alert('File not found in list')
      return
    }

    setIsDownloading(true)
    setDownloadingFileName(file.name)
    setDownloadProgress(0)

    try {
      console.log('[ReceiveFile] Starting download: ' + file.name)
      console.log('[ReceiveFile] File ID: ' + file.id)
      console.log('[ReceiveFile] Storage path: ' + file.storagePath)

      let data: Uint8Array
      let extension: string
      let name: string
      
      try {
        console.log('[ReceiveFile] Calling downloadFileFromStorage...')
        const result = await downloadFileFromStorage(
          file.storagePath,
          file.encryptionPassword,
          (progress) => {
            console.log('[ReceiveFile] Download progress: ' + progress + '%')
            setDownloadProgress(progress)
          },
        )
        data = result.data
        extension = result.extension
        name = result.name
        console.log('[ReceiveFile] Download completed. Data size: ' + data.byteLength + ' bytes')
      } catch (downloadError) {
        console.error('[ReceiveFile] downloadFileFromStorage failed:', downloadError)
        throw new Error('Download failed: ' + (downloadError instanceof Error ? downloadError.message : String(downloadError)))
      }

      if (!data || data.byteLength === 0) {
        throw new Error('Download returned empty data')
      }

      console.log('[ReceiveFile] File decrypted: ' + name + '.' + extension)
      setDownloadProgress(95)

      // Create proper blob from decrypted data
      const blobData = new Uint8Array(data)
      const blob = new Blob([blobData], { type: 'application/octet-stream' })
      console.log('[ReceiveFile] Blob created: ' + blob.size + ' bytes')
      
      if (blob.size === 0) {
        throw new Error('Blob is empty after creation')
      }
      
      const url = URL.createObjectURL(blob)
      console.log('[ReceiveFile] Object URL created')
      
      setDownloadProgress(98)
      
      // Trigger download
      const fileName = name + '.' + extension
      console.log('[ReceiveFile] Triggering download for: ' + fileName)
      
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.style.display = 'none'
      
      document.body.appendChild(link)
      console.log('[ReceiveFile] Link appended to DOM')
      
      // Ensure DOM is updated
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Click to download
      link.click()
      console.log('[ReceiveFile] Download triggered')
      
      // Cleanup
      await new Promise(resolve => setTimeout(resolve, 200))
      
      try {
        document.body.removeChild(link)
      } catch (e) {
        console.warn('[ReceiveFile] Could not remove link from DOM')
      }
      
      URL.revokeObjectURL(url)
      console.log('[ReceiveFile] Cleanup complete')

      setDownloadProgress(100)
      
      setTimeout(() => {
        alert('Download complete! File: ' + fileName)
        setIsDownloading(false)
        setDownloadProgress(0)
        setDownloadingFileName('')
      }, 500)
      
    } catch (error) {
      console.error('[ReceiveFile] Download handler error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      alert('Download Failed\n\nError: ' + errorMsg + '\n\nPlease check the console for more details.')
      setIsDownloading(false)
      setDownloadProgress(0)
      setDownloadingFileName('')
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="receive-container">
      <div className="receive-header">
        <h2>Receive Files</h2>
        <p>Enter a share link to download files sent to you</p>
      </div>

      <div className="receive-form">
        <div className="input-group">
          <input
            type="text"
            placeholder="Paste share link here (or scan QR code)"
            value={shareLink}
            onChange={(e) => {
              setShareLink(e.target.value)
              setError('')
            }}
            className={error ? 'input-error' : ''}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleRetrieveFiles()
            }}
          />
          <button
            className="btn-retrieve"
            onClick={handleRetrieveFiles}
            disabled={loading}
          >
            {loading ? 'Retrieving...' : 'Retrieve Files'}
          </button>
        </div>
        {error && <p className="error-message">{error}</p>}
      </div>

      {receivedFiles.length > 0 && (
        <div className="received-files">
          <h3>Available Files ({receivedFiles.length})</h3>
          <div className="files-grid">
            {receivedFiles.map((file) => (
              <div key={file.id} className="file-card">
                <div className="file-icon-large">
                  <div className={`file-type-icon ${file.name.split('.').pop()?.toLowerCase()}`}></div>
                </div>
                <h4>{file.name}</h4>
                <p className="file-size">{formatBytes(file.size)}</p>
                <button
                  className="btn-download"
                  onClick={() => handleDownloadFile(file.id)}
                  disabled={isDownloading}
                >
                  {isDownloading && downloadingFileName === file.name ? `Downloading... ${downloadProgress}%` : 'Download'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isDownloading && (
        <div className="download-modal-overlay">
          <div className="download-modal">
            <div className="download-modal-content">
              <h3>Downloading File</h3>
              <p className="file-name-downloading">{downloadingFileName}</p>
              
              <div className="progress-container">
                <div className="progress-bar-wrapper">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
                <span className="progress-text">{downloadProgress}%</span>
              </div>

              <div className="progress-steps">
                <div className={`step ${downloadProgress >= 5 ? 'active' : ''}`}>
                  <span>Downloading</span>
                </div>
                <div className={`step ${downloadProgress >= 40 ? 'active' : ''}`}>
                  <span>Decrypting</span>
                </div>
                <div className={`step ${downloadProgress >= 80 ? 'active' : ''}`}>
                  <span>Processing</span>
                </div>
                <div className={`step ${downloadProgress >= 100 ? 'active' : ''}`}>
                  <span>Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {receivedFiles.length === 0 && !loading && (
        <div className="empty-receive">
          <div className="empty-icon"></div>
          <p>No files retrieved yet</p>
          <p className="hint">Enter a share link to access files</p>
        </div>
      )}
    </div>
  )
}

export default ReceiveFile
