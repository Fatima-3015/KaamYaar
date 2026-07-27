import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from './firebase'

// Singleton pattern — survives React Fast Refresh / re-renders
let recaptchaVerifier = null

export function getRecaptchaVerifier(containerId) {
  if (recaptchaVerifier) {
    return recaptchaVerifier
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible'
  })
  return recaptchaVerifier
}

export function resetRecaptcha() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear()
    recaptchaVerifier = null
  }
}

export function formatPakistaniPhone(phone) {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.slice(1)
  }
  if (!cleaned.startsWith('92')) {
    cleaned = '92' + cleaned
  }
  return '+' + cleaned
}

export async function sendOtp(phoneNumber, containerId) {
  const formattedPhone = formatPakistaniPhone(phoneNumber)
  const verifier = getRecaptchaVerifier(containerId)
  return await signInWithPhoneNumber(auth, formattedPhone, verifier)
}