// Gmail API Email Sending via Firebase Cloud Functions
// Deploy this function to Firebase Cloud Functions
// Setup: https://firebase.google.com/docs/functions/get-started

import functions from 'firebase-functions'
import nodemailer from 'nodemailer'
import type { Request, Response } from 'express'

// Configure Gmail transporter
// STEP 1: Generate Gmail App Password:
// 1. Go to myaccount.google.com/apppasswords
// 2. Select Mail and Windows Computer
// 3. Copy the app password (16 characters)
// 4. Add to Firebase config: Functions > emailConfig > GMAIL_PASSWORD

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'your-email@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || '', // Use 16-char app password, not Gmail password
  },
})

// CORS config to allow frontend requests
const cors = require('cors')({ origin: true })

// Cloud Function to send email
export const sendShareEmail = functions.https.onRequest(
  (req: Request, res: Response) => {
    return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(400).send('Only POST requests allowed')
    }

    try {
      const { recipientEmail, fileName, shareLink, senderName } = req.body

      if (!recipientEmail || !fileName || !shareLink) {
        return res.status(400).send('Missing required fields: recipientEmail, fileName, shareLink')
      }

      // Email content
      const mailOptions = {
        from: process.env.GMAIL_USER || 'noreply@droply.com',
        to: recipientEmail,
        subject: `${senderName} shared "${fileName}" with you via Droply`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d7fbf;">File Shared with You via Droply</h2>
            <p>Hi,</p>
            <p><strong>${senderName}</strong> has shared a file with you:</p>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 18px; font-weight: bold;">${fileName}</p>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">Expires in 24 hours</p>
            </div>

            <p>Click the button below to download your file:</p>
            
            <div style="margin: 30px 0;">
              <a href="${shareLink}" 
                 style="background: linear-gradient(135deg, #0d7fbf 0%, #0d47a1 100%); 
                        color: white; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        display: inline-block;
                        font-weight: bold;">
                Download File
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999;">
              This file will be automatically deleted after 24 hours.<br>
              Droply - Secure File Sharing
            </p>
          </div>
        `,
      }

      // Send email
      await transporter.sendMail(mailOptions)

      return res.status(200).json({
        success: true,
        message: `Email sent successfully to ${recipientEmail}`,
      })
    } catch (error: any) {
      console.error('Email sending error:', error)
      return res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })
})
