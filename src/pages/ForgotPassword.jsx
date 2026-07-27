import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase'
import { useLanguage } from '../context/LanguageContext'
import LanguageToggle from '../components/LanguageToggle'

function ForgotPassword() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess(true)
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1920')`
      }}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"></div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10">
        <div className="absolute top-4 right-4">
          <LanguageToggle />
        </div>

        <h1 className="text-3xl font-bold text-center text-green-900 mb-2">KaamYaar</h1>
        <p className="text-center text-gray-600 mb-6">{t('resetPasswordTitle')}</p>

        {success ? (
          <div className="bg-green-100 text-green-800 p-4 rounded-lg text-sm text-center">
            {t('resetEmailSent')} <strong>{email}</strong>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-800 text-white text-lg font-semibold py-3 rounded-lg hover:bg-green-900 transition disabled:opacity-50"
            >
              {loading ? t('sending') : t('sendResetLink')}
            </button>
          </form>
        )}

        <p className="text-center text-gray-600 mt-6">
          <Link to="/" className="text-green-800 font-semibold underline">
            {t('backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword