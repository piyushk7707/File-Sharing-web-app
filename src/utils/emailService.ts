// Email Service - Calls Firebase Cloud Function
// or direct SMTP if configured

import { config } from '../config/appConfig'

const EMAIL_REQUEST_TIMEOUT_MS = 20000

export interface EmailOptions {
  recipientEmail: string
  fileName: string
  shareLink: string
  senderName?: string
  expiryText?: string
}

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs = EMAIL_REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Email service timed out after ${Math.round(timeoutMs / 1000)} seconds`)
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

/**
 * Send file sharing email via Gmail API (Firebase Cloud Function)
 * REQUIRES: Cloud Function deployed and Gmail configured
 */
export const sendFileEmailViaCF = async (options: EmailOptions): Promise<boolean> => {
  try {
    const cloudFunctionURL = config.cloudFunctions.sendEmailUrl

    const response = await fetchWithTimeout(cloudFunctionURL, {
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

    const response = await fetchWithTimeout(backendURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    })

    if (!response.ok) {
      let errorMessage = 'Backend email service unavailable';
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // Fallback if response is not JSON
      }
      throw new Error(errorMessage);
    }

    const result = await response.json()
    console.log('Email sent via backend:', result.message)
    return true
  } catch (error) {
    console.error('Backend email failed, trying Cloud Function...', error)
    // Throw the error so sendFileViaEmail can handle it
    throw error;
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
      // Throw the original backend error instead of the CORS/CF error
      const finalError = backendError instanceof Error ? backendError : new Error(String(backendError));
      throw finalError
    }
  }
}
