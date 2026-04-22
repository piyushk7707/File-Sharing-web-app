// Email Service - Calls Firebase Cloud Function
// or direct SMTP if configured

import { config } from '../config/appConfig'

export interface EmailOptions {
  recipientEmail: string
  fileName: string
  shareLink: string
  senderName?: string
  expiryText?: string
}

/**
 * Send file sharing email via Gmail API (Firebase Cloud Function)
 * REQUIRES: Cloud Function deployed and Gmail configured
 */
export const sendFileEmailViaCF = async (options: EmailOptions): Promise<boolean> => {
  try {
    const cloudFunctionURL = config.cloudFunctions.sendEmailUrl

    const response = await fetch(cloudFunctionURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientEmail: options.recipientEmail,
        fileName: options.fileName,
        shareLink: options.shareLink,
        senderName: options.senderName || 'A Droply User',
        expiryText: options.expiryText || undefined,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`)
    }

    const result = await response.json()
    console.log('Email sent:', result.message)
    return true
  } catch (error) {
    console.error('Email sending failed:', error)
    throw error
  }
}

/**
 * Fallback: Direct SMTP (requires backend)
 * For localhost testing without Cloud Functions
 */
export const sendFileEmailViaBackend = async (options: EmailOptions): Promise<boolean> => {
  try {
    const backendURL = `${config.server.apiBaseUrl}/api/send-email`

    const response = await fetch(backendURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    })

    if (!response.ok) {
      throw new Error('Backend email service unavailable')
    }

    const result = await response.json()
    console.log('Email sent via backend:', result.message)
    return true
  } catch (error) {
    console.error('Backend email failed, trying Cloud Function...', error)
    return await sendFileEmailViaCF(options)
  }
}

/**
 * Main email sending function
 * Tries local backend first (easiest), then Cloud Function
 */
export const sendFileViaEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // Method 1: Try local backend first (easiest)
    return await sendFileEmailViaBackend(options)
  } catch (backendError) {
    console.warn('Local backend unavailable, trying Cloud Function...', backendError)

    // Method 2: Fallback to Cloud Function
    try {
      return await sendFileEmailViaCF(options)
    } catch (cfError) {
      console.error('All email methods failed:', cfError)
      throw cfError
    }
  }
}
