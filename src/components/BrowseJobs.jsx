import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import ChatModal from './ChatModal'
import { useLanguage } from '../context/LanguageContext'

// مہارتوں کو انگریزی اور اردو میں سیٹ کیا گیا ہے
const SKILLS = [
  { en: 'All', ur: 'تمام مہارتیں' },
  { en: 'Electrician', ur: 'الیکٹرنشین' },
  { en: 'Painter', ur: 'پینٹر' },
  { en: 'Mason', ur: 'راج مستری' },
  { en: 'Laborer', ur: 'مزدور' },
  { en: 'Plumber', ur: 'پلمبر' },
  { en: 'Carpenter', ur: 'بڑھئی' },
  { en: 'Other', ur: 'دیگر' }
]

// شہروں کے نام انگریزی اور اردو میں
const CITIES = [
  { en: 'All', ur: 'تمام شہر' },
  { en: 'Lahore', ur: 'لاہور' },
  { en: 'Karachi', ur: 'کراچی' },
  { en: 'Islamabad', ur: 'اسلام آباد' },
  { en: 'Faisalabad', ur: 'فیصل آباد' },
  { en: 'Rawalpindi', ur: 'راولپنڈی' },
  { en: 'Multan', ur: 'ملتان' },
  { en: 'Peshawar', ur: 'پشاور' },
  { en: 'Quetta', ur: 'کوئٹہ' }
]

// شہروں اور مہارتوں کا درست نام نکالنے کے فنکشنز
const getCityName = (cityEn, isUrdu) => {
  const found = CITIES.find(c => c.en.toLowerCase() === (cityEn || '').toLowerCase())
  return found ? (isUrdu ? found.ur : found.en) : cityEn
}

const getSkillName = (skillEn, isUrdu) => {
  const found = SKILLS.find(s => s.en.toLowerCase() === (skillEn || '').toLowerCase())
  return found ? (isUrdu ? found.ur : found.en) : skillEn
}

function BrowseJobs({ user, workerProfile }) {
  const { language } = useLanguage ? useLanguage() : { language: 'en' }
  const isUrdu = language === 'urdu' || language === 'ur'

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [skillFilter, setSkillFilter] = useState('All')
  const [cityFilter, setCityFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedJobIds, setAppliedJobIds] = useState([])
  const [applyingJobId, setApplyingJobId] = useState(null)
  const [bidPrice, setBidPrice] = useState('')
  const [submittingBid, setSubmittingBid] = useState(false)

  // Chat Modal States
  const [chatOpen, setChatOpen] = useState(false)
  const [chatRecipient, setChatRecipient] = useState(null)

  // Fetch all jobs in real-time
  useEffect(() => {
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Fetch worker's applications to mark already applied jobs
  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'applications'), where('workerId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppliedJobIds(snapshot.docs.map((doc) => doc.data().jobId))
    })
    return () => unsubscribe()
  }, [user])

  const filteredJobs = jobs.filter((job) => {
    const skillMatch = skillFilter === 'All' || job.skill === skillFilter
    const cityMatch = cityFilter === 'All' || job.location === cityFilter
    const term = searchTerm.toLowerCase()
    
    // سرچ میں اردو اور انگریزی دونوں الفاظ چیک کریں گے
    const searchMatch =
      (job.skill || '').toLowerCase().includes(term) ||
      (job.location || '').toLowerCase().includes(term) ||
      getCityName(job.location, true).toLowerCase().includes(term) ||
      getSkillName(job.skill, true).toLowerCase().includes(term)

    return skillMatch && cityMatch && searchMatch
  })

  const formatWhatsAppNumber = (phone) => {
    if (!phone) return ''
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) cleaned = '92' + cleaned.slice(1)
    return cleaned
  }

  const startApply = (jobId, defaultPay) => {
    setApplyingJobId(jobId)
    setBidPrice(defaultPay ? String(defaultPay) : '')
  }

  const cancelApply = () => {
    setApplyingJobId(null)
    setBidPrice('')
  }

  const handleSubmitApplication = async (job) => {
    if (!bidPrice || Number(bidPrice) <= 0) {
      alert(isUrdu ? 'براہ کرم اپنی قیمت کی پیشکش درج کریں۔' : 'Please enter your bid price.')
      return
    }
    if (!workerProfile) {
      alert(isUrdu ? 'اپلائی کرنے سے پہلے براہ کرم اپنا ورکر پروفائل مکمل کریں۔' : 'Please complete your worker profile before applying.')
      return
    }

    setSubmittingBid(true)
    try {
      await addDoc(collection(db, 'applications'), {
        jobId: job.id,
        employerId: job.employerId,
        workerId: user.uid,
        workerName: workerProfile.name || user.email,
        workerSkill: workerProfile.skill || '',
        workerPhone: workerProfile.phone || '',
        proposedPrice: Number(bidPrice),
        status: 'pending',
        appliedAt: new Date().toISOString()
      })

      // Create notification for the employer
      const notificationMsg = isUrdu 
        ? `${workerProfile.name || 'ایک ورکر'} نے آپ کی "${getSkillName(job.skill, true)} کی ضرورت" جاب کے لیے ${bidPrice} روپے/دن کی پیشکش کے ساتھ اپلائی کیا ہے۔`
        : `${workerProfile.name || 'A worker'} has applied for your "${job.skill}" job with a bid of ${bidPrice} PKR/day.`

      await addDoc(collection(db, 'notifications'), {
        userId: job.employerId,
        type: 'new_application',
        message: notificationMsg,
        jobId: job.id,
        read: false,
        createdAt: new Date().toISOString()
      })

      cancelApply()
    } catch (err) {
      console.error(err)
      alert(isUrdu ? 'اپلائی کرنے میں ناکامی ہوئی۔ براہ کرم دوبارہ کوشش کریں۔' : 'Failed to apply. Please try again.')
    } finally {
      setSubmittingBid(false)
    }
  }

  // Handle In-App Chat Modal
  const handleOpenChat = (employerId, jobTitle, jobId) => {
    if (!user) {
      alert(isUrdu ? 'پہلے لاگ ان کریں!' : 'Please login first!')
      return
    }
    setChatRecipient({
      id: employerId,
      name: isUrdu ? 'کام دینے والا' : 'Employer',
      jobId: jobId,
      jobTitle: jobTitle
    })
    setChatOpen(true)
  }

  // Handle Web Gmail fallback
  const handleEmailContact = (job) => {
    const email = job.employerEmail || job.email
    if (!email) {
      alert(isUrdu ? 'اس کام دینے والے کے پاس کوئی ای میل رابطے کی معلومات موجود نہیں ہیں۔' : 'This employer has no email contact information.')
      return
    }
    
    const subject = isUrdu ? `کام یار: جاب انکوائری - ${getSkillName(job.skill, true)}` : `KaamYaar: Job Inquiry - ${job.skill}`
    const bodyText = isUrdu 
      ? `السلام علیکم،\n\nمیں نے کام یار پر "${getSkillName(job.skill, true)}" (${getCityName(job.location, true)}) والی جاب دیکھی ہے اور میں اس میں دلچسپی رکھتا ہوں۔`
      : `Hello,\n\nI saw the job for "${job.skill}" (${job.location}) on KaamYaar and I am interested in it.`

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`
    window.open(gmailUrl, '_blank')
  }

  if (loading) {
    return <p className="text-gray-500 text-center py-6">{isUrdu ? 'جابز لوڈ ہو رہی ہیں...' : 'Loading jobs...'}</p>
  }

  return (
    <div className={isUrdu ? 'text-right' : 'text-left'} dir={isUrdu ? 'rtl' : 'ltr'}>
      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={isUrdu ? "مہارت یا شہر کے لحاظ سے تلاش کریں..." : "Search by skill or city..."}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 ${isUrdu ? 'text-right' : 'text-left'}`}
        />
      </div>

      {/* Filters (Forced LTR direction for dropdown fields so arrows and layout stay correct) */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5" dir="ltr">
        <select
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 bg-white ${isUrdu ? 'text-right' : 'text-left'}`}
        >
          {SKILLS.map((skill) => (
            <option key={skill.en} value={skill.en}>
              {isUrdu ? skill.ur : skill.en}
            </option>
          ))}
        </select>

        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 bg-white ${isUrdu ? 'text-right' : 'text-left'}`}
        >
          {CITIES.map((city) => (
            <option key={city.en} value={city.en}>
              {isUrdu ? city.ur : city.en}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {isUrdu ? `${filteredJobs.length} جاب(ز) مل گئی ہیں` : `Found ${filteredJobs.length} job(s)`}
      </p>

      {/* Job List */}
      {filteredJobs.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          {isUrdu ? 'آپ کی تلاش یا فلٹرز کے مطابق کوئی جاب موجود نہیں ہے۔' : 'No jobs available matching your search or filters.'}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const phoneNumber = job.employerPhone || job.phone || job.contact
            const formattedWaNumber = formatWhatsAppNumber(phoneNumber)
            const alreadyApplied = appliedJobIds.includes(job.id)
            const isApplying = applyingJobId === job.id

            return (
              <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-white">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-amber-900">
                    {isUrdu ? `${getSkillName(job.skill, true)} کی ضرورت ہے` : `Need ${job.skill}`}
                  </h4>
                  <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded-full">
                    {getSkillName(job.skill, isUrdu)}
                  </span>
                </div>

                {/* Job Meta Details (Using LTR flex container inside Urdu to keep location, budget and date in correct order) */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3" dir="ltr">
                  {job.date && <span className="bg-gray-100 px-2 py-0.5 rounded">📅 {job.date}</span>}
                  {job.pay && (
                    <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded font-medium">
                      💰 {isUrdu ? `${job.pay} روپے/دن :بجٹ` : `Budget: ${job.pay} PKR/day`}
                    </span>
                  )}
                  <span className="bg-gray-100 px-2 py-0.5 rounded">📍 {getCityName(job.location, isUrdu)}</span>
                </div>

                {/* Apply section */}
                {alreadyApplied ? (
                  <p className="text-sm text-green-700 font-semibold mb-2">
                    {isUrdu ? '✓ آپ اس جاب کے لیے اپلائی کر چکے ہیں' : '✓ You have already applied for this job'}
                  </p>
                ) : isApplying ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 space-y-2" dir={isUrdu ? 'rtl' : 'ltr'}>
                    <label className="block text-sm font-medium text-gray-700">
                      {isUrdu ? 'آپ کی قیمت کی پیشکش (روپے/دن)' : 'Your Bid Price (PKR/day)'}
                    </label>
                    <input
                      type="number"
                      value={bidPrice}
                      onChange={(e) => setBidPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 text-left"
                      dir="ltr"
                      placeholder={isUrdu ? 'مثلاً 1800' : 'e.g. 1800'}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubmitApplication(job)}
                        disabled={submittingBid}
                        className="flex-1 bg-amber-800 text-white text-sm font-semibold py-2 rounded-lg hover:bg-amber-900 transition disabled:opacity-50 cursor-pointer"
                      >
                        {submittingBid 
                          ? (isUrdu ? 'ارسال ہو رہا ہے...' : 'Submitting...') 
                          : (isUrdu ? 'پیشکش بھیجیں' : 'Send Bid')}
                      </button>
                      <button
                        onClick={cancelApply}
                        disabled={submittingBid}
                        className="flex-1 bg-gray-200 text-gray-700 text-sm font-semibold py-2 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 cursor-pointer"
                      >
                        {isUrdu ? 'منسوخ کریں' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startApply(job.id, job.pay)}
                    className="w-full mb-3 bg-amber-800 text-white text-sm font-semibold py-2 rounded-lg hover:bg-amber-900 transition cursor-pointer"
                  >
                    {isUrdu ? 'اپنی قیمت کے ساتھ اپلائی کریں' : 'Apply with your price'}
                  </button>
                )}

                {/* Contact Buttons Bar */}
                <div className="flex flex-wrap gap-2 mt-1" dir={isUrdu ? 'rtl' : 'ltr'}>
                  {/* Primary In-App Chat */}
                  <button
                    onClick={() => handleOpenChat(job.employerId, `${getSkillName(job.skill, isUrdu)} ${isUrdu ? 'جاب' : 'Job'}`, job.id)}
                    className="inline-flex items-center gap-1.5 bg-amber-800 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-900 transition cursor-pointer"
                  >
                    {isUrdu ? '💬 کام یار پر چیٹ کریں' : '💬 Chat on KaamYaar'}
                  </button>

                  {/* WhatsApp Option */}
                  {phoneNumber ? (
                    <>
                      <a
                        href={`https://wa.me/${formattedWaNumber}?text=${encodeURIComponent(
                          isUrdu 
                            ? `السلام علیکم، میں نے کام یار پر "${getSkillName(job.skill, true)}" (${getCityName(job.location, true)}) والی جاب دیکھی ہے اور میں اس میں دلچسپی रखता ہوں۔`
                            : `Hello, I saw the job for "${job.skill}" (${job.location}) on KaamYaar and I am interested in it.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition"
                      >
                        {isUrdu ? '📱 واٹس ایپ' : '📱 WhatsApp'}
                      </a>
                      <a 
                        href={`tel:${phoneNumber}`} 
                        className="inline-flex items-center gap-1.5 bg-gray-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                      >
                        {isUrdu ? '📞 کال کریں' : '📞 Call'}
                      </a>
                    </>
                  ) : (
                    <button 
                      onClick={() => handleEmailContact(job)} 
                      className="inline-flex items-center gap-1.5 bg-gray-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 transition cursor-pointer"
                    >
                      {isUrdu ? '✉️ ای میل' : '✉️ Email'}
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

export default BrowseJobs