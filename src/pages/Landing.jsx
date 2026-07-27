import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getCountFromServer,
  getDocs
} from 'firebase/firestore'
import { db } from '../firebase'
import { useLanguage } from '../context/LanguageContext'
import LanguageToggle from '../components/LanguageToggle'

const CATEGORIES = [
  { key: 'Electrician', emoji: '⚡' },
  { key: 'Plumber', emoji: '🔧' },
  { key: 'Painter', emoji: '🎨' },
  { key: 'Mason', emoji: '🧱' },
  { key: 'Carpenter', emoji: '🔨' },
  { key: 'Laborer', emoji: '💪' }
]

function getInitials(name = '') {
  return name
    .trim()
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' }
  })
}

export default function Landing() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [searchTerm, setSearchTerm] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [featuredWorkers, setFeaturedWorkers] = useState([])
  const [stats, setStats] = useState({ workers: 0, jobs: 0, cities: 0 })
  const [openFaq, setOpenFaq] = useState(null)

  const STEPS = [
    {
      emoji: '🔍',
      title: t('step1Title') || 'Search Worker',
      desc: t('step1Desc') || 'Find skilled daily wage workers near your location.'
    },
    {
      emoji: '📞',
      title: t('step2Title') || 'Contact Directly',
      desc: t('step2Desc') || 'Call or chat directly with no middleman involved.'
    },
    {
      emoji: '✅',
      title: t('step3Title') || 'Get Work Done',
      desc: t('step3Desc') || 'Hire quickly, get quality work, and leave a review.'
    }
  ]

  const WHY_CHOOSE = [
    {
      emoji: '🛡️',
      title: t('why1Title') || 'Verified Profiles',
      desc: t('why1Desc') || 'Authentic workers with verified ratings and skills.'
    },
    {
      emoji: '⚡',
      title: t('why2Title') || 'Quick Hiring',
      desc: t('why2Desc') || 'Connect within minutes and get immediate help.'
    },
    {
      emoji: '💰',
      title: t('why3Title') || 'Zero Commission',
      desc: t('why3Desc') || 'Direct dealing between employers and workers.'
    },
    {
      emoji: '📍',
      title: t('why4Title') || 'Location Based',
      desc: t('why4Desc') || 'Easily find nearby workers in your own city.'
    }
  ]

  const FAQS = [
    {
      q: t('faq1q') || 'Is KaamYaar free to use?',
      a: t('faq1a') || 'Yes, KaamYaar is 100% free for both workers and employers.'
    },
    {
      q: t('faq2q') || 'How do I contact a worker?',
      a: t('faq2a') || 'Simply click on a worker profile to view their phone number or start a chat.'
    },
    {
      q: t('faq3q') || 'How can I post a job requirement?',
      a: t('faq3a') || 'Sign up as an employer and click "Post New Job" from your dashboard.'
    },
    {
      q: t('faq4q') || 'Are the workers verified?',
      a: t('faq4a') || 'Ratings and reviews are left by genuine employers after completed work.'
    }
  ]

  const TESTIMONIALS = [
    { quote: 'Maine 10 minute mein achha electrician dhoond liya.', name: 'Ayesha', city: 'Lahore' },
    { quote: 'Booking process bohot aasan tha, worker time pe pohanch gaya.', name: 'Usman', city: 'Karachi' },
    { quote: 'Rating dekh kar hi decide kar liya kis se kaam karwana hai.', name: 'Sana', city: 'Faisalabad' }
  ]

  useEffect(() => {
    const savedTheme = localStorage.getItem('kaamyaar-theme')
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('kaamyaar-theme', next ? 'dark' : 'light')
  }

  useEffect(() => {
    try {
      const q = query(collection(db, 'workers'), orderBy('averageRating', 'desc'), limit(6))
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setFeaturedWorkers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
        },
        () => setFeaturedWorkers([])
      )
      return () => unsubscribe()
    } catch {
      setFeaturedWorkers([])
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadStats = async () => {
      try {
        const [workersSnap, jobsSnap, allWorkers] = await Promise.all([
          getCountFromServer(collection(db, 'workers')),
          getCountFromServer(collection(db, 'jobs')),
          getDocs(collection(db, 'workers'))
        ])

        const cityCount = new Set(
          allWorkers.docs.map((d) => d.data().location).filter(Boolean)
        ).size

        if (isMounted) {
          setStats({
            workers: workersSnap.data().count,
            jobs: jobsSnap.data().count,
            cities: cityCount
          })
        }
      } catch {
        if (isMounted) setStats({ workers: 0, jobs: 0, cities: 0 })
      }
    }
    loadStats()
    return () => { isMounted = false }
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(searchTerm ? `/login?search=${encodeURIComponent(searchTerm)}` : '/login')
  }

  const placeholdersNeeded = Math.max(0, 3 - featuredWorkers.length)

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950 text-gray-800 dark:text-gray-100 font-sans overflow-x-hidden transition-colors duration-300">
      
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-gray-950/80 border-b border-gray-100 dark:border-gray-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-2xl font-black tracking-tight text-green-800 dark:text-green-400 select-none urdu-font">
            کام<span className="text-gray-900 dark:text-white">یار</span>
          </span>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <button
              onClick={toggleDarkMode}
              className="text-lg p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              aria-label="Toggle dark mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-green-800 dark:text-green-400 font-semibold px-4 py-2 rounded-full hover:bg-green-50 dark:hover:bg-gray-800/60 transition cursor-pointer urdu-font"
            >
              {t('login') || 'Login'}
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="bg-green-800 hover:bg-green-900 text-white font-semibold px-5 py-2.5 rounded-full shadow-md shadow-green-800/20 active:scale-95 transition cursor-pointer urdu-font"
            >
              {t('signup') || 'Sign Up'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="absolute top-10 left-10 w-48 h-48 bg-green-300/30 dark:bg-green-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-10 w-56 h-56 bg-emerald-300/30 dark:bg-emerald-900/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-xs font-bold px-3.5 py-1.5 rounded-full mb-6 urdu-font">
              {t('heroTag') || '⚡ Direct Hiring Platform'}
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight text-gray-900 dark:text-white mb-6">
              {t('heroTitle1') || 'Find Workers Nearby'}{' '}
              <span className="text-green-700 dark:text-green-400">{t('heroTitle2') || 'Instantly'}</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              {t('heroDesc') || 'Connecting daily wage workers with employers in Pakistan. Reliable, fast, and transparent.'}
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 max-w-xl mx-auto lg:mx-0 mb-8">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('searchPlaceholder') || 'Search Electrician, Plumber, Painter...'}
                className="flex-1 px-5 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-600 shadow-sm"
              />
              <button
                type="submit"
                className="bg-green-800 hover:bg-green-900 text-white font-semibold px-7 py-3.5 rounded-2xl shadow-md transition cursor-pointer"
              >
                {t('searchBtn') || 'Search'}
              </button>
            </form>

            <div className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-start">
              <button
                onClick={() => navigate('/signup')}
                className="bg-white dark:bg-gray-900 text-green-800 dark:text-green-400 font-semibold px-5 py-3 rounded-xl border border-green-800 dark:border-green-400 hover:bg-green-50 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                {t('getStarted') || 'Get Started'}
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-3 rounded-xl shadow-md transition cursor-pointer urdu-font"
              >
                {t('imEmployer') || "I'm an Employer"}
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="bg-green-800 hover:bg-green-900 text-white font-semibold px-5 py-3 rounded-xl shadow-md transition cursor-pointer"
              >
                {t('imWorker') || "I'm a Worker"}
              </button>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              <span>{t('trustVerified') || '✓ Verified Profiles'}</span>
              <span>{t('trustSecure') || '✓ Direct Contact'}</span>
              <span>{t('trustRated') || '✓ Transparent Ratings'}</span>
            </div>
          </motion.div>

          {/* Hero Banner Image */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
              <img
                src="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1200&auto=format&fit=crop"
                alt="Daily wage workers"
                className="w-full h-[380px] sm:h-[440px] object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="absolute -bottom-5 -left-4 sm:bottom-6 sm:-left-6 bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-gray-100 dark:border-gray-800"
            >
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-300 flex items-center justify-center font-bold text-base">
                ⚡
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Electrician</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">⭐ 4.9 · Available Now</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="max-w-5xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: t('statWorkers') || 'Workers Registered', value: stats.workers, emoji: '👷' },
            { label: t('statCities') || 'Cities Covered', value: stats.cities, emoji: '🏙️' },
            { label: t('statJobs') || 'Jobs Posted', value: stats.jobs, emoji: '💼' }
          ].map((s, i) => (
            <motion.div
              key={s.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md p-6 text-center border border-gray-100 dark:border-gray-800 transition-shadow"
            >
              <span className="text-3xl">{s.emoji}</span>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2">{s.value}+</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
          {t('categoriesTitle') || 'Browse by Category'}
        </motion.h2>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-10">{t('categoriesSubtitle') || 'Find skilled professionals for your specific needs'}</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat.key}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              onClick={() => navigate('/login')}
              className="flex flex-col items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:border-green-300 dark:hover:border-green-700 transition cursor-pointer"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{cat.key}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Featured Workers */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
          {t('featuredTitle') || 'Top Rated Workers'}
        </motion.h2>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-10">{t('featuredSubtitle') || 'Most recommended workers based on employer feedback'}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {featuredWorkers.map((worker, i) => (
            <motion.div
              key={worker.id}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-700 to-emerald-600 text-white flex items-center justify-center font-bold text-base">
                  {getInitials(worker.name)}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white leading-tight">{worker.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{worker.skill}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                <span>📍 {worker.location || 'Pakistan'}</span>
                <span>⭐ {worker.averageRating ? worker.averageRating.toFixed(1) : (t('newBadge') || 'New')}</span>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-green-800 hover:bg-green-900 text-white font-semibold py-2 rounded-xl text-sm transition cursor-pointer"
              >
                {t('viewProfile') || 'View Profile'}
              </button>
            </motion.div>
          ))}

          {Array.from({ length: placeholdersNeeded }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-600 min-h-[160px]"
            >
              <span className="text-2xl mb-2">👷</span>
              <p className="text-xs">{t('moreWorkersSoon') || 'More profiles joining soon!'}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-green-50/50 dark:bg-gray-900/40 py-16 transition-colors">
        <div className="max-w-4xl mx-auto px-6">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            {t('howItWorks') || 'How It Works'}
          </motion.h2>
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {STEPS.map((step, i) => (
              <motion.div key={step.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-gray-800 shadow-md flex items-center justify-center text-2xl mb-4 border border-gray-100 dark:border-gray-700">
                  {step.emoji}
                </div>
                <p className="font-bold text-gray-900 dark:text-white mb-1 text-base">{i + 1}. {step.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          {t('whyChoose') || 'Why Choose KaamYaar?'}
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {WHY_CHOOSE.map((item, i) => (
            <motion.div key={item.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
              <span className="text-3xl">{item.emoji}</span>
              <p className="font-bold text-gray-900 dark:text-white mt-3 mb-1 text-base">{item.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-green-50/50 dark:bg-gray-900/40 py-16 transition-colors">
        <div className="max-w-5xl mx-auto px-6">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            {t('testimonialsTitle') || 'What People Say'}
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((item, i) => (
              <motion.div key={item.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                <div className="text-amber-400 text-sm mb-2">⭐⭐⭐⭐⭐</div>
                <p className="text-gray-700 dark:text-gray-200 text-xs sm:text-sm mb-4 italic">"{item.quote}"</p>
                <p className="text-xs font-bold text-gray-900 dark:text-white">— {item.name}, {item.city}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
          {t('faqTitle') || 'Frequently Asked Questions'}
        </motion.h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i
            return (
              <div key={faq.q} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex justify-between items-center px-5 py-4 text-left font-semibold text-gray-900 dark:text-white text-sm cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className={`transform transition-transform duration-200 text-green-700 dark:text-green-400 ${isOpen ? 'rotate-45' : ''}`}>➕</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-50 dark:border-gray-800/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 transition-colors">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-xs sm:text-sm">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-lg font-black text-green-800 dark:text-green-400 mb-2 urdu-font">کام یار</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">{t('footerTagline') || 'Connecting skilled labor with daily job opportunities.'}</p>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white mb-3">{t('footerCompany') || 'Company'}</p>
            <div className="flex flex-col gap-2 text-gray-500 dark:text-gray-400 text-xs">
              <button onClick={() => navigate('/login')} className="text-left hover:text-green-700 transition cursor-pointer">{t('footerAbout') || 'About Us'}</button>
              <button onClick={() => navigate('/login')} className="text-left hover:text-green-700 transition cursor-pointer">{t('footerPrivacy') || 'Privacy Policy'}</button>
              <button onClick={() => navigate('/login')} className="text-left hover:text-green-700 transition cursor-pointer">{t('footerTerms') || 'Terms of Service'}</button>
            </div>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white mb-3">{t('footerContact') || 'Contact'}</p>
            <div className="flex flex-col gap-2 text-gray-500 dark:text-gray-400 text-xs">
              <a href="mailto:support@kaamyaar.app" className="hover:text-green-700 transition">Email</a>
              <a href="https://wa.me/923000000000" target="_blank" rel="noopener noreferrer" className="hover:text-green-700 transition">WhatsApp</a>
            </div>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white mb-3">{t('footerFollow') || 'Follow Us'}</p>
            <div className="flex flex-col gap-2 text-gray-500 dark:text-gray-400 text-xs">
              <a href="#" className="hover:text-green-700 transition">Facebook</a>
              <a href="#" className="hover:text-green-700 transition">Instagram</a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800/80 py-4 px-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 dark:text-gray-600">
          <p>{t('footerRights') || '© 2026 KaamYaar. All rights reserved.'}</p>
          <p className="mt-2 sm:mt-0 font-medium text-gray-500 dark:text-gray-400">
            Developed by Fatima Mahmood 💻
          </p>
        </div>
      </footer>
    </div>
  )
}