import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { auth } from './firebase'

let recaptchaVerifier = null

function clearContainer(containerId) {
  const el = document.getElementById(containerId)
  if (el) el.innerHTML = ''
}

export function resetRecaptcha(containerId) {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear()
    } catch {
      // already cleared, ignore
    }
    recaptchaVerifier = null
  }
  if (containerId) clearContainer(containerId)
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

  // Har attempt se pehle purana verifier/DOM clean karo — taake "already rendered" na aaye
  resetRecaptcha(containerId)

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible'
  })

  try {
    return await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier)
  } catch (err) {
    resetRecaptcha(containerId)
    throw err
  }
}