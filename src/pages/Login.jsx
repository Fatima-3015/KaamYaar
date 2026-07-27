import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useLanguage } from '../context/LanguageContext'
import LanguageToggle from '../components/LanguageToggle'
import { sendOtp, resetRecaptcha } from '../phoneAuth'

function Login() {
  const { t } = useLanguage()
  const [authMethod, setAuthMethod] = useState('email') // 'email' or 'phone'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    return () => resetRecaptcha()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/role-select')
    } catch (err) {
      console.error("Firebase Auth Error:", err.code, err.message)

      // Firebase error codes control
      switch (err.code) {
        case 'auth/user-not-found':
          setError('You don\'t have an account yet — please sign up.')
          break
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.')
          break
        case 'auth/invalid-credential':
          // Firebase Modular v9+ returned invalid-credential on wrong password
          setError('Invalid email or password. Please check your credentials.')
          break
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.')
          break
        case 'auth/invalid-email':
          setError('Invalid email address format.')
          break
        default:
          setError('Something went wrong. Please check your details and try again.')
          break
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!phone.trim()) {
      setError('Please enter your phone number.')
      return
    }
    setLoading(true)
    try {
      const result = await sendOtp(phone, 'recaptcha-container-login')
      setConfirmationResult(result)
    } catch (err) {
      console.error(err)
      setError('Failed to send OTP. Please check the number and try again.')
      resetRecaptcha()
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!otp.trim()) {
      setError('Please enter the OTP code.')
      return
    }
    setLoading(true)
    try {
      const result = await confirmationResult.confirm(otp)
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      if (!userDoc.exists()) {
        navigate('/signup')
      } else {
        navigate('/role-select')
      }
    } catch (err) {
      console.error(err)
      setError('Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchMethod = (method) => {
    setAuthMethod(method)
    setError('')
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
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"></div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10">
        <div className="absolute top-4 right-4">
          <LanguageToggle />
        </div>

        <h1 className="text-3xl font-bold text-center text-green-900 mb-2">KaamYaar</h1>
        <p className="text-center text-gray-600 mb-6">{t('loginTitle')}</p>

        {/* Method Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
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
            {error.includes('sign up') && (
              <Link to="/signup" className="block underline font-semibold mt-1">
                Go to Sign Up
              </Link>
            )}
          </div>
        )}

        {authMethod === 'email' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('emailLabel')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">{t('passwordLabel')}</label>
                <Link to="/forgot-password" className="text-sm text-green-800 font-semibold hover:underline">
                  {t('forgotPasswordLink')}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-700 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 focus:outline-none"
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
              className="w-full bg-green-800 text-white text-lg font-semibold py-3 rounded-lg hover:bg-green-900 transition disabled:opacity-50"
            >
              {loading ? t('loggingIn') : t('login')}
            </button>
          </form>
        ) : (
          <div>
            {!confirmationResult ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                    placeholder="03001234567"
                  />
                </div>
                <div id="recaptcha-container-login"></div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-800 text-white text-lg font-semibold py-3 rounded-lg hover:bg-green-900 transition disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enter 6-digit OTP</label>
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
                  className="w-full bg-green-800 text-white text-lg font-semibold py-3 rounded-lg hover:bg-green-900 transition disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Log In'}
                </button>
              </form>
            )}
          </div>
        )}

        <p className="text-center text-gray-600 mt-6">
          {t('noAccount')}{' '}
          <Link to="/signup" className="text-green-800 font-semibold underline">
            {t('signup')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login