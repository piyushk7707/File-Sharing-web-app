import FileItem from './FileItem'
import './FileList.css'

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
  expiryTime: Date
}

interface FileListProps {
  files: SharedFile[]
  onDelete: (id: string) => void
  onShare: (id: string, email: string) => void
  onUnshare: (id: string, email: string) => void
}

function FileList({
  files,
  onDelete,
  onShare,
  onUnshare,
}: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="file-list-container">
        <h2>Files</h2>
        <div className="empty-state">
          <div className="empty-icon"></div>
          <p className="empty-title">No files uploaded yet</p>
          <p className="empty-description">
            Start by uploading files to share them with others
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="file-list-container">
      <div className="list-header">
        <h2>Files</h2>
        <span className="file-count">{files.length} file(s)</span>
      </div>
      <div className="file-list">
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            onDelete={onDelete}
            onShare={onShare}
            onUnshare={onUnshare}
          />
        ))}
      </div>
    </div>
  )
}

export default FileList
