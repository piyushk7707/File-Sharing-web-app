
import dotenv from 'dotenv'
dotenv.config() // Load .env.local file

import express from 'express'
import nodemailer from 'nodemailer'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = process.env.SERVER_PORT || 3001
const STORAGE_BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'fileshare-b0e2c.firebasestorage.app'

app.use(cors())
app.use(express.json())


const GMAIL_USER = process.env.GMAIL_USER || 'your-email@gmail.com'
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'your-16-char-app-password'

// Configure Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
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
      from: 'noreply@droply.com',
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
    const info = await transporter.sendMail(mailOptions)

    console.log('Email sent to ' + recipientEmail + ': ' + info.messageId)

    return res.status(200).json({
      success: true,
      message: `Email sent successfully to ${recipientEmail}`,
      messageId: info.messageId,
    })
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

    console.log('\nDownload request - filePath: ' + filePath + ', fileId: ' + fileId)
    console.log('Using bucket: ' + resolvedBucketName)

    let storageURL = ''

    // Try filePath first (full path like "files/xyz/file.enc")
    if (filePath) {
      storageURL = `https://firebasestorage.googleapis.com/v0/b/${resolvedBucketName}/o/${encodeURIComponent(filePath)}?alt=media`
    }
    // Or construct from fileId
    else if (fileId) {
      storageURL = `https://firebasestorage.googleapis.com/v0/b/${resolvedBucketName}/o/${encodeURIComponent(`files/${fileId}/file.enc`)}?alt=media`
    }
    else {
      return res.status(400).json({ success: false, error: 'filePath or fileId required' })
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

      // Send as binary - NO CORS issues because it's same-origin (localhost:3001)
      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Length', buffer.length)
      res.setHeader('Cache-Control', 'no-cache')
      res.send(buffer)
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

// Serve React frontend
app.use(express.static(path.join(__dirname, 'dist')))

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`🚀 Email server running on http://localhost:${PORT}`)
  console.log(`📧 Email endpoint: POST http://localhost:${PORT}/api/send-email`)
})
