import { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import LocationPicker from './LocationPicker'
import { useLanguage } from '../context/LanguageContext'

const SKILLS = ['Electrician', 'Painter', 'Mason', 'Laborer', 'Plumber', 'Carpenter', 'Other']
const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta']

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

async function uploadToCloudinary(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    throw new Error('Cloudinary upload failed')
  }

  const data = await response.json()
  return data.secure_url
}

function PostJobForm({ onSuccess }) {
  const { t, tItem, language } = useLanguage()

  const [skill, setSkill] = useState('')
  const [customSkill, setCustomSkill] = useState('')
  const [location, setLocation] = useState('')
  const [mapLocation, setMapLocation] = useState(null)
  const [pay, setPay] = useState('')
  const [date, setDate] = useState('')
  const [workersNeeded, setWorkersNeeded] = useState('1')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError(language === 'ur' ? 'براہ کرم صحیح تصویر منتخب کریں۔' : 'Please select a valid image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(language === 'ur' ? 'تصویر کا سائز 5MB سے کم ہونا چاہیے۔' : 'Image size must be under 5MB.')
      return
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }

    setError('')
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const removePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhotoFile(null)
    setPhotoPreview('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const currentUser = auth.currentUser
    if (!currentUser) {
      setError(language === 'ur' ? 'جاب پوسٹ کرنے کے لیے آپ کا لاگ ان ہونا ضروری ہے۔' : 'You must be logged in to post a job.')
      return
    }

    const finalSkill = (skill === 'Other' || skill === 'دیگر' || tItem(skill) === 'Other') ? customSkill.trim() : skill

    if (!finalSkill || !location || !pay || !date || !workersNeeded) {
      setError(language === 'ur' ? 'براہ کرم تمام ضروری خانے پر کریں۔' : 'Please fill in all mandatory fields.')
      return
    }

    setLoading(true)
    try {
      let photoURL = ''
      if (photoFile) {
        photoURL = await uploadToCloudinary(photoFile)
      }

      await addDoc(collection(db, 'jobs'), {
        skill: finalSkill,
        location,
        lat: mapLocation?.lat || null,
        lng: mapLocation?.lng || null,
        preciseAddress: mapLocation?.address || '',
        pay: Number(pay),
        date,
        workersNeeded: Number(workersNeeded),
        photoURL,
        employerId: currentUser.uid,
        employerEmail: currentUser.email || '',
        createdAt: new Date().toISOString()
      })

      setSkill('')
      setCustomSkill('')
      setLocation('')
      setMapLocation(null)
      setShowMap(false)
      setPay('')
      setDate('')
      setWorkersNeeded('1')
      removePhoto()
      setSuccess(true)
      
      if (onSuccess) onSuccess()
      
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      setError(language === 'ur' ? 'جاب پوسٹ کرنے میں ناکامی ہوئی۔ دوبارہ کوشش کریں۔' : 'Failed to post job. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="bg-green-100 text-green-800 p-3 rounded-lg text-sm">
          {language === 'ur' ? 'جاب کامیابی سے پوسٹ ہو گئی ہے!' : 'Job posted successfully!'}
        </div>
      )}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Skill Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('skillNeeded') || 'Skill Needed'}
        </label>
        <select
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-700"
        >
          <option value="">{t('selectSkill') || 'Select a skill'}</option>
          {SKILLS.map((s) => (
            <option key={s} value={s}>
              {s === 'Other' ? (language === 'ur' ? 'دیگر (خود لکھیں)' : 'Other (Type custom)') : (tItem(s) || s)}
            </option>
          ))}
        </select>

        {(skill === 'Other' || skill === 'دیگر' || tItem(skill) === 'Other') && (
          <input
            type="text"
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
            placeholder={language === 'ur' ? 'اپنی سکل یہاں خود لکھیں...' : 'Enter custom skill here...'}
            className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-700"
          />
        )}
      </div>

      {/* Workers Needed */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('numWorkersRequired') || 'Number of Workers Required'}
        </label>
        <input
          type="number"
          min="1"
          value={workersNeeded}
          onChange={(e) => setWorkersNeeded(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-700"
          placeholder="e.g. 5"
        />
      </div>

      {/* City & Map Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('locationCity') || 'Location (City)'}
        </label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-700"
        >
          <option value="">{t('selectCity') || 'Select a city'}</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {tItem(c) || c}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="text-sm text-green-800 font-semibold mt-2 hover:underline block cursor-pointer"
        >
          {showMap
            ? (language === 'ur' ? '▲ نقشه چھپائیں' : '▲ Hide precise location')
            : (t('addMapLocation') || '📍 Add precise location on map (optional)')}
        </button>

        {showMap && (
          <div className="mt-2">
            <LocationPicker onLocationSelect={setMapLocation} />
          </div>
        )}
      </div>

      {/* Pay per Day */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('payPerDay') || 'Pay per Day (PKR)'}
        </label>
        <input
          type="number"
          min="0"
          value={pay}
          onChange={(e) => setPay(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-700"
          placeholder={t('payPlaceholder') || 'e.g. 1500'}
        />
      </div>

      {/* Date Needed */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {language === 'ur' ? 'مطلوبہ تاریخ' : 'Date Needed'}
        </label>
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-700"
        />
      </div>

      {/* Job Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {language === 'ur' ? 'کام کی تصویر (اختیاری)' : 'Job Photo (optional)'}
        </label>
        {photoPreview ? (
          <div className="relative">
            <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-gray-300" />
            <button
              type="button"
              onClick={removePhoto}
              className="absolute top-2 right-2 bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-700 transition cursor-pointer"
            >
              {language === 'ur' ? 'حذف کریں' : 'Remove'}
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-700 transition">
            <span className="text-2xl mb-1">📷</span>
            <span className="text-sm text-gray-500">
              {language === 'ur' ? 'جگہ یا کام کی تصویر شامل کریں' : 'Add a photo of the site/work'}
            </span>
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </label>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-800 text-white text-lg font-semibold py-3 rounded-lg hover:bg-green-900 transition disabled:opacity-50 cursor-pointer"
      >
        {loading
          ? (language === 'ur' ? 'پوسٹ ہو رہا ہے...' : 'Posting...')
          : (t('postJobBtn') || 'Post Job')}
      </button>
    </form>
  )
}

export default PostJobForm