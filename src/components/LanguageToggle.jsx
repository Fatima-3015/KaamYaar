import { useLanguage } from '../context/LanguageContext'

function LanguageToggle({ className = '' }) {
  const { language, toggleLanguage } = useLanguage()

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition ${className}`}
      aria-label="Toggle language"
    >
      <span className={language === 'en' ? 'text-green-800 dark:text-green-400' : 'text-gray-400'}>EN</span>
      <span className="text-gray-300 dark:text-gray-600">/</span>
      <span className={language === 'ur' ? 'text-green-800 dark:text-green-400' : 'text-gray-400'}>اردو</span>
    </button>
  )
}

export default LanguageToggle