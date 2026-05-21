/**
 * Application Configuration
 * Uses environment variables (or defaults for development)
 */

const env = (import.meta as any).env as Record<string, string>

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const config = {
  // Server & API Configuration
  server: {
    port: parseInt(env.VITE_SERVER_PORT || '3001'),
    apiBaseUrl: isLocal ? 'http://localhost:3001' : (env.VITE_API_BASE_URL || 'http://localhost:3001'),
    frontendUrl: isLocal ? window.location.origin : (env.VITE_FRONTEND_BASE_URL || 'http://localhost:5174'),
  },

  // Firebase Configuration
  firebase: {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  },

  // File Upload Settings
  file: {
    expiryHours: parseInt(env.VITE_FILE_EXPIRY_HOURS || '24'),
    maxSizeMB: parseInt(env.VITE_MAX_FILE_SIZE_MB || '500'),
  },

  // Cloud Functions
  cloudFunctions: {
    sendEmailUrl: env.VITE_CLOUD_FUNCTION_URL || 'https://us-central1-fileshare-b0e2c.cloudfunctions.net/sendShareEmail',
  },

  // URLs for sharing
  shareLinkBase: isLocal ? `${window.location.origin}/download` : (env.VITE_SHARE_LINK_BASE || 'https://droply.share/download'),

  // Environment Detection
  isDevelopment: !!(env.DEV),
  isProduction: !!(env.PROD),
}

/**
 * Validate that critical configuration is present
 */
export const validateConfig = (): string[] => {
  const errors: string[] = []

  if (!config.firebase.apiKey) {
    errors.push('Firebase API Key not configured')
  }
  if (!config.firebase.projectId) {
    errors.push('Firebase Project ID not configured')
  }

  if (errors.length === 0) {
    console.log('[AppConfig] ✅ All Firebase credentials loaded successfully')
  } else {
    console.error('[AppConfig] ❌ Configuration errors:', errors)
  }

  return errors
}

// Auto-run validation on module load
console.log('[AppConfig] Loading configuration...')
const configErrors = validateConfig()
if (configErrors.length > 0) {
  console.error('[AppConfig] CRITICAL: ', configErrors.join(', '))
  console.error('[AppConfig] Check your .env file for missing Firebase credentials')
}

export default config
