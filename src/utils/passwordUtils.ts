/**
 * Generate a secure random password for file encryption
 * Uses alphanumeric characters + special chars for strength
 */
export const generateSecurePassword = (length: number = 32): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  
  // Use crypto API for secure randomness
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length]
  }
  
  return password
}

/**
 * Generate a URL-safe password that can be embedded in links
 * Uses only alphanumeric characters
 */
export const generateUrlSafePassword = (length: number = 24): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length]
  }
  
  return password
}
