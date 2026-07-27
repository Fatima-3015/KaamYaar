import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { sendOtp, resetRecaptcha } from '../phoneAuth'
import { useLanguage } from '../context/LanguageContext'

function Signup() {
  const { language } = useLanguage ? useLanguage() : { language: 'en' }
  const isUrdu = language === 'urdu' || language === 'ur'

  const [authMethod, setAuthMethod] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    return () => resetRecaptcha()
  }, [])

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    // Strong Password Validation: Min 8 chars, at least one number and one special character
    const minLength = 8
    const hasNumber = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (password.length < minLength || !hasNumber || !hasSpecialChar) {
      setError(
        isUrdu
          ? 'پاس ورڈ کم از کم 8 حروف کا ہونا چاہیے اور اس میں کم از کم ایک نمبر اور ایک اسپیشل کیریکٹر (!@#$...) شامل ہونا لازمی ہے۔'
          : 'Password must be at least 8 characters long and contain at least one number and one special character.'
      )
      return
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Send Email Verification
      await sendEmailVerification(user)

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        createdAt: new Date().toISOString()
      })

      // Sign out user so they verify email before logging in
      await signOut(auth)

      setSuccessMessage(
        isUrdu
          ? 'تصدیقی ای میل آپ کے ان باکس میں بھیج دی گئی ہے۔ براہ کرم ای میل verify کرنے کے بعد لاگ ان کریں۔'
          : 'Verification email sent! Please check your inbox and verify your email before logging in.'
      )
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError(
          isUrdu
            ? 'آپ کا اکاؤنٹ پہلے سے موجود ہے — براہ کرم لاگ ان کریں۔'
            : 'You already have an account — please log in instead.'
        )
      } else if (err.code === 'auth/invalid-email') {
        setError(
          isUrdu
            ? 'براہ کرم درست ای میل پتہ درج کریں۔'
            : 'Please enter a valid email address.'
        )
      } else {
        setError(
          isUrdu
            ? 'کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔'
            : 'Something went wrong. Please try again.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    if (!phone.trim()) {
      setError(
        isUrdu
          ? 'براہ کرم اپنا موبائل نمبر درج کریں۔'
          : 'Please enter your phone number.'
      )
      return
    }

    // Format phone number for Pakistan (+92) if user typed '03...'
    let formattedPhone = phone.trim()
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+92' + formattedPhone.slice(1)
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone
    }

    setLoading(true)
    try {
      const result = await sendOtp(formattedPhone, 'recaptcha-container-signup')
      setConfirmationResult(result)
    } catch (err) {
      console.error(err)
      setError(
        isUrdu
          ? 'او ٹی پی بھیجنے میں ناکامی ہوئی۔ نمبر چیک کر کے دوبارہ کوشش کریں۔'
          : 'Failed to send OTP. Please check the number and try again.'
      )
      resetRecaptcha()
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    if (!otp.trim()) {
      setError(
        isUrdu
          ? 'براہ کرم 6 ہندسوں کا او ٹی پی درج کریں۔'
          : 'Please enter the OTP code.'
      )
      return
    }
    setLoading(true)
    try {
      const result = await confirmationResult.confirm(otp)
      const user = result.user

      await setDoc(doc(db, 'users', user.uid), {
        phone: user.phoneNumber,
        createdAt: new Date().toISOString()
      })

      navigate('/role-select')
    } catch (err) {
      console.error(err)
      setError(
        isUrdu
          ? 'غلط او ٹی پی۔ براہ کرم دوبارہ کوشش کریں۔'
          : 'Invalid OTP. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const switchMethod = (method) => {
    setAuthMethod(method)
    setError('')
    setSuccessMessage('')
    setConfirmationResult(null)
    setOtp('')
    resetRecaptcha()
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1920')`
      }}
      dir={isUrdu ? 'rtl' : 'ltr'}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"></div>

      <div className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 ${isUrdu ? 'text-right' : 'text-left'}`}>
        <h1 className="text-3xl font-bold text-center text-green-900 mb-2">کام یار / KaamYaar</h1>
        <p className="text-center text-gray-600 mb-6">
          {isUrdu ? 'اپنا اکاؤنٹ بنائیں' : 'Create your account'}
        </p>

        {/* Method Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-5" dir="ltr">
          <button
            type="button"
            onClick={() => switchMethod('email')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${authMethod === 'email' ? 'bg-white text-green-800 shadow' : 'text-gray-500'}`}
          >
            📧 Email
          </button>
          <button
            type="button"
            onClick={() => switchMethod('phone')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${authMethod === 'phone' ? 'bg-white text-green-800 shadow' : 'text-gray-500'}`}
          >
            📱 Mobile OTP
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {error}
            {error.includes('log in') || error.includes('لاگ ان') ? (
              <Link to="/" className="block underline font-semibold mt-1">
                {isUrdu ? 'لاگ ان کریں' : 'Go to Log In'}
              </Link>
            ) : null}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 text-green-800 p-3 rounded-lg mb-4 text-sm font-medium">
            {successMessage}
            <Link to="/" className="block underline font-semibold mt-2 text-green-900">
              {isUrdu ? 'یہاں سے لاگ ان کریں' : 'Go to Log In'}
            </Link>
          </div>
        )}

        {authMethod === 'email' ? (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isUrdu ? 'ای میل ایڈریس' : 'Email Address'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-700 ${isUrdu ? 'text-right' : 'text-left'}`}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isUrdu ? 'پاس ورڈ (کم از کم 8 حروف، نمبر اور اسپیشل کیریکٹر)' : 'Password (Min 8 chars, number & special char)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-700 ${isUrdu ? 'pl-12 pr-4 text-right' : 'pr-12 pl-4 text-left'}`}
                  placeholder={isUrdu ? 'مضبوط پاس ورڈ درج کریں' : 'At least 8 characters'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 focus:outline-none ${isUrdu ? 'left-3' : 'right-3'}`}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c1.341-4.592 5.472-8 10.222-8 4.75 0 8.88 3.408 10.22 8-1.34 4.592-5.47 8-10.22 8-4.75 0-8.88-3.408-10.22-8z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-800 text-white text-lg font-semibold py-3 rounded-lg hover:bg-green-900 transition disabled:opacity-50 cursor-pointer"
            >
              {loading 
                ? (isUrdu ? 'اکاؤنٹ بن رہا ہے...' : 'Creating account...') 
                : (isUrdu ? 'سائن اپ کریں' : 'Sign Up')}
            </button>
          </form>
        ) : (
          <div>
            {!confirmationResult ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isUrdu ? 'موبایل نمبر' : 'Mobile Number'}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-700 ${isUrdu ? 'text-right' : 'text-left'}`}
                    placeholder="03001234567"
                  />
                </div>
                <div id="recaptcha-container-signup"></div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-800 text-white text-lg font-semibold py-3 rounded-lg hover:bg-green-900 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading 
                    ? (isUrdu ? 'بھیجا جا रहा ہے...' : 'Sending...') 
                    : (isUrdu ? 'او ٹی پی بھیجیں' : 'Send OTP')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isUrdu ? '6 ہندسوں کا او ٹی پی درج کریں' : 'Enter 6-digit OTP'}
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-green-700"
                    placeholder="123456"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-800 text-white text-lg font-semibold py-3 rounded-lg hover:bg-green-900 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading 
                    ? (isUrdu ? 'تصدیق ہو رہی ہے...' : 'Verifying...') 
                    : (isUrdu ? 'تصدیق کر کے سائن اپ کریں' : 'Verify & Sign Up')}
                </button>
              </form>
            )}
          </div>
        )}

        <p className="text-center text-gray-600 mt-6">
          {isUrdu ? 'پہلے سے اکاؤنٹ موجود ہے؟' : "Already have an account?"}{' '}
          <Link to="/" className="text-green-800 font-semibold underline">
            {isUrdu ? 'لاگ ان کریں' : 'Log In'}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signup