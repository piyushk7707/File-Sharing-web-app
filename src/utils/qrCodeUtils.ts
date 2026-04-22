import { config } from '../config/appConfig'

/**
 * QR Code generation and linking utilities
 */

export const getShareLinkBase = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/download`
  }

  return config.shareLinkBase
}

export const buildShareLink = (fileId: string): string => {
  return `${getShareLinkBase()}/${fileId}`
}

export const extractFileIdFromShareInput = (value: string): string => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return ''
  }

  try {
    const url = new URL(trimmedValue)
    const pathParts = url.pathname.split('/').filter(Boolean)

    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1]
    }
  } catch {
    // Not a full URL, continue with plain-text parsing below.
  }

  if (trimmedValue.includes('/download/')) {
    return trimmedValue.split('/download/').pop() || ''
  }

  if (trimmedValue.includes('?fileId=')) {
    return trimmedValue.split('?fileId=').pop() || ''
  }

  return trimmedValue
}

/**
 * Generate QR code URL that points to receiver page with auto-filled link
 * @param fileId - Unique file identifier
 * @returns QR code image URL
 */
export const generateQRCodeURL = (fileId: string): string => {
  const shareLink = buildShareLink(fileId)
  // URL to open: navigate to receive tab with shareLink parameter
  const qrURL = `${window.location.origin}/?tab=receive&shareLink=${encodeURIComponent(shareLink)}`
  const encoded = encodeURIComponent(qrURL)
  // Using QR server API for generation
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encoded}`
}

/**
 * Parse QR code data and extract file ID
 * @param qrData - Data from QR code
 * @returns File ID or null
 */
export const parseQRData = (qrData: string): string | null => {
  try {
    const url = new URL(qrData)
    const fileId = url.pathname.split('/').pop()
    return fileId || null
  } catch (err) {
    console.error('Invalid QR data:', err)
    return null
  }
}

/**
 * Handle QR scan or direct link access
 * Constructs the share link from file ID
 */
export const getShareLinkFromQR = (fileId: string): string => {
  // Returns just the fileId - will be used to fetch from Firestore
  return fileId
}

/**
 * Get share link from URL parameters (when scanned from QR)
 * Returns share link if present, null otherwise
 */
export const getShareLinkFromURL = (): string | null => {
  const params = new URLSearchParams(window.location.search)
  const shareLink = params.get('shareLink')
  if (shareLink) {
    console.log('Share link from QR: ' + shareLink)
    return shareLink
  }

  const pathParts = window.location.pathname.split('/').filter(Boolean)
  if (pathParts[0] === 'download' && pathParts[1]) {
    const directShareLink = buildShareLink(pathParts[1])
    console.log('Share link from path: ' + directShareLink)
    return directShareLink
  }

  return null
}

/**
 * Get tab parameter from URL
 */
export const getTabFromURL = (): 'send' | 'receive' | 'encrypt' | null => {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  if (tab === 'receive' || tab === 'send' || tab === 'encrypt') {
    return tab
  }
  return null
}

/**
 * Check if current page is opened via QR code
 * Returns file ID if yes, or from URL parameter
 */
export const getFileIdFromURL = (): string | null => {
  const params = new URLSearchParams(window.location.search)
  // Check for fileId parameter
  const fileId = params.get('fileId')
  if (fileId) {
    console.log(`\ud83d\udc8e File ID from QR: ${fileId}`)
    return fileId
  }
  return null
}
