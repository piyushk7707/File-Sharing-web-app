import './FileStats.css'

interface SharedFile {
  id: string
  name: string
  size: number
  type: string
  uploadDate: Date
  sharedWith: string[]
}

interface FileStatsProps {
  files: SharedFile[]
}

function FileStats({ files }: FileStatsProps) {
  const getTotalSize = (): number => {
    return files.reduce((sum, file) => sum + file.size, 0)
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getSharedCount = (): number => {
    return files.reduce((sum, file) => sum + file.sharedWith.length, 0)
  }

  return (
    <div className="file-stats">
      <h2>Statistics</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon files-icon"></div>
          <div className="stat-content">
            <p className="stat-label">Total Files</p>
            <p className="stat-value">{files.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon size-icon"></div>
          <div className="stat-content">
            <p className="stat-label">Total Size</p>
            <p className="stat-value">{formatBytes(getTotalSize())}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon share-icon"></div>
          <div className="stat-content">
            <p className="stat-label">Total Shares</p>
            <p className="stat-value">{getSharedCount()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon average-icon"></div>
          <div className="stat-content">
            <p className="stat-label">Avg File Size</p>
            <p className="stat-value">
              {files.length > 0
                ? formatBytes(Math.round(getTotalSize() / files.length))
                : '0 Bytes'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileStats
