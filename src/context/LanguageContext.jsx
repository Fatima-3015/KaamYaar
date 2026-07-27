import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

const translations = {
  en: {
    // Header & Navigation
    login: 'Login',
    signup: 'Sign Up',
    logout: 'Logout',
    heroTag: '⚡ Direct Hiring Platform',
    heroTitle1: 'Find Workers Nearby',
    heroTitle2: 'Instantly',
    heroDesc: 'Connecting daily wage workers with employers in Pakistan. Reliable, fast, and transparent.',
    searchPlaceholder: 'Search Electrician, Plumber, Painter...',
    searchBtn: 'Search',
    getStarted: 'Get Started',
    imEmployer: "I'm an Employer",
    imWorker: "I'm a Worker",
    trustVerified: '✓ Verified Profiles',
    trustSecure: '✓ Direct Contact',
    trustRated: '✓ Transparent Ratings',

    // Logout Modal
    logoutTitle: 'Are you sure you want to log out?',
    logoutDescription: 'You will need to sign in again to view your posted jobs and messages.',
    yesLogout: 'Yes, Logout',
    cancel: 'Cancel',

    // Dashboard Items
    welcome: 'Welcome',
    employerDashboardDesc: 'Post a job requirement and connect with available workers near you.',
    postNewJobDesc: 'Hire electricians, painters, plumbers, and more.',
    browseWorkersDesc: 'Directly search and contact skilled workers.',
    seedDemoData: '🌱 Seed Demo Data',
    addingDemoData: 'Adding demo data...',

    // Bottom Navigation Bar & Tabs
    home: 'Home',
    jobs: 'Jobs',
    messages: 'Messages',
    workers: 'Workers',
    post: 'Post',
    askAi: 'Ask AI',
    myJobs: 'My Jobs',
    profile: 'Profile',
    myBookings: 'My Bookings',

    // Dashboards & Browsing
    browseWorkers: 'Browse Workers',
    searchWorkerPlaceholder: 'Search by worker name...',
    allCities: 'All Cities',
    allSkills: 'All Skills',
    workersFound: 'worker(s) found',
    availableToday: 'Available Today',
    notAvailable: 'Not Available',
    noRatingsYet: 'No ratings yet',
    call: 'Call',
    whatsApp: 'WhatsApp',
    chat: 'Chat',
    pkrCurrency: 'PKR',
    perDay: '/day',

    // Post Job Form & Labels
    postNewJob: 'Post New Job',
    skillNeeded: 'Skill Needed',
    selectSkill: 'Select a skill',
    numWorkersRequired: 'Number of Workers Required',
    locationCity: 'Location (City)',
    selectCity: 'Select a city',
    addMapLocation: 'Add precise location on map (optional) 📍',
    postJobBtn: 'Post Job',

    // Ask AI Section
    askAiTitle: 'AI Worker Search',

    // My Jobs & Actions
    myJobsTitle: 'My Jobs',
    delete: 'Delete',
    edit: 'Edit',
    viewApplicants: 'View Applicants',
    budget: 'Budget',

    // Login & Form Labels
    loginTitle: 'Welcome Back',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    forgotPasswordLink: 'Forgot Password?',
    noAccount: "Don't have an account?",
    mobileOtpTab: 'Mobile OTP',
    emailTab: 'Email',

    // Stats
    statWorkers: 'Workers Registered',
    statCities: 'Cities Covered',
    statJobs: 'Jobs Posted',

    // Categories
    categoriesTitle: 'Browse by Category',
    categoriesSubtitle: 'Find skilled professionals for your specific needs',

    // Featured Workers
    featuredTitle: 'Top Rated Workers',
    featuredSubtitle: 'Most recommended workers based on employer feedback',
    newBadge: 'New',
    viewProfile: 'View Profile',
    moreWorkersSoon: 'More profiles joining soon!',

    // How it works
    howItWorks: 'How It Works',
    step1Title: 'Search Worker',
    step1Desc: 'Find skilled daily wage workers near your location.',
    step2Title: 'Contact Directly',
    step2Desc: 'Call or chat directly with no middleman involved.',
    step3Title: 'Get Work Done',
    step3Desc: 'Hire quickly, get quality work, and leave a review.',

    // Why Choose Us
    whyChoose: 'Why Choose KaamYaar?',
    why1Title: 'Verified Profiles',
    why1Desc: 'Authentic workers with verified ratings and skills.',
    why2Title: 'Quick Hiring',
    why2Desc: 'Connect within minutes and get immediate help.',
    why3Title: 'Zero Commission',
    why3Desc: 'Direct dealing between employers and workers.',
    why4Title: 'Location Based',
    why4Desc: 'Easily find nearby workers in your own city.',

    // Testimonials
    testimonialsTitle: 'What People Say',

    // FAQ
    faqTitle: 'Frequently Asked Questions',

    // Footer
    footerTagline: 'Connecting skilled labor with daily job opportunities.',
    footerCompany: 'Company',
    footerAbout: 'About Us',
    footerPrivacy: 'Privacy Policy',
    footerTerms: 'Terms of Service',
    footerContact: 'Contact',
    footerFollow: 'Follow Us',
    footerRights: '© 2026 KaamYaar. All rights reserved.',

    // Skills Helpers
    Electrician: 'Electrician',
    Plumber: 'Plumber',
    Painter: 'Painter',
    Mason: 'Mason',
    Carpenter: 'Carpenter',
    Laborer: 'Laborer',

    // Cities Helpers
    Islamabad: 'Islamabad',
    Lahore: 'Lahore',
    Karachi: 'Karachi',
    Faisalabad: 'Faisalabad',
    Rawalpindi: 'Rawalpindi',
    Multan: 'Multan',
    Peshawar: 'Peshawar',
    Quetta: 'Quetta'
  },
  ur: {
    // Header & Navigation
    login: 'لاگ ان',
    signup: 'سائن اپ',
    logout: 'لاگ آؤٹ',
    heroTag: '⚡ براہ راست ہائرنگ پلیٹ فارم',
    heroTitle1: 'قریبی کاریگر تلاش کریں',
    heroTitle2: 'فوری طور پر',
    heroDesc: 'پاکستان میں دیہاڑی دار مزدوروں اور مالکان کا براہ راست رابطہ۔ قابل بھروسہ، تیز اور شفاف۔',
    searchPlaceholder: 'الیکٹریشین، پلمبر، پینٹر تلاش کریں...',
    searchBtn: 'تلاش کریں',
    getStarted: 'شروع کریں',
    imEmployer: 'میں ایک ایمپلائر ہوں',
    imWorker: 'میں ایک ورکر ہوں',
    trustVerified: '✓ تصدیق شدہ پروفائلز',
    trustSecure: '✓ براہ راست رابطہ',
    trustRated: '✓ شفاف ریٹنگز',

    // Logout Modal
    logoutTitle: 'کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟',
    logoutDescription: 'اپنے پوسٹ کیے گئے کام اور پیغام دیکھنے کے لیے آپ کو دوبارہ سائن ان کرنا پڑے گا۔',
    yesLogout: 'جی ہاں، لاگ آؤٹ کریں',
    cancel: 'منسوخ کریں',

    // Dashboard Items
    welcome: 'خوش آمدید',
    employerDashboardDesc: 'اپنی ضرورت کے مطابق کام پوسٹ کریں اور اپنے قریب موجود ورکرز سے رابطہ کریں۔',
    postNewJobDesc: 'الیکٹریشین، پینٹر، پلمبر وغیرہ ہائر کریں۔',
    browseWorkersDesc: 'ماہر ورکرز کو براہ راست تلاش کریں اور ان سے رابطہ کریں۔',
    seedDemoData: '🌱 ڈیمو ڈیٹا شامل کریں',
    addingDemoData: 'ڈیمو ڈیٹا شامل ہو رہا ہے...',

    // Bottom Navigation Bar & Tabs
    home: 'ہوم',
    jobs: 'جابز',
    messages: 'پیغامات',
    workers: 'ورکرز',
    post: 'پوسٹ',
    askAi: 'اے آئی مدد',
    myJobs: 'میری جابز',
    profile: 'پروفائل',
    myBookings: 'میری بکنگز',

    // Dashboards & Browsing
    browseWorkers: 'ورکرز تلاش کریں',
    searchWorkerPlaceholder: 'ورکر کے نام سے تلاش کریں...',
    allCities: 'تمام شہر',
    allSkills: 'تمام مہارتیں',
    workersFound: 'ورکرز مل گئے',
    availableToday: 'آج دستیاب ہے',
    notAvailable: 'دستیاب نہیں ہے',
    noRatingsYet: 'ابھی کوئی ریٹنگ نہیں',
    call: 'کال کریں',
    whatsApp: 'واٹس ایپ',
    chat: 'چیٹ کریں',
    pkrCurrency: 'روپے',
    perDay: '/ دن',

    // Post Job Form & Labels
    postNewJob: 'نئی جاب پوسٹ کریں',
    skillNeeded: 'مطلوبہ ہنر / کاریگر',
    selectSkill: 'ہنر منتخب کریں',
    numWorkersRequired: 'مطلوبہ ورکرز کی تعداد',
    locationCity: 'مقام (شہر)',
    selectCity: 'شہر منتخب کریں',
    addMapLocation: 'میپ پر درست جگہ منتخب کریں (اختیاری) 📍',
    postJobBtn: 'جاب پوسٹ کریں',

    // Ask AI Section
    askAiTitle: 'اے آئی ورکر تلاش',

    // My Jobs & Actions
    myJobsTitle: 'میری جابز',
    delete: 'حذف کریں',
    edit: 'ترمیم کریں',
    viewApplicants: 'درخواستیں دیکھیں',
    budget: 'بجٹ',

    // Login & Form Labels
    loginTitle: 'خوش آمدید',
    emailLabel: 'ای میل ایڈریس',
    passwordLabel: 'پاس ورڈ',
    forgotPasswordLink: 'پاس ورڈ بھول گئے؟',
    noAccount: 'کیا آپ کا اکاؤنٹ نہیں ہے؟',
    mobileOtpTab: 'موبائل او ٹی پی',
    emailTab: 'ای میل',

    // Stats
    statWorkers: 'رجسٹرڈ ورکرز',
    statCities: 'شامل شہر',
    statJobs: 'پوسٹ کی گئی جابز',

    // Categories
    categoriesTitle: 'کیٹگریز کے لحاظ سے تلاش کریں',
    categoriesSubtitle: 'اپنی ضرورت کے مطابق ماہر کاریگر ڈھونڈیں',

    // Featured Workers
    featuredTitle: 'بہترین ریٹنگ والے ورکرز',
    featuredSubtitle: 'مالکان کے فیڈ بیک کی بنیاد پر سب سے زیادہ تجویز کردہ ورکرز',
    newBadge: 'نیا',
    viewProfile: 'پروفائل دیکھیں',
    moreWorkersSoon: 'مزید پروفائلز جلد آرہے ہیں!',

    // How it works
    howItWorks: 'یہ کیسے کام کرتا ہے',
    step1Title: 'ورکر تلاش کریں',
    step1Desc: 'اپنے قریب ماہر دیہاڑی دار ورکرز تلاش کریں۔',
    step2Title: 'براہ راست رابطہ کریں',
    step2Desc: 'بغیر کسی درمیانی بندے کے براہ راست کال یا چیٹ کریں۔',
    step3Title: 'کام مکمل کروائیں',
    step3Desc: 'جلدی ہائر کریں، بہترین کام حاصل کریں اور ریٹنگ دیں۔',

    // Why Choose Us
    whyChoose: 'کام یار کا انتخاب کیوں کریں؟',
    why1Title: 'تصدیق شدہ پروفائلز',
    why1Desc: 'مصدقہ ریٹنگ اور ہنر کے حامل مستند ورکرز۔',
    why2Title: 'فوری ہائرنگ',
    why2Desc: 'چند منٹوں میں رابطہ کریں اور فوری مدد حاصل کریں۔',
    why3Title: 'زیرو کمیشن',
    why3Desc: 'مالکان اور ورکرز کے درمیان براہ راست ڈیل۔',
    why4Title: 'مقام پر مبنی',
    why4Desc: 'اپنے ہی شہر میں آسانی سے قریبی ورکرز تلاش کریں۔',

    // Testimonials
    testimonialsTitle: 'لوگ کیا کہتے ہیں',

    // FAQ
    faqTitle: 'اکثر پوچھے گئے سوالات',

    // Footer
    footerTagline: 'ماہر مزدوروں کو روزانہ جاب کے مواقع سے جوڑنا۔',
    footerCompany: 'کمپنی',
    footerAbout: 'ہمارے بارے میں',
    footerPrivacy: 'پرائیویسی پالیسی',
    footerTerms: 'استعمال کی شرائط',
    footerContact: 'رابطہ',
    footerFollow: 'ہمیں فالو کریں',
    footerRights: '© 2026 کام یار۔ جملہ حقوق محفوظ ہیں۔',

    // Skills Helpers
    Electrician: 'الیکٹریشین',
    Plumber: 'پلمبر',
    Painter: 'پینٹر',
    Mason: 'مستری',
    Carpenter: 'ترکھان',
    Laborer: 'مزدور',

    // Cities Helpers
    Islamabad: 'اسلام آباد',
    Lahore: 'لاہور',
    Karachi: 'کراچی',
    Faisalabad: 'فیصل آباد',
    Rawalpindi: 'راولپنڈی',
    Multan: 'ملتان',
    Peshawar: 'پشاور',
    Quetta: 'کوئٹہ'
  }
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('kaamyaar-lang') || 'ur'
  })

  useEffect(() => {
    localStorage.setItem('kaamyaar-lang', language)
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language])

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ur' : 'en'))
  }

  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key
  }

  const tItem = (itemKey) => {
    if (!itemKey) return ''
    return translations[language]?.[itemKey] || translations['en']?.[itemKey] || itemKey
  }

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, tItem }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}