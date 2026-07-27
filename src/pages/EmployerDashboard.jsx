import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { Home, Search, PlusCircle, MessageSquare, Briefcase } from 'lucide-react'
import { auth } from '../firebase'
import PostJobForm from '../components/PostJobForm'
import MyPostedJobs from '../components/MyPostedJobs'
import BrowseWorkers from '../components/BrowseWorkers'
import AIChat from '../components/AIChat'
import BottomNav from '../components/BottomNav'
import NotificationBell from '../components/NotificationBell'

import { useLanguage } from '../context/LanguageContext'
import LanguageToggle from '../components/LanguageToggle'

function EmployerDashboard() {
  const { t, language } = useLanguage()

  const NAV_ITEMS = [
    { key: 'home', label: t('home'), icon: Home },
    { key: 'workers', label: t('workers'), icon: Search },
    { key: 'post', label: t('post'), icon: PlusCircle },
    { key: 'chat', label: t('askAi'), icon: MessageSquare },
    { key: 'jobs', label: t('myJobs'), icon: Briefcase }
  ]

  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login')
      } else {
        setUser(currentUser)
      }
    })
    return () => unsubscribe()
  }, [navigate])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (err) {
      console.error('Logout Error:', err)
      alert('Failed to log out. Please try again.')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium">Loading Dashboard...</p>
      </div>
    )
  }

  const isUrdu = language === 'ur'

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-green-800 text-white px-4 sm:px-6 py-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold tracking-wide">KaamYaar — Employer</h1>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <NotificationBell user={user} />
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="bg-white text-green-800 text-sm px-3.5 py-1.5 rounded-lg font-semibold hover:bg-gray-100 transition shadow-sm"
          >
            {t('logout')}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {activeTab === 'home' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              {t('welcome')}, <span className="text-green-800">{user?.email}</span>
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              {t('employerDashboardDesc') || 'Post a job requirement and connect with available workers near you.'}
            </p>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab('post')}
                className="p-4 border border-green-200 bg-green-50/50 rounded-xl text-left hover:border-green-400 transition"
              >
                <p className="font-bold text-green-900">➕ {t('postNewJob') || 'Post a New Job'}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {t('postNewJobDesc') || 'Hire electricians, painters, plumbers, and more.'}
                </p>
              </button>
              <button
                onClick={() => setActiveTab('workers')}
                className="p-4 border border-amber-200 bg-amber-50/50 rounded-xl text-left hover:border-amber-400 transition"
              >
                <p className="font-bold text-amber-900">🔍 {t('browseWorkers') || 'Browse Available Workers'}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {t('browseWorkersDesc') || 'Directly search and contact skilled workers.'}
                </p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-green-900 mb-4">{t('askAiTitle') || 'Ask AI to Find a Worker'}</h3>
            <AIChat mode="workers" />
          </div>
        )}

        {activeTab === 'post' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-green-900 mb-4">{t('postNewJob') || 'Post a Job'}</h3>
            <PostJobForm user={user} onSuccess={() => setActiveTab('jobs')} />
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-green-900 mb-4">{t('myJobs') || 'My Posted Jobs'}</h3>
            <MyPostedJobs user={user} />
          </div>
        )}

        {activeTab === 'workers' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-green-900 mb-4">{t('browseWorkers') || 'Browse Workers'}</h3>
            <BrowseWorkers user={user} />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav items={NAV_ITEMS} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 text-center animate-in fade-in zoom-in duration-150"
            dir={isUrdu ? 'rtl' : 'ltr'}
          >
            <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              ⚠️
            </div>

            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {t('logoutTitle') || 'Are you sure you want to log out?'}
            </h3>

            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              {t('logoutDescription') || 'You will need to sign in again to view your posted jobs and messages.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                {t('yesLogout') || 'Yes, Logout'}
              </button>

              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition cursor-pointer"
              >
                {t('cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployerDashboard