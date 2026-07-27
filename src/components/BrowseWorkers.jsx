import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, getDocs, limit, where } from 'firebase/firestore'
import { db } from '../firebase'
import ChatModal from './ChatModal'
import { useLanguage } from '../context/LanguageContext'

const SKILLS = ['All', 'Electrician', 'Painter', 'Mason', 'Laborer', 'Plumber', 'Carpenter', 'Other']
const CITIES = ['All', 'Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta']

// Urdu Translation Mapping for Cities
const CITY_TRANSLATIONS = {
  Lahore: 'لاہور',
  Karachi: 'کراچی',
  Islamabad: 'اسلام آباد',
  Faisalabad: 'فیصل آباد',
  Rawalpindi: 'راولپنڈی',
  Multan: 'ملتان',
  Peshawar: 'پشاور',
  Quetta: 'کوئٹہ'
}

function formatWhatsAppNumber(phone) {
  if (!phone) return ''
  const digitsOnly = phone.replace(/\D/g, '')
  if (digitsOnly.startsWith('0')) return '92' + digitsOnly.slice(1)
  if (digitsOnly.startsWith('92')) return digitsOnly
  return digitsOnly
}

function StarRating({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`text-sm ${star <= value ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>
      ))}
    </div>
  )
}

function BrowseWorkers({ user }) {
  const { t, tItem, language } = useLanguage()

  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [skillFilter, setSkillFilter] = useState('All')
  const [cityFilter, setCityFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedReviewsId, setExpandedReviewsId] = useState(null)
  const [reviewsByWorker, setReviewsByWorker] = useState({})
  const [loadingReviews, setLoadingReviews] = useState(false)

  // Track unlocked workers for contact privacy
  const [unlockedContacts, setUnlockedContacts] = useState({})

  // Chat Modal States
  const [chatOpen, setChatOpen] = useState(false)
  const [chatRecipient, setChatRecipient] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'workers'), orderBy('updatedAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Helper function to translate City
  const getCityName = (cityName) => {
    if (language === 'ur') {
      return CITY_TRANSLATIONS[cityName] || tItem(cityName) || cityName
    }
    return cityName
  }

  const filteredWorkers = workers.filter((worker) => {
    const skillMatch = skillFilter === 'All' || worker.skill === skillFilter
    const cityMatch = cityFilter === 'All' || worker.location === cityFilter
    const nameMatch = (worker.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    return skillMatch && cityMatch && nameMatch
  })

  const toggleReviews = async (workerId) => {
    if (expandedReviewsId === workerId) {
      setExpandedReviewsId(null)
      return
    }
    setExpandedReviewsId(workerId)
    if (!reviewsByWorker[workerId]) {
      setLoadingReviews(true)
      try {
        const q = query(
          collection(db, 'reviews'),
          where('workerId', '==', workerId),
          orderBy('createdAt', 'desc'),
          limit(5)
        )
        const snap = await getDocs(q)
        setReviewsByWorker((prev) => ({
          ...prev,
          [workerId]: snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        }))
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingReviews(false)
      }
    }
  }

  // Handle Open Chat & Automatically Unlock Direct Contact Details
  const handleOpenChat = (worker) => {
    if (!user) {
      alert(language === 'ur' ? 'پہلے لاگ ان کریں!' : 'Please login first!')
      return
    }

    // Unlock direct contact options for this worker
    setUnlockedContacts((prev) => ({ ...prev, [worker.id]: true }))

    setChatRecipient({
      id: worker.id,
      name: worker.name || 'Worker',
      jobId: `direct_${worker.id}`,
      jobTitle: `${worker.skill || 'Worker'} Direct Hire`
    })
    setChatOpen(true)
  }

  const handleLockedContactClick = () => {
    alert(
      language === 'ur'
        ? "پہلے 'چیٹ کریں' بٹن پر کلک کر کے ورکر سے بات شروع کریں!"
        : "Please click 'Chat' button first to talk to the worker!"
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-2 border-amber-700 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-500">
          {language === 'ur' ? 'ورکرز کی فہرست لوڈ ہو رہی ہے...' : 'Loading workers...'}
        </span>
      </div>
    )
  }

  return (
    <div>
      {/* Search Input */}
      <div className="mb-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={language === 'ur' ? 'ورکر کا نام تلاش کریں...' : 'Search by worker name...'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
        >
          {SKILLS.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? (t('allSkills') || 'تمام ہنر') : (tItem(s) || s)}
            </option>
          ))}
        </select>

        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? (t('allCities') || 'تمام شہر') : getCityName(c)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        {filteredWorkers.length} {language === 'ur' ? 'ورکرز مل گئے' : 'worker(s) found'}
      </p>

      {filteredWorkers.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          {language === 'ur' ? 'آپ کی تلاش کے مطابق کوئی ورکر نہیں ملا۔' : 'No workers match your search/filters.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredWorkers.map((worker) => {
            const isExpanded = expandedReviewsId === worker.id
            const reviews = reviewsByWorker[worker.id] || []
            const formattedPhone = formatWhatsAppNumber(worker.phone)
            const isUnlocked = unlockedContacts[worker.id]

            return (
              <div key={worker.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition flex flex-col bg-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {worker.photoURL ? (
                      <img src={worker.photoURL} alt={worker.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 text-lg">👤</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-amber-900 truncate">{worker.name}</h4>
                      {worker.verified && (
                        <span className="text-blue-600 text-sm" title={language === 'ur' ? 'تصدیق شدہ' : 'Verified'}>✔️</span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        worker.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {worker.available 
                        ? (language === 'ur' ? 'آج دستیاب ہے' : 'Available Today') 
                        : (language === 'ur' ? 'دستیاب نہیں' : 'Not Available')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500 mb-2">
                  <span>🛠️ {tItem(worker.skill) || worker.skill}</span>
                  <span>📍 {getCityName(worker.location)}</span>
                  <span>💰 {language === 'ur' ? `${worker.rate} روپے / دن` : `PKR ${worker.rate}/day`}</span>
                  {worker.experience !== undefined && (
                    <span>
                      🧰 {worker.experience} {language === 'ur' ? 'سال کا تجربہ' : `yr${worker.experience === 1 ? '' : 's'}`}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => toggleReviews(worker.id)}
                  className="flex items-center gap-2 mb-3 text-left cursor-pointer"
                >
                  <StarRating value={Math.round(worker.averageRating || 0)} />
                  <span className="text-sm text-gray-500">
                    {worker.averageRating ? worker.averageRating.toFixed(1) : (language === 'ur' ? 'کوئی ریٹنگ نہیں' : 'No ratings yet')}
                    {worker.ratingCount ? ` (${worker.ratingCount})` : ''}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mb-3 bg-gray-50 rounded-lg p-3 space-y-2">
                    {loadingReviews ? (
                      <p className="text-xs text-gray-400">
                        {language === 'ur' ? 'ریویوز لوڈ ہو رہے ہیں...' : 'Loading reviews...'}
                      </p>
                    ) : reviews.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        {language === 'ur' ? 'ابھی تک کوئی تحریری ریویو نہیں ہے۔' : 'No written reviews yet.'}
                      </p>
                    ) : (
                      reviews.map((r) => (
                        <div key={r.id} className="text-sm">
                          <StarRating value={r.rating} />
                          <p className="text-gray-600 mt-0.5">{r.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Direct Action Bar with Locked/Unlocked Options */}
                <div className="mt-auto pt-2 flex flex-wrap items-center gap-2">
                  {/* Primary In-App Chat Button */}
                  <button
                    onClick={() => handleOpenChat(worker)}
                    className="flex-1 inline-flex items-center justify-center gap-1 bg-amber-800 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-amber-900 transition shadow-xs cursor-pointer"
                  >
                    💬 {language === 'ur' ? 'چیٹ کریں' : 'Chat'}
                  </button>

                  {/* WhatsApp Option (Unlocked after Chat) */}
                  {isUnlocked && worker.phone ? (
                    <a
                      href={`https://wa.me/${formattedPhone}?text=${encodeURIComponent(
                        language === 'ur'
                          ? `السلام علیکم ${worker.name}، میں نے کام یار ایپ پر آپ کی پروفائل دیکھی ہے۔ کیا آپ کام کے لیے دستیاب ہیں؟`
                          : `Assalam-o-Alaikum ${worker.name}, maine KaamYaar app par aap ki profile dekhi hai. Kya aap kaam ke liye available hain?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 bg-green-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-green-700 transition"
                    >
                      📱 WhatsApp
                    </a>
                  ) : (
                    <button
                      onClick={handleLockedContactClick}
                      className="inline-flex items-center justify-center gap-1 bg-gray-100 text-gray-400 border border-gray-200 text-xs font-semibold py-2 px-3 rounded-lg cursor-not-allowed"
                      title={language === 'ur' ? 'پہلے چیٹ پر کلک کریں' : 'Click Chat first to unlock'}
                    >
                      🔒 WhatsApp
                    </button>
                  )}

                  {/* Call Option (Unlocked after Chat) */}
                  {isUnlocked && worker.phone ? (
                    <a
                      href={`tel:${worker.phone}`}
                      className="inline-flex items-center justify-center gap-1 bg-gray-700 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-gray-800 transition"
                    >
                      📞 {language === 'ur' ? 'کال' : 'Call'}
                    </a>
                  ) : (
                    <button
                      onClick={handleLockedContactClick}
                      className="inline-flex items-center justify-center gap-1 bg-gray-100 text-gray-400 border border-gray-200 text-xs font-semibold py-2 px-3 rounded-lg cursor-not-allowed"
                      title={language === 'ur' ? 'پہلے چیٹ پر کلک کریں' : 'Click Chat first to unlock'}
                    >
                      🔒 {language === 'ur' ? 'کال' : 'Call'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Real-time In-App Chat Modal */}
      <ChatModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        currentUser={user}
        recipientId={chatRecipient?.id}
        recipientName={chatRecipient?.name}
        jobId={chatRecipient?.jobId}
        jobTitle={chatRecipient?.jobTitle}
      />
    </div>
  )
}

export default BrowseWorkers