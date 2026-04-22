import { initializeApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { config } from './appConfig'

// Firebase Configuration
const firebaseConfig = {
  apiKey: config.firebase.apiKey,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket,
  messagingSenderId: config.firebase.messagingSenderId,
  appId: config.firebase.appId,
}

console.log('[Firebase] Initializing with config:', {
  apiKey: firebaseConfig.apiKey ? '***set***' : 'NOT SET',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  appId: firebaseConfig.appId,
})

// Initialize Firebase
const app = initializeApp(firebaseConfig)
console.log('[Firebase] App initialized successfully')

// Get Firebase Services
export const storage = getStorage(app)
console.log('[Firebase] Storage service initialized')

export const db = getFirestore(app)
console.log('[Firebase] Firestore service initialized')

export const auth = getAuth(app)
console.log('[Firebase] Auth service initialized')

export const googleProvider = new GoogleAuthProvider()

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account',
})
console.log('[Firebase] Google Auth Provider configured')

export default app
