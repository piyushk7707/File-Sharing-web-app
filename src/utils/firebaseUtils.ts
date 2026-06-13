import { config } from '../config/appConfig'
import { storage, db } from '../config/firebase'
import { ref, uploadBytes, deleteObject } from 'firebase/storage'
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore'

import CryptoJS from 'crypto-js'

// ====================
// FILE UPLOAD UTILITY
// ====================
export const uploadFileToStorage = async (
  file: File,
  password: string,
  fileId: string,
  shouldEncrypt: boolean = true,
): Promise<string> => {
  try {
    console.log('\n' + '='.repeat(50))
    console.log('STARTING FILE UPLOAD')
    console.log('='.repeat(50))
    console.log('File: ' + file.name)
    console.log('Size: ' + file.size + ' bytes')
    console.log('File ID: ' + fileId)

    if (!file.size) {
      throw new Error('File is empty')
    }

    console.log('\nStep 1: Reading file...')
    // Read file as base64 (safer for binary)
    const arrayBuffer = await file.arrayBuffer()
    console.log('File read: ' + arrayBuffer.byteLength + ' bytes')

    console.log('\nStep 2: Converting to base64...')
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    console.log('Base64 created: ' + base64.length + ' chars')

    let finalData = base64
    if (shouldEncrypt && password) {
      console.log('\nStep 3: Encrypting with AES...')
      finalData = CryptoJS.AES.encrypt(base64, password).toString()
      console.log('Encryption successful: ' + finalData.length + ' chars')
    } else {
      console.log('\nStep 3: Skipping encryption (uploading plaintext)...')
    }

    console.log('\nStep 4: Creating metadata...')
    const extension = file.name.split('.').pop() || 'bin'
    const metadata = JSON.stringify({
      name: file.name,
      extension: extension,
      size: file.size,
      type: file.type,
      uploadDate: new Date().toISOString(),
    })
    console.log('Metadata: ' + metadata)

    console.log('\nStep 5: Creating encrypted blob...')
    const encryptedContent = `${metadata}|${finalData}`
    const encryptedBlob = new Blob([encryptedContent], { type: 'text/plain;charset=utf-8' })
    console.log('Blob created: ' + encryptedBlob.size + ' bytes')

    console.log('\nStep 6: Creating Firebase storage reference...')
    const storagePath = `files/${fileId}/${file.name}.enc`
    const storageRef = ref(storage, storagePath)
    console.log('Reference: ' + storagePath)

    console.log('\nStep 7: Uploading to Firebase Storage...')
    console.log('Bucket: fileshare-b0e2c.firebasestorage.app')
    console.log('Path: ' + storagePath)

    const snapshot = await uploadBytes(storageRef, encryptedBlob)

    console.log('\n' + '='.repeat(50))
    console.log('UPLOAD SUCCESSFUL!')
    console.log('='.repeat(50))
    console.log('Storage Path: ' + snapshot.ref.fullPath)
    console.log('File Size: ' + snapshot.metadata.size + ' bytes')
    console.log('Upload Time: ' + snapshot.metadata.timeCreated)

    return snapshot.ref.fullPath
  } catch (error: any) {
    console.log('\n' + '='.repeat(50))
    console.error('UPLOAD FAILED!')
    console.log('='.repeat(50))
    console.error('Error Code: ' + error.code)
    console.error('Error Message: ' + error.message)
    console.error('Full Error:', error)

    // Specific error messages
    if (error.code === 'storage/unauthenticated') {
      console.error('\nSOLUTION: Firebase rules blocking access!')
      console.error('Update Firebase rules: https://console.firebase.google.com/')
      console.error('   Go to Storage > Rules > Replace with public rules')
    } else if (error.code === 'storage/bucket-not-found') {
      console.error('\nSOLUTION: Check storage bucket name in config!')
      console.error('   Current: fileshare-b0e2c.firebasestorage.app')
    } else if (error.code === 'storage/unauthorized') {
      console.error('\nSOLUTION: Permission denied. Check Firebase rules!')
    }

    throw error
  }
}

// ====================
// FILE DOWNLOAD UTILITY
// ====================
export const downloadFileFromStorage = async (
  filePath: string,
  password: string,
  onProgress?: (progress: number) => void,
): Promise<{ data: Uint8Array; extension: string; name: string }> => {
  try {
    console.log('Starting download for: ' + filePath)

    if (!filePath) {
      throw new Error('No file path provided for download')
    }

    onProgress?.(5)

    // STEP 1: Download file through backend proxy to avoid browser CORS issues
    console.log('Downloading file through backend proxy...')

    // Start progress simulation for better UX
    let currentProgress = 5
    const progressInterval = setInterval(() => {
      if (currentProgress < 35) {
        currentProgress += 5
        onProgress?.(currentProgress)
      }
    }, 200)

    let fileBytes: Uint8Array
    try {
      const response = await fetch(`${config.server.apiBaseUrl}/api/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          bucketName: config.firebase.storageBucket,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Backend download failed (${response.status}): ${errorText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      console.log('Proxy download complete: ' + arrayBuffer.byteLength + ' bytes')

      // Convert blob to Uint8Array
      fileBytes = new Uint8Array(arrayBuffer)
      console.log('File bytes: ' + fileBytes.length + ' bytes')

      clearInterval(progressInterval)
      onProgress?.(40)
    } catch (fetchError) {
      clearInterval(progressInterval)
      console.error('Failed to download file through backend:', fetchError)
      throw new Error('Failed to download file from storage: ' + (fetchError instanceof Error ? fetchError.message : 'Unknown error'))
    }

    if (!fileBytes || fileBytes.length === 0) {
      throw new Error('Downloaded file is empty - check storage path is correct')
    }

    onProgress?.(45)

    // STEP 3: Convert bytes to text (encrypted data is stored as text)
    console.log('Converting downloaded bytes to text...')
    let fileText: string
    try {
      // Bytes to string
      const decoder = new TextDecoder()
      fileText = decoder.decode(fileBytes)
    } catch (e) {
      console.error('Text decode error:', e)
      throw new Error('Failed to decode file - might be corrupted')
    }

    if (!fileText || fileText.length === 0) {
      throw new Error('Decoded file text is empty')
    }

    console.log('File parsed as text: ' + fileText.length + ' characters')
    onProgress?.(50)

    // STEP 4: Parse format: METADATA|ENCRYPTED
    console.log('Parsing METADATA|ENCRYPTED format...')
    const lastPipe = fileText.lastIndexOf('|')
    if (lastPipe === -1) {
      throw new Error('Invalid file format - metadata separator not found (no pipe character)')
    }

    const metadataStr = fileText.substring(0, lastPipe)
    const encryptedData = fileText.substring(lastPipe + 1)

    console.log('Metadata: ' + metadataStr.length + ' chars, Encrypted: ' + encryptedData.length + ' chars')

    let metadata
    try {
      metadata = JSON.parse(metadataStr)
      console.log('Metadata parsed: ' + JSON.stringify(metadata))
    } catch (e) {
      console.error('JSON parse error on metadata:', metadataStr.substring(0, 150))
      throw new Error('Invalid metadata JSON - file might be corrupted')
    }

    if (!metadata.name || !metadata.extension) {
      throw new Error('Metadata missing required fields: name=' + metadata.name + ', extension=' + metadata.extension)
    }

    console.log('File: ' + metadata.name + '.' + metadata.extension)
    console.log('Decrypting AES encrypted data...')
    onProgress?.(55)

    // STEP 5: Decrypt using CryptoJS if password is provided
    let decryptedBase64: string
    if (password) {
      console.log('Decrypting AES encrypted data...')
      onProgress?.(55)
      let decrypted
      try {
        decrypted = CryptoJS.AES.decrypt(encryptedData, password)
        if (!decrypted) {
          throw new Error('Decryption returned empty')
        }
        console.log('AES decryption successful')
      } catch (e) {
        console.error('AES decryption failed:', e)
        throw new Error('Decryption failed - wrong password or corrupted data')
      }
      onProgress?.(70)

      // STEP 6: Convert decrypted data to base64 string
      console.log('Converting decrypted data to UTF-8 string...')
      try {
        decryptedBase64 = decrypted.toString(CryptoJS.enc.Utf8)
      } catch (e) {
        console.error('Decrypted string conversion failed:', e)
        throw new Error('Failed to convert decrypted data to string')
      }
      if (!decryptedBase64 || decryptedBase64.length === 0) {
        console.error('Decrypted base64 is empty - password might be wrong')
        throw new Error('Decryption produced empty data - wrong password?')
      }
    } else {
      console.log('Skipping AES decryption (using plaintext)...')
      decryptedBase64 = encryptedData
      onProgress?.(70)
    }

    console.log('Decrypted base64 length: ' + decryptedBase64.length)
    onProgress?.(80)

    // STEP 7: Decode from base64 to binary
    console.log('Decoding base64 to binary...')
    let binaryString: string
    try {
      binaryString = atob(decryptedBase64)
    } catch (e) {
      console.error('Base64 decode failed:', e)
      throw new Error('Failed to decode base64 - file might be corrupted')
    }

    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    console.log('File downloaded and decrypted: ' + metadata.name + '.' + metadata.extension + ' (' + bytes.byteLength + ' bytes)')
    onProgress?.(100)

    return {
      data: bytes,
      extension: metadata.extension || 'bin',
      name: metadata.name || 'file',
    }
  } catch (error) {
    console.error('Download error - full details:', error)
    console.error('Error message:', error instanceof Error ? error.message : String(error))

    // Re-throw with more context
    throw error
  }
}

// ====================
// FIRESTORE METADATA
// ====================
export interface SharedFileMetadata {
  id?: string
  shareId?: string
  fileName: string
  fileSize: number
  fileType: string
  uploadDate: Timestamp
  expiryTime: Timestamp
  storagePath: string
  shareLink: string
  qrLink: string
  sharedWith: string[]
  encryption: boolean
  encryptionPassword?: string  // Store password for decryption
}

// Save file metadata to Firestore
export const saveFileMetadata = async (
  metadata: Omit<SharedFileMetadata, 'id'>,
): Promise<string> => {
  try {
    console.log('\n' + '='.repeat(50))
    console.log('SAVING METADATA TO FIRESTORE')
    console.log('='.repeat(50))
    console.log('Collection: files')
    console.log('Data:', metadata)

    const shareId = metadata.shareId || crypto.randomUUID()
    const docRef = doc(db, 'files', shareId)

    await setDoc(docRef, {
      ...metadata,
      shareId,
      uploadDate: metadata.uploadDate,
      expiryTime: metadata.expiryTime,
    })

    console.log('\n' + '='.repeat(50))
    console.log('METADATA SAVED SUCCESSFULLY!')
    console.log('='.repeat(50))
    console.log('Document ID: ' + docRef.id)
    console.log('Share Link: ' + metadata.shareLink)

    return docRef.id
  } catch (error: any) {
    console.log('\n' + '='.repeat(50))
    console.error('METADATA SAVE FAILED!')
    console.log('='.repeat(50))
    console.error('Error Code: ' + error.code)
    console.error('Error Message: ' + error.message)
    console.error('Full Error:', error)

    // Provide helpful error messages
    if (error.code === 'permission-denied') {
      console.error('\nSOLUTION: Update Firebase Firestore Rules!')
      console.error('Go to: https://console.firebase.google.com/ > Firestore > Rules')
      console.error('Add: match /{document=**} { allow read, write; }')
    } else if (error.code === 'unavailable') {
      console.error('\nFirestore service is unavailable. Check your internet connection.')
    }

    throw error
  }
}

// Get file metadata by share link
export const getFileMetadataByLink = async (
  shareLink: string,
): Promise<SharedFileMetadata | null> => {
  const maxRetries = 3
  let retryCount = 0

  const attemptQuery = async (): Promise<SharedFileMetadata | null> => {
    try {
      console.log(`[Attempt ${retryCount + 1}/${maxRetries}] Querying Firestore for shareLink: ${shareLink}`)
      const q = query(collection(db, 'files'), where('shareLink', '==', shareLink))
      const querySnapshot = await getDocs(q)

      console.log('Query returned ' + querySnapshot.size + ' documents')

      if (querySnapshot.empty) {
        console.warn('No documents found with shareLink: ' + shareLink)
        return null
      }

      const doc = querySnapshot.docs[0]
      const data = { id: doc.id, ...doc.data() } as SharedFileMetadata
      console.log('✓ Found file: ' + data.fileName)
      return data
    } catch (error: any) {
      console.error(`[Attempt ${retryCount + 1}] Metadata fetch error: ${error.message}`)

      if (
        error.message?.includes('offline') ||
        error.code === 'failed-precondition' ||
        error.code === 'unavailable'
      ) {
        retryCount++
        if (retryCount < maxRetries) {
          console.log(`⏳ Connection issue detected. Retrying in 1 second... (${retryCount}/${maxRetries})`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          return attemptQuery()
        }
      }

      throw error
    }
  }

  try {
    return await attemptQuery()
  } catch (error: any) {
    // All Firestore attempts failed - extract shareId from link and use backend proxy
    console.warn('⚠️  Firestore failed - trying backend proxy with extracted ID...')
    try {
      // Extract ID from share link (format: https://domain/download/{id})
      const parts = shareLink.split('/')
      const shareId = parts[parts.length - 1]
      
      if (!shareId) throw new Error('Could not extract shareId from link')
      
      const response = await fetch(`${config.server.apiBaseUrl}/api/file/${shareId}`)
      
      if (!response.ok) {
        throw new Error(`Backend proxy returned ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        console.log('✓ Successfully retrieved file from backend proxy: ' + result.data.fileName)
        return result.data as SharedFileMetadata
      } else {
        throw new Error(result.error || 'Backend proxy returned no data')
      }
    } catch (proxyError: any) {
      console.error('Backend proxy also failed:', proxyError.message)
      throw error // Throw original Firestore error
    }
  }
}

export const getFileMetadataByShareId = async (
  shareId: string,
): Promise<SharedFileMetadata | null> => {
  const maxRetries = 3
  let retryCount = 0

  const attemptQuery = async (): Promise<SharedFileMetadata | null> => {
    try {
      console.log(`[Attempt ${retryCount + 1}/${maxRetries}] Fetching file metadata for shareId: ${shareId}`)
      
      const docRef = doc(db, 'files', shareId)
      const directSnapshot = await getDoc(docRef)

      if (directSnapshot.exists()) {
        const directData = {
          id: directSnapshot.id,
          ...directSnapshot.data(),
        } as SharedFileMetadata
        console.log('✓ Found file by document ID: ' + directData.fileName)
        return directData
      }

      console.log('Querying Firestore for shareId: ' + shareId)
      const q = query(collection(db, 'files'), where('shareId', '==', shareId))
      const querySnapshot = await getDocs(q)

      console.log('ShareId query returned ' + querySnapshot.size + ' documents')

      if (querySnapshot.empty) {
        console.warn('No documents found with shareId: ' + shareId)
        return null
      }

      const foundDoc = querySnapshot.docs[0]
      const data = { id: foundDoc.id, ...foundDoc.data() } as SharedFileMetadata
      console.log('✓ Found file by shareId: ' + data.fileName)
      return data
    } catch (error: any) {
      console.error(`[Attempt ${retryCount + 1}] Error: ${error.message}`)

      // Check if it's an offline error
      if (
        error.message?.includes('offline') ||
        error.code === 'failed-precondition' ||
        error.code === 'unavailable'
      ) {
        retryCount++
        if (retryCount < maxRetries) {
          console.log(`⏳ Connection issue detected. Retrying in 1 second... (${retryCount}/${maxRetries})`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          return attemptQuery()
        }
      }

      throw error
    }
  }

  try {
    return await attemptQuery()
  } catch (error: any) {
    // All Firestore attempts failed - fallback to backend proxy
    console.warn('⚠️  Firestore failed - trying backend proxy...')
    try {
      const response = await fetch(`${config.server.apiBaseUrl}/api/file/${shareId}`)
      
      if (!response.ok) {
        throw new Error(`Backend proxy returned ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        console.log('✓ Successfully retrieved file from backend proxy: ' + result.data.fileName)
        return result.data as SharedFileMetadata
      } else {
        throw new Error(result.error || 'Backend proxy returned no data')
      }
    } catch (proxyError: any) {
      console.error('Backend proxy also failed:', proxyError.message)
      throw error // Throw original Firestore error
    }
  }
}

// Get all user files
export const getAllUserFiles = async (): Promise<SharedFileMetadata[]> => {
  const maxRetries = 3
  let retryCount = 0

  const attemptQuery = async (): Promise<SharedFileMetadata[]> => {
    try {
      console.log(`[Attempt ${retryCount + 1}/${maxRetries}] Querying all files from Firestore...`)
      const querySnapshot = await getDocs(collection(db, 'files'))
      console.log('Found ' + querySnapshot.size + ' total files in database')

      const files = querySnapshot.docs.map((doc: any) => {
        const data = {
          id: doc.id,
          ...doc.data(),
        } as SharedFileMetadata
        console.log('   - File: ' + data.fileName + ' | ID: ' + doc.id.substring(0, 8) + '... | Path: ' + (data.storagePath?.substring(0, 30) || ''))
        return data
      })

      return files
    } catch (error: any) {
      console.error(`[Attempt ${retryCount + 1}] Files fetch error: ${error.message}`)

      if (
        error.message?.includes('offline') ||
        error.code === 'failed-precondition' ||
        error.code === 'unavailable'
      ) {
        retryCount++
        if (retryCount < maxRetries) {
          console.log(`⏳ Connection issue detected. Retrying in 1 second... (${retryCount}/${maxRetries})`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          return attemptQuery()
        }
      }

      throw error
    }
  }

  return attemptQuery()
}

// Update file metadata
export const updateFileMetadata = async (
  fileId: string,
  updates: Partial<SharedFileMetadata>,
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'files', fileId), updates)
  } catch (error) {
    console.error('Metadata update error:', error)
    throw error
  }
}

// Delete file from storage and metadata
export const deleteFile = async (fileId: string): Promise<void> => {
  try {
    // Get metadata first
    const metadata = await getDocs(
      query(collection(db, 'files'), where('__name__', '==', fileId)),
    )

    if (!metadata.empty) {
      const fileData = metadata.docs[0].data() as SharedFileMetadata
      // Delete from storage
      const storageRef = ref(storage, fileData.storagePath)
      await deleteObject(storageRef)
      // Delete metadata
      await deleteDoc(doc(db, 'files', fileId))
    }
  } catch (error) {
    console.error('Delete error:', error)
    throw error
  }
}

// Check if file has expired
export const isFileExpired = (expiryTime: Timestamp): boolean => {
  if (!expiryTime) return false
  const now = new Date()
  const expiry = expiryTime.toDate()
  return now > expiry
}
