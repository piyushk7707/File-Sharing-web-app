import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  User,
  AuthError as FirebaseAuthError,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'

export interface AuthResult {
  success: boolean
  user?: User | null
  message: string
  error?: string
}

export const authService = {
  /**
   * Register a new user with email and password
   */
  async register(email: string, password: string, displayName: string): Promise<AuthResult> {
    try {
      console.log('[AuthService] Starting registration...', { email, displayName })
      await setPersistence(auth, browserLocalPersistence)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      console.log('[AuthService] User created in Firebase')
      
      await updateProfile(userCredential.user, {
        displayName: displayName,
      })
      console.log('[AuthService] User profile updated')
      
      console.log('[AuthService] Registration successful!', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      })
      
      return {
        success: true,
        user: userCredential.user,
        message: 'Registration successful!',
      }
    } catch (error: any) {
      const authError = error as FirebaseAuthError
      let message = 'Registration failed'

      console.error('[AuthService] Registration error:', {
        code: authError.code,
        message: authError.message,
      })

      if (authError.code === 'auth/email-already-in-use') {
        message = 'Email is already in use'
      } else if (authError.code === 'auth/weak-password') {
        message = 'Password is too weak (minimum 6 characters)'
      } else if (authError.code === 'auth/invalid-email') {
        message = 'Invalid email address'
      }

      return {
        success: false,
        user: null,
        message: message,
        error: authError.code,
      }
    }
  },

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      console.log('[AuthService] Starting login...', { email })
      await setPersistence(auth, browserLocalPersistence)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      console.log('[AuthService] Login successful!', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      })
      
      return {
        success: true,
        user: userCredential.user,
        message: 'Login successful!',
      }
    } catch (error: any) {
      const authError = error as FirebaseAuthError
      let message = 'Login failed'

      console.error('[AuthService] Login error:', {
        code: authError.code,
        message: authError.message,
      })

      if (authError.code === 'auth/user-not-found') {
        message = 'Email not found'
      } else if (authError.code === 'auth/wrong-password') {
        message = 'Incorrect password'
      } else if (authError.code === 'auth/invalid-email') {
        message = 'Invalid email address'
      } else if (authError.code === 'auth/too-many-requests') {
        message = 'Too many login attempts. Please try again later.'
      }

      return {
        success: false,
        user: null,
        message: message,
        error: authError.code,
      }
    }
  },

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<AuthResult> {
    try {
      console.log('[AuthService] Starting Google Sign-in...')
      console.log('[AuthService] Auth instance configured:', auth ? 'yes' : 'no')
      console.log('[AuthService] Google Provider configured:', googleProvider ? 'yes' : 'no')
      
      // Ensure persistence is set
      await setPersistence(auth, browserLocalPersistence)
      console.log('[AuthService] Persistence set to LOCAL')
      
      // Add a small delay to ensure everything is ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log('[AuthService] Triggering Google Sign-in popup...')
      const result = await signInWithPopup(auth, googleProvider)
      
      console.log('[AuthService] Google Sign-in successful!', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
      })
      
      return {
        success: true,
        user: result.user,
        message: 'Google sign-in successful!',
      }
    } catch (error: any) {
      const authError = error as FirebaseAuthError
      let message = 'Google sign-in failed'

      console.error('[AuthService] Google Sign-in Error:', {
        code: authError.code,
        message: authError.message,
        fullError: error
      })

      if (authError.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in popup was closed. Please try again.'
      } else if (authError.code === 'auth/popup-blocked') {
        message = 'Pop-ups are blocked. Allow pop-ups in browser settings and try again.'
      } else if (authError.code === 'auth/account-exists-with-different-credential') {
        message = 'Email already exists. Try a different sign-in method.'
      } else if (authError.code === 'auth/network-request-failed') {
        message = 'Network error. Check internet connection.'
      } else if (authError.code === 'auth/operation-not-supported-in-this-environment') {
        message = 'Pop-ups not supported. Use a standard browser.'
      } else if (authError.code === 'auth/cancelled-popup-request') {
        message = 'Sign-in was cancelled. Please try again.'
      } else if (authError.code === 'auth/invalid-api-key') {
        message = 'Firebase API key is invalid. Check Firebase configuration.'
      } else if (authError.message?.includes('CORS')) {
        message = 'CORS error. Contact admin about domain configuration.'
      }

      return {
        success: false,
        user: null,
        message: message,
        error: authError.code,
      }
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string): Promise<AuthResult> {
    try {
      await sendPasswordResetEmail(auth, email)
      return {
        success: true,
        message: 'Password reset email sent! Check your inbox (and spam folder) for the reset link.',
      }
    } catch (error: any) {
      const authError = error as FirebaseAuthError
      let message = 'Failed to send reset email'

      if (authError.code === 'auth/user-not-found') {
        message = 'No account found with this email address'
      } else if (authError.code === 'auth/invalid-email') {
        message = 'Invalid email address'
      } else if (authError.code === 'auth/too-many-requests') {
        message = 'Too many reset requests. Please try again later.'
      }

      return {
        success: false,
        message: message,
        error: authError.code,
      }
    }
  },

  /**
   * Logout current user
   */
  async logout() {
    try {
      console.log('[AuthService] Logging out user...')
      await signOut(auth)
      console.log('[AuthService] Logout successful')
      return {
        success: true,
        message: 'Logged out successfully',
      }
    } catch (error: any) {
      console.error('[AuthService] Logout error:', error)
      return {
        success: false,
        message: 'Logout failed: ' + error.message,
      }
    }
  },

  /**
   * Get current user
   */
  getCurrentUser() {
    const currentUser = auth.currentUser
    console.log('[AuthService] getCurrentUser:', {
      isUser: currentUser !== null,
      email: currentUser?.email,
    })
    return currentUser
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    console.log('[AuthService] Setting up auth state listener')
    return auth.onAuthStateChanged((user) => {
      console.log('[AuthService] onAuthStateChanged triggered:', {
        isUser: user !== null,
        email: user?.email,
      })
      callback(user)
    })
  },
}
