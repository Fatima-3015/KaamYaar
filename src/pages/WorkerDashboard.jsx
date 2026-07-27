import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot, collection, query, where, deleteDoc, getDocs } from 'firebase/firestore'
import { Home, Search, MessageSquare, User, MessageCircle } from 'lucide-react'
import { auth, db } from '../firebase'
import WorkerProfileForm from '../components/WorkerProfileForm'
import BrowseJobs from '../components/BrowseJobs'
import AIChat from '../components/AIChat'
import BottomNav from '../components/BottomNav'
import NotificationBell from '../components/NotificationBell'
import ChatModal from '../components/ChatModal'

// Translations Context and Toggle Component
import { useLanguage } from '../context/LanguageContext'
import LanguageToggle from '../components/LanguageToggle'

function WorkerDashboard() {
  const { t, tItem, language } = useLanguage()
  const isUrdu = language === 'ur'

  // Dynamic Navigation Items based on Language
  const NAV_ITEMS = [
    { key: 'home', label: t('home'), icon: Home },
    { key: 'jobs', label: t('jobs'), icon: Search },
    { key: 'messages', label: t('messages'), icon: MessageCircle },
    { key: 'chat', label: t('askAi'), icon: MessageSquare },
    { key: 'profile', label: t('profile'), icon: User }
  ]

  const [user, setUser] = useState(null)
  const [workerProfile, setWorkerProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  
  // States for Chat System
  const [chats, setChats] = useState([])
  const [loadingChats, setLoadingChats] = useState(true)
  const [selectedChat, setSelectedChat] = useState(null)
  const [isChatOpen, setIsChatOpen] = useState(false)

  // State for Multi-Select Chat Delete
  const [selectedChatIds, setSelectedChatIds] = useState([])

  // State for Logout Confirmation Modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const navigate = useNavigate()

  // Listen to Auth State
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

  // Real-time listener for Worker Profile
  useEffect(() => {
    if (!user) return

    const unsubProfile = onSnapshot(
      doc(db, 'workers', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setWorkerProfile(docSnap.data())
        } else {
          setWorkerProfile(null)
        }
      },
      (err) => {
        console.error('Error fetching worker profile:', err)
      }
    )

    return () => unsubProfile()
  }, [user])

  // Real-time listener for Worker's Inbox Chats
  useEffect(() => {
    if (!user) return

    setLoadingChats(true)
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    )

    const unsubChats = onSnapshot(
      q,
      (snapshot) => {
        const chatList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        setChats(chatList)
        setLoadingChats(false)
      },
      (err) => {
        console.error('Error fetching chats:', err)
        setLoadingChats(false)
      }
    )

    return () => unsubChats()
  }, [user])

  // Checkbox Select / Deselect Logic
  const toggleSelectChat = (chatId, e) => {
    e.stopPropagation()
    if (selectedChatIds.includes(chatId)) {
      setSelectedChatIds(selectedChatIds.filter((id) => id !== chatId))
    } else {
      setSelectedChatIds([...selectedChatIds, chatId])
    }
  }

  const handleSelectAll = () => {
    if (selectedChatIds.length === chats.length) {
      setSelectedChatIds([])
    } else {
      setSelectedChatIds(chats.map((c) => c.id))
    }
  }

  // Delete Subcollection Messages and Chat Doc
  const deleteChatFromFirestore = async (chatId) => {
    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const msgsSnap = await getDocs(messagesRef)
    const deletePromises = msgsSnap.docs.map((m) => deleteDoc(m.ref))
    await Promise.all(deletePromises)

    await deleteDoc(doc(db, 'chats', chatId))
  }

  // Delete Selected Multiple Chats
  const handleDeleteSelected = async () => {
    if (selectedChatIds.length === 0) return
    const confirmMsg = isUrdu ? 'کیا آپ منتخب کردہ چیٹس کو حذف کرنا چاہتے ہیں؟' : 'Are you sure you want to delete selected chats?'
    if (!window.confirm(confirmMsg)) return

    try {
      for (const chatId of selectedChatIds) {
        await deleteChatFromFirestore(chatId)
      }
      setSelectedChatIds([])
    } catch (err) {
      console.error("Error deleting chats:", err)
      alert(isUrdu ? 'منتخب چیٹس حذف کرنے میں ناکامی ہوئی۔' : 'Failed to delete selected chats.')
    }
  }

  // Delete Single Chat
  const handleDeleteSingleChat = async (chatId, e) => {
    e.stopPropagation()
    const confirmMsg = isUrdu ? 'کیا آپ اس چیٹ کو حذف کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this chat?'
    if (!window.confirm(confirmMsg)) return

    try {
      await deleteChatFromFirestore(chatId)
      setSelectedChatIds(selectedChatIds.filter((id) => id !== chatId))
    } catch (err) {
      console.error("Error deleting chat:", err)
      alert(isUrdu ? 'چیٹ حذف کرنے میں ناکامی ہوئی۔' : 'Failed to delete chat.')
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
      alert(isUrdu ? 'لاگ آؤٹ کرنے میں ناکامی ہوئی۔ دوبارہ کوشش کریں۔' : 'Failed to logout. Please try again.')
    }
  }

  const openChatModal = (chat) => {
    const recipientId = chat.participants.find((uid) => uid !== user.uid)
    setSelectedChat({
      recipientId: recipientId,
      recipientName: isUrdu ? 'کام دینے والا' : 'Employer',
      jobId: chat.jobId || '',
      jobTitle: chat.jobTitle || (isUrdu ? 'جاب چیٹ' : 'Job Chat')
    })
    setIsChatOpen(true)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium">
          {isUrdu ? 'ڈیش بورڈ لوڈ ہو رہا ہے...' : 'Loading dashboard...'}
        </p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 pb-20 font-sans ${isUrdu ? 'text-right' : 'text-left'}`} dir={isUrdu ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-amber-800 text-white px-4 sm:px-6 py-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold tracking-wide">
          {isUrdu ? 'کام یار — ورکر ڈیش بورڈ' : 'KaamYaar — Worker Dashboard'}
        </h1>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <NotificationBell user={user} />
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="bg-white text-amber-800 text-sm px-3.5 py-1.5 rounded-lg font-semibold hover:bg-gray-100 transition shadow-sm cursor-pointer"
          >
            {isUrdu ? 'لاگ آؤٹ' : 'Logout'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {activeTab === 'home' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              {isUrdu ? 'خوش آمدید، ' : 'Welcome, '}
              <span className="text-amber-800">{workerProfile?.name || user?.email}</span>
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {isUrdu 
                ? 'اپنا پروفائل سیٹ اپ کریں، اپنی مہارتیں دکھائیں اور مقامی جابز کے لیے اپلائی کرنا شروع کریں۔' 
                : 'Set up your profile, showcase your skills, and start applying for local jobs.'}
            </p>

            {/* Profile Completion Alert */}
            {!workerProfile ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 flex justify-between items-center">
                <div>
                  <p className="text-amber-800 font-semibold text-sm">
                    {isUrdu ? 'آپ کا پروفائل نامکمل ہے' : 'Your profile is incomplete'}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {isUrdu ? 'جابز تلاش کرنے اور دیکھنے کے لیے اپنی مہارت اور شہر کی معلومات درج کریں۔' : 'Enter your skill and city details to search and view jobs.'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="bg-amber-800 text-white text-xs px-3 py-2 rounded-lg font-medium hover:bg-amber-900 transition shrink-0 ml-3 cursor-pointer"
                >
                  {isUrdu ? 'پروفائل سیٹ کریں' : 'Set Profile'}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-6">
                <p className="text-green-800 font-semibold text-sm">
                  {isUrdu ? 'پروفائل فعال ہے ✓' : 'Profile Active ✓'}
                </p>
                <p className="text-xs text-green-700 mt-0.5">
                  {isUrdu ? 'مہارت: ' : 'Skill: '}<strong>{tItem(workerProfile.skill) || workerProfile.skill}</strong> | {isUrdu ? 'شہر: ' : 'City: '}<strong>{tItem(workerProfile.location) || workerProfile.location}</strong>
                </p>
              </div>
            )}

            {/* Quick Action Navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab('jobs')}
                className={`p-4 border border-amber-200 bg-amber-50/50 rounded-xl hover:border-amber-400 transition cursor-pointer ${isUrdu ? 'text-right' : 'text-left'}`}
              >
                <p className="font-bold text-amber-900">
                  {isUrdu ? 'دستیاب جابز تلاش کریں' : 'Browse Available Jobs'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {isUrdu ? 'اپنے شہر اور ہنر کے مطابق جابز دیکھیں' : 'Find jobs matching your city and skill'}
                </p>
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`p-4 border border-gray-200 bg-gray-50/50 rounded-xl hover:border-gray-400 transition cursor-pointer ${isUrdu ? 'text-right' : 'text-left'}`}
              >
                <p className="font-bold text-gray-800">
                  {isUrdu ? 'پیغامات اور انکوائریز' : 'Messages & Inquiries'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {isUrdu ? 'کام دینے والوں کی طرف سے پیغامات چیک کریں' : 'Check messages from employers'}
                </p>
              </button>
            </div>
          </div>
        )}

        {/* MESSAGES TAB (INBOX) */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <h3 className="text-lg font-bold text-amber-900">
                {isUrdu ? 'پیغامات اور انکوائریز' : 'Messages & Inquiries'}
              </h3>

              {chats.length > 0 && (
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* Select All Checkbox */}
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChatIds.length === chats.length && chats.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-amber-800 focus:ring-amber-700 cursor-pointer"
                    />
                    {isUrdu ? 'سب منتخب کریں' : 'Select All'}
                  </label>

                  {/* Multi-Delete Button */}
                  {selectedChatIds.length > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      🗑️ {isUrdu ? `حذف کریں (${selectedChatIds.length})` : `Delete (${selectedChatIds.length})`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {loadingChats ? (
              <p className="text-xs text-gray-400 text-center py-6">
                {isUrdu ? 'پیغامات لوڈ ہو رہے ہیں...' : 'Loading messages...'}
              </p>
            ) : chats.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs">
                <p className="text-sm font-medium text-gray-600">
                  {isUrdu ? 'کوئی پیغام موجود نہیں ہے' : 'No messages found'}
                </p>
                <p className="mt-1">
                  {isUrdu ? 'جب کام دینے والے آپ سے رابطہ کریں گے تو یہاں دکھائی دیں گے۔' : 'When employers contact you, they will appear here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {chats.map((chat) => {
                  const isSelected = selectedChatIds.includes(chat.id)

                  return (
                    <div
                      key={chat.id}
                      onClick={() => openChatModal(chat)}
                      className={`p-4 border rounded-xl transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-amber-600'
                      }`}
                    >
                      {/* Checkbox for Select */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectChat(chat.id, e)}
                        className="rounded border-gray-300 text-amber-800 focus:ring-amber-700 w-4 h-4 cursor-pointer shrink-0"
                      />

                      {/* Chat Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-800 truncate">
                          {chat.jobTitle || (isUrdu ? 'جاب انکوائری' : 'Job Inquiry')}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {chat.lastMessage || (isUrdu ? 'چیٹ دیکھنے کے لیے کلک کریں' : 'Click to view chat')}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-amber-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                          {isUrdu ? 'کھولیں' : 'Open'}
                        </span>
                        
                        {/* Single Delete Icon */}
                        <button
                          onClick={(e) => handleDeleteSingleChat(chat.id, e)}
                          title="Delete Chat"
                          className="text-gray-400 hover:text-red-600 text-sm p-1 transition cursor-pointer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-amber-900 mb-4">
              {isUrdu ? 'اے آئی ورکر معاون' : 'AI Worker Assistant'}
            </h3>
            <AIChat mode="jobs" />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-amber-900 mb-4">
              {isUrdu ? 'میری پروفائل' : 'My Profile'}
            </h3>
            <WorkerProfileForm user={user} initialProfile={workerProfile} onSave={() => setActiveTab('home')} />
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-amber-900 mb-4">
              {isUrdu ? 'دستیاب جابز' : 'Available Jobs'}
            </h3>
            <BrowseJobs user={user} workerProfile={workerProfile} />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav items={NAV_ITEMS} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Chat Modal for Worker */}
      {selectedChat && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentUser={user}
          recipientId={selectedChat.recipientId}
          recipientName={selectedChat.recipientName}
          jobId={selectedChat.jobId}
          jobTitle={selectedChat.jobTitle}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 text-center animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              ⚠️
            </div>
            
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {isUrdu ? 'کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟' : 'Are you sure you want to logout?'}
            </h3>
            
            <p className="text-xs text-gray-500 mb-6">
              {isUrdu ? 'अपने پیغامات اور جابز دیکھنے کے لیے آپ کو دوبارہ سائن ان کرنا پڑے گا۔' : 'You will need to sign in again to view your messages and jobs.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition cursor-pointer"
              >
                {isUrdu ? 'منسوخ کریں' : 'Cancel'}
              </button>
              
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                {isUrdu ? 'جی ہاں، لاگ آؤٹ' : 'Yes, Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkerDashboard