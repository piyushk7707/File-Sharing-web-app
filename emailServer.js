
import dotenv from 'dotenv'
dotenv.config() // Load .env.local file

import express from 'express'
import nodemailer from 'nodemailer'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

// Firebase Admin SDK - For backend Firestore access
import admin from 'firebase-admin'

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001
const STORAGE_BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'fileshare-b0e2c.firebasestorage.app'

// --- Global error logging (writes to logs/error.log and exposes protected route when enabled) ---
const LOG_DIR = path.join(__dirname, 'logs')
try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
} catch (e) {
  console.warn('Could not create log directory:', e && e.message)
}
const LOG_FILE = path.join(LOG_DIR, 'error.log')

const appendLog = (level, err) => {
  try {
    const ts = new Date().toISOString()
    const msg = err && err.stack ? err.stack : (typeof err === 'string' ? err : JSON.stringify(err))
    const entry = `[${ts}] [${level}] ${msg}\n`
    try { fs.appendFileSync(LOG_FILE, entry) } catch (e) { /* ignore file write errors */ }
    console.error(entry)
  } catch (e) {
    console.error('Failed to append log:', e && e.message)
  }
}

process.on('uncaughtException', (err) => {
  appendLog('uncaughtException', err)
  // give time for log to flush
  setTimeout(() => process.exit(1), 200)
})

process.on('unhandledRejection', (reason) => {
  appendLog('unhandledRejection', reason)
})

// Protected endpoint to fetch recent error logs when `ERROR_LOGS_TOKEN` is set
app.get('/__error-logs', (req, res) => {
  const token = process.env.ERROR_LOGS_TOKEN
  const provided = req.get('x-error-logs-token') || req.query.token
  if (!token || provided !== token) {
    return res.status(403).json({ success: false, error: 'Forbidden. Set ERROR_LOGS_TOKEN to enable log access.' })
  }
  try {
    if (!fs.existsSync(LOG_FILE)) return res.json({ success: true, logs: '' })
    const stats = fs.statSync(LOG_FILE)
    const max = 20000
    const start = Math.max(0, stats.size - max)
    const fd = fs.openSync(LOG_FILE, 'r')
    const buf = Buffer.alloc(Math.min(max, stats.size))
    fs.readSync(fd, buf, 0, buf.length, start)
    fs.closeSync(fd)
    return res.type('text/plain').send(buf.toString())
  } catch (e) {
    console.error('Error reading log file:', e && e.message)
    return res.status(500).json({ success: false, error: e && e.message })
  }
})

// Receive client-side logs (protected by same token)
app.post('/__client-log', express.json(), (req, res) => {
  const token = process.env.ERROR_LOGS_TOKEN
  const provided = req.get('x-error-logs-token') || req.query.token
  if (!token || provided !== token) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }
  try {
    const payload = req.body || {}
    appendLog('client', payload)
    return res.json({ success: true })
  } catch (e) {
    console.error('Failed to write client log:', e && e.message)
    return res.status(500).json({ success: false, error: e && e.message })
  }
})

app.use(cors())
app.use(express.json())

const parseFirebaseServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const normalizedBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64.replace(/\s/g, '')
    const decodedJson = Buffer.from(normalizedBase64, 'base64').toString('utf8')

    if (!decodedJson.trim().startsWith('{')) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 decoded value is not JSON')
    }

    return JSON.parse(decodedJson)
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  }

  return null
}

const sendBufferDownload = (res, buffer) => {
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Length', buffer.length)
  res.setHeader('Cache-Control', 'no-cache')
  res.send(buffer)
}

// Initialize Firebase Admin for backend Firestore access
console.log('\n' + '='.repeat(60))
console.log('FIREBASE ADMIN INITIALIZATION')
console.log('='.repeat(60))

try {
  // Check if Firebase Admin is already initialized
  admin.app()
  console.log('✓ Firebase Admin already initialized')
} catch (error) {
  try {
    // Use service account from environment - supports both base64 encoded and plain JSON
    const serviceAccount = parseFirebaseServiceAccount()
    
    console.log(`📝 FIREBASE_SERVICE_ACCOUNT env: ${process.env.FIREBASE_SERVICE_ACCOUNT ? 'SET (plain JSON)' : 'NOT SET'}`)
    console.log(`📝 FIREBASE_SERVICE_ACCOUNT_B64 env: ${process.env.FIREBASE_SERVICE_ACCOUNT_B64 ? 'SET (base64)' : 'NOT SET'}`)
    console.log(`📝 FIREBASE_PROJECT_ID env: ${process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET'}`)
    
    if (!serviceAccount) {
      console.warn('⚠️  No Firebase service account found in environment!')
      console.warn('   Set either FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_B64')
    } else {
      console.log('Firebase service account loaded successfully')
      const projectId = serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID
      
      console.log(`📝 Project ID: ${projectId}`)
      console.log('🔗 Initializing Firebase Admin...')
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${projectId}.firebaseio.com`,
      })
      console.log('✅ Firebase Admin initialized successfully!')
    }
  } catch (err) {
    console.error('❌ Firebase Admin initialization FAILED!')
    console.error('   Error Type:', err.constructor.name)
    console.error('   Error Message:', err.message)
    if (err.stack) {
      console.error('   Stack:', err.stack.split('\n').slice(0, 3).join('\n'))
    }
    if (err instanceof SyntaxError) {
      console.error('   Issue: JSON parsing failed')
      console.error('   - Check if service account is valid JSON')
      console.error('   - Check if base64 decoding worked correctly')
    }
    console.warn('\n⚠️  Firestore proxy will NOT work - admin SDK not initialized')
  }
}

console.log('='.repeat(60) + '\n')

const GMAIL_USER = process.env.GMAIL_USER || 'your-email@gmail.com'
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'your-16-char-app-password'

// Configure Gmail transporter explicitly for robust cloud environment connections
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Prevents certificate lookup failures in containerized cloud servers
  },
})

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.warn('Gmail not configured yet. Email will be logged to console.')
    console.warn('Setup: myaccount.google.com/apppasswords')
  } else {
    console.log('Gmail configured successfully')
  }
})

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { recipientEmail, fileName, shareLink, senderName, expiryText } = req.body

    if (!recipientEmail || !fileName || !shareLink) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: recipientEmail, fileName, shareLink',
      })
    }

    // Email content
    const mailOptions = {
      from: `"Droply File Sharing" <${GMAIL_USER}>`,
      to: recipientEmail,
      subject: `${senderName || 'Someone'} shared "${fileName}" with you via Droply`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0d7fbf 0%, #0d47a1 100%); 
                      color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 32px;">Droply</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Secure File Sharing</p>
          </div>

          <h2 style="color: #1f2937; margin-top: 0;">File Shared with You</h2>
          <p style="color: #6b7280; font-size: 16px;">Hi,</p>
          <p style="color: #6b7280; font-size: 16px;">
            <strong>${senderName || 'Someone'}</strong> has shared a file with you:
          </p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d7fbf;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">${fileName}</p>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #999;">Expires in ${expiryText || '24 hours'}</p>
          </div>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${shareLink}" 
               style="background: linear-gradient(135deg, #0d7fbf 0%, #0d47a1 100%); 
                      color: white; 
                      padding: 14px 32px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      display: inline-block;
                      font-weight: bold;
                      font-size: 16px;">
              Download File
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Or copy this link:<br>
            <code style="background: #f3f4f6; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 10px; word-break: break-all;">
              ${shareLink}
            </code>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="font-size: 12px; color: #999; margin: 0;">
            ${expiryText ? `This file will be automatically deleted after ${expiryText}.<br>` : 'This file will be automatically deleted after 24 hours.<br>'}
            Droply - Secure File Sharing for Everyone<br>
            <a href="https://droply.share" style="color: #0d7fbf; text-decoration: none;">Visit Droply</a>
          </p>
        </div>
      `,
    }

    // Send email
      try {
        const info = await transporter.sendMail(mailOptions)
        const msg = `Email sent to ${recipientEmail}: ${info.messageId}`
        console.log(msg)
        appendLog('email-success', { to: recipientEmail, messageId: info.messageId, info: info })
        return res.status(200).json({
          success: true,
          message: `Email sent successfully to ${recipientEmail}`,
          messageId: info.messageId,
        })
      } catch (sendErr) {
        console.error('Email sending error:', sendErr && (sendErr.stack || sendErr.message || sendErr))
        appendLog('email-error', { to: recipientEmail, error: sendErr && (sendErr.stack || sendErr.message || sendErr) })
        return res.status(500).json({
          success: false,
          error: sendErr && (sendErr.message || String(sendErr)) || 'Failed to send email',
        })
      }
  } catch (error) {
    console.error('Email sending error:', error.message)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
    })
  }
})

// SIMPLE Download proxy endpoint - takes any Firebase Storage URL and fetches it server-side
app.post('/api/download', async (req, res) => {
  try {
    const { filePath, fileId, bucketName } = req.body
    const resolvedBucketName = bucketName || STORAGE_BUCKET_NAME
    const storagePath = filePath || (fileId ? `files/${fileId}/file.enc` : '')

    console.log('\nDownload request - filePath: ' + filePath + ', fileId: ' + fileId)
    console.log('Using bucket: ' + resolvedBucketName)

    let storageURL = ''

    // Try filePath first (full path like "files/xyz/file.enc")
    if (storagePath) {
      storageURL = `https://firebasestorage.googleapis.com/v0/b/${resolvedBucketName}/o/${encodeURIComponent(storagePath)}?alt=media`
    }
    else {
      return res.status(400).json({ success: false, error: 'filePath or fileId required' })
    }

    console.log('Storage path: ' + storagePath)

    try {
      const bucket = admin.storage().bucket(resolvedBucketName)
      const [buffer] = await bucket.file(storagePath).download()
      console.log('Downloaded with Firebase Admin: ' + buffer.length + ' bytes')
      sendBufferDownload(res, buffer)
      console.log('Sent to client (' + buffer.length + ' bytes)')
      return
    } catch (adminStorageError) {
      console.warn('Firebase Admin Storage download failed: ' + adminStorageError.message)
      console.warn('Falling back to Firebase Storage REST URL...')
    }

    console.log('Fetching: ' + storageURL)
    console.log('Server making request... (bypasses browser CORS)')

    try {
      const response = await fetch(storageURL, { timeout: 30000 })

      if (!response.ok) {
        console.error('Firebase error: ' + response.status + ' ' + response.statusText)
        const text = await response.text()
        return res.status(response.status).json({
          success: false,
          error: `Firebase: ${response.statusText}`,
          details: text.substring(0, 200)
        })
      }

      // Get the response as arrayBuffer (works for binary data)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      console.log('Downloaded: ' + buffer.length + ' bytes from Firebase')

      sendBufferDownload(res, buffer)
      console.log('Sent to client (' + buffer.length + ' bytes)')
    } catch (fetchError) {
      console.error('Fetch failed: ' + fetchError.message)
      return res.status(502).json({
        success: false,
        error: `Fetch error: ${fetchError.message}`
      })
    }
  } catch (error) {
    console.error('Download handler error: ' + error.message)
    res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`
    })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Email server is running', timestamp: new Date() })
})

// =======================
// FIRESTORE PROXY ENDPOINTS
// =======================
// Proxy endpoint to fetch file metadata by shareId (for handling Firestore connection issues on frontend)
app.get('/api/file/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params
    
    if (!shareId) {
      return res.status(400).json({ error: 'shareId is required' })
    }

    console.log(`\n[Firestore Proxy] Fetching file by shareId: ${shareId}`)

    // Try to get from Firestore using Admin SDK
    try {
      // Check if Firebase Admin is initialized
      let db
      try {
        db = admin.firestore()
      } catch (adminError) {
        console.error('❌ Firebase Admin not initialized:', adminError.message)
        return res.status(503).json({
          success: false,
          error: 'Firestore backend not initialized',
          details: 'Firebase service account not configured. Check environment variables.',
        })
      }
      
      // First try direct document access
      console.log(`📝 Attempting direct document lookup...`)
      const docRef = db.collection('files').doc(shareId)
      const docSnapshot = await docRef.get()
      
      if (docSnapshot.exists()) {
        const fileData = docSnapshot.data()
        console.log(`✅ Found file by document ID: ${fileData.fileName}`)
        return res.json({
          success: true,
          data: {
            id: docSnapshot.id,
            ...fileData,
          },
        })
      }

      // Fallback: Query by shareId field
      console.log(`📝 Trying query by shareId field...`)
      const querySnapshot = await db.collection('files')
        .where('shareId', '==', shareId)
        .limit(1)
        .get()

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]
        const fileData = doc.data()
        console.log(`✅ Found file by shareId query: ${fileData.fileName}`)
        return res.json({
          success: true,
          data: {
            id: doc.id,
            ...fileData,
          },
        })
      }

      console.warn(`❌ No file found with shareId: ${shareId}`)
      return res.status(404).json({
        success: false,
        error: 'File not found',
        shareId: shareId,
      })
    } catch (firebaseError) {
      console.error('❌ Firestore Query Error:', firebaseError.code || firebaseError.message)
      console.error('   Details:', firebaseError.message)
      return res.status(500).json({
        success: false,
        error: 'Firestore query failed: ' + firebaseError.message,
        code: firebaseError.code,
      })
    }
  } catch (error) {
    console.error('❌ Proxy endpoint error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown server error',
    })
  }
})

// Serve React frontend
app.use(express.static(path.join(__dirname, 'dist')))

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`🚀 Email server running on http://localhost:${PORT}`)
  console.log(`📧 Email endpoint: POST http://localhost:${PORT}/api/send-email`)
})
