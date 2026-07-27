import { useState, useEffect } from 'react'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import LocationPicker from './LocationPicker'
import { useLanguage } from '../context/LanguageContext'

const SKILLS = [
  'Electrician',
  'Painter',
  'Mason',
  'Laborer',
  'Plumber',
  'Carpenter',
  'Other'
]

const CITIES = [
  'Islamabad',
  'Lahore',
  'Karachi',
  'Faisalabad',
  'Rawalpindi',
  'Multan',
  'Peshawar',
  'Quetta'
]

function WorkerProfileForm() {
  const { language, t, tItem } = useLanguage()
  const isUrdu = language === 'ur'

  const [name, setName] = useState('')
  const [skill, setSkill] = useState('')
  const [customSkill, setCustomSkill] = useState('')
  const [location, setLocation] = useState('')
  const [mapLocation, setMapLocation] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [rate, setRate] = useState('')
  const [phone, setPhone] = useState('')
  const [experience, setExperience] = useState('')
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      if (!auth.currentUser) return
      
      const profileDoc = await getDoc(doc(db, 'workers', auth.currentUser.uid))
      if (profileDoc.exists()) {
        const data = profileDoc.data()
        setName(data.name || '')

        const savedSkill = data.skill || ''
        const skillExists = SKILLS.includes(savedSkill)
        if (savedSkill && !skillExists) {
          setSkill('Other')
          setCustomSkill(savedSkill)
        } else {
          setSkill(savedSkill)
        }

        setLocation(data.location || '')
        setRate(data.rate || '')
        setPhone(data.phone || '')
        setExperience(data.experience || '')
        setAvailable(data.available ?? true)

        if (data.lat && data.lng) {
          setMapLocation({ lat: data.lat, lng: data.lng, address: data.preciseAddress || '' })
        }
      }
      setLoadingProfile(false)
    }
    loadProfile()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const finalSkill = skill === 'Other' ? customSkill.trim() : skill

    if (!name || !finalSkill || !location || !rate || !phone || experience === '') {
      setError(isUrdu ? 'براہ کرم تمام خانے پر کریں۔' : 'Please fill in all fields.')
      return
    }

    setLoading(true)
    try {
      const existingDoc = await getDoc(doc(db, 'workers', auth.currentUser.uid))
      const existingData = existingDoc.exists() ? existingDoc.data() : {}

      await setDoc(doc(db, 'workers', auth.currentUser.uid), {
        name,
        skill: finalSkill,
        location,
        lat: mapLocation?.lat || null,
        lng: mapLocation?.lng || null,
        preciseAddress: mapLocation?.address || '',
        rate: Number(rate),
        phone,
        experience: Number(experience),
        available,
        email: auth.currentUser?.email || '',
        averageRating: existingData.averageRating || 0,
        ratingCount: existingData.ratingCount || 0,
        verified: existingData.verified || false,
        updatedAt: new Date().toISOString()
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      setError(isUrdu ? 'پروفائل محفوظ کرنے میں ناکامی ہوئی۔' : 'Failed to save profile.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingProfile) {
    return <p className="text-gray-500 text-center py-6">{isUrdu ? 'پروفائل لوڈ ہو رہا ہے...' : 'Loading profile...'}</p>
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${isUrdu ? 'text-right' : 'text-left'}`} dir={isUrdu ? 'rtl' : 'ltr'}>
      {success && (
        <div className="bg-green-100 text-green-800 p-3 rounded-lg text-sm">
          {isUrdu ? 'پروفائل کامیابی سے محفوظ ہو گیا!' : 'Profile saved successfully!'}
        </div>
      )}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isUrdu ? 'پورا نام' : 'Full Name'}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-amber-700 bg-white ${isUrdu ? 'text-right' : 'text-left'}`}
          placeholder={isUrdu ? 'اپنا پورا نام درج کریں' : 'Your full name'}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('skillNeeded')}
        </label>
        <select
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-700"
        >
          <option value="">{t('selectSkill')}</option>
          {SKILLS.map((s) => (
            <option key={s} value={s}>
              {tItem(s)}
            </option>
          ))}
        </select>

        {skill === 'Other' && (
          <input
            type="text"
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
            placeholder={isUrdu ? 'اپنی مہارت یہاں لکھیں...' : 'Type your skill...'}
            className={`w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-amber-700 bg-white ${isUrdu ? 'text-right' : 'text-left'}`}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('locationCity')}
        </label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-700"
        >
          <option value="">{t('selectCity')}</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {tItem(c)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="text-sm text-amber-800 font-semibold mt-2 hover:underline block"
        >
          {showMap 
            ? (isUrdu ? '▲ نقشہ چھپائیں' : '▲ Hide precise location') 
            : t('addMapLocation')}
        </button>

        {showMap && (
          <div className="mt-2">
            <LocationPicker 
              onLocationSelect={setMapLocation} 
              initialPosition={mapLocation ? [mapLocation.lat, mapLocation.lng] : null} 
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isUrdu ? 'تجربہ (سالوں میں)' : 'Years of Experience'}
        </label>
        <input
          type="number"
          min="0"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-amber-700 text-left bg-white"
          placeholder="e.g. 3"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isUrdu ? `یومیہ معاوضہ (${t('pkrCurrency')})` : `Daily Rate (${t('pkrCurrency')})`}
        </label>
        <input
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-amber-700 text-left bg-white"
          placeholder="e.g. 1500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isUrdu ? 'فون نمبر' : 'Phone Number'}
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-amber-700 text-left bg-white"
          placeholder="03XXXXXXXXX"
        />
      </div>

      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <span className="font-medium text-gray-700">
          {t('availableToday')}
        </span>
        <button
          type="button"
          onClick={() => setAvailable(!available)}
          className={`w-14 h-8 rounded-full transition ${available ? 'bg-green-600' : 'bg-gray-300'} relative`}
        >
          <span className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${available ? 'left-1' : 'left-7'}`}></span>
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-800 text-white text-lg font-semibold py-3 rounded-lg hover:bg-amber-900 transition disabled:opacity-50 cursor-pointer"
      >
        {loading 
          ? (isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving...') 
          : (isUrdu ? 'پروفائل محفوظ کریں' : 'Save Profile')}
      </button>
    </form>
  )
}

export default WorkerProfileForm