import { initializeApp, getApps, getApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { 
  getAuth, 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth'
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

// Initialize Firebase (prevent multiple initializations in development/HMR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
console.log('[Firebase] App initialized successfully')

// Get Firebase Services
export const storage = getStorage(app)
console.log('[Firebase] Storage service initialized')

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  experimentalAutoDetectLongPolling: true,
})
console.log('[Firebase] Firestore service initialized with persistent local cache')

export const auth = getAuth(app)
console.log('[Firebase] Auth service initialized')

// Ensure authentication state persists across browser reloads
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('[Firebase] Auth persistence set to browserLocalPersistence');
  })
  .catch((error) => {
    console.error('[Firebase] Auth persistence error:', error);
  });

export const googleProvider = new GoogleAuthProvider()

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account',
})
console.log('[Firebase] Google Auth Provider configured')

export default app
