import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot, deleteDoc, updateDoc, addDoc, doc, runTransaction } from 'firebase/firestore'
import { db } from '../firebase'
import { useLanguage } from '../context/LanguageContext'

const SKILLS = ['Electrician', 'Painter', 'Mason', 'Laborer', 'Plumber', 'Carpenter', 'Other']
const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta']

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl leading-none ${star <= value ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500 transition cursor-pointer`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function MyPostedJobs({ user }) {
  const { t, tItem, language } = useLanguage()
  const isUrdu = language === 'ur'

  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ skill: '', location: '', pay: '', date: '' })
  const [saving, setSaving] = useState(false)
  const [expandedJobId, setExpandedJobId] = useState(null)
  const [reviewingWorkerId, setReviewingWorkerId] = useState(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewedIds, setReviewedIds] = useState([])
  const [selectingId, setSelectingId] = useState(null)

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'jobs'), where('employerId', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'applications'), where('employerId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setApplications(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [user])

  const getApplicantsForJob = (jobId) =>
    applications
      .filter((a) => a.jobId === jobId)
      .sort((a, b) => (a.proposedPrice || 0) - (b.proposedPrice || 0))

  const handleDelete = async (jobId) => {
    const confirmMsg = isUrdu ? 'کیا آپ واقعی اس جاب کو ختم کرنا چاہتے ہیں؟' : 'Delete this job posting?'
    if (!window.confirm(confirmMsg)) return
    setDeletingId(jobId)
    try {
      await deleteDoc(doc(db, 'jobs', jobId))
    } catch (err) {
      console.error(err)
      alert(isUrdu ? 'جاب ختم کرنے میں ناکامی ہوئی۔ دوبارہ کوشش کریں۔' : 'Failed to delete job. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const startEdit = (job) => {
    setEditingId(job.id)
    setEditForm({ 
      skill: job.skill || '', 
      location: job.location || '', 
      pay: job.pay || job.budget || '', 
      date: job.date || '' 
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ skill: '', location: '', pay: '', date: '' })
  }

  const handleSaveEdit = async (jobId) => {
    if (!editForm.skill || !editForm.location || !editForm.pay || !editForm.date) {
      alert(isUrdu ? 'براہ کرم تمام خانے پر کریں۔' : 'Please fill in all fields.')
      return
    }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        skill: editForm.skill,
        location: editForm.location,
        pay: Number(editForm.pay),
        budget: Number(editForm.pay),
        date: editForm.date
      })
      setEditingId(null)
    } catch (err) {
      console.error(err)
      alert(isUrdu ? 'جاب اپڈیٹ کرنے میں ناکامی ہوئی۔' : 'Failed to update job. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSelectWorker = async (app) => {
    const confirmMsg = isUrdu 
      ? `کیا آپ ${app.workerName} کو PKR ${app.proposedPrice}/${isUrdu ? 'دن' : 'day'} کے لیے منتخب کرنا چاہتے ہیں؟`
      : `Select ${app.workerName} for PKR ${app.proposedPrice}/day?`

    if (!window.confirm(confirmMsg)) return
    setSelectingId(app.id)
    try {
      await updateDoc(doc(db, 'applications', app.id), { status: 'accepted' })

      const others = applications.filter((a) => a.jobId === app.jobId && a.id !== app.id)
      for (const other of others) {
        await updateDoc(doc(db, 'applications', other.id), { status: 'rejected' })
      }

      await addDoc(collection(db, 'notifications'), {
        userId: app.workerId,
        type: 'application_accepted',
        message: isUrdu 
          ? `آپ کو جاب کے لیے منتخب کر لیا گیا ہے! آپ کی PKR ${app.proposedPrice}/دن کی پیشکش قبول کر لی گئی ہے۔`
          : `You've been selected for the job! Your offer of PKR ${app.proposedPrice}/day was accepted.`,
        jobId: app.jobId,
        read: false,
        createdAt: new Date().toISOString()
      })
    } catch (err) {
      console.error(err)
      alert(isUrdu ? 'ورکر کو منتخب کرنے میں ناکامی ہوئی۔' : 'Failed to select worker. Please try again.')
    } finally {
      setSelectingId(null)
    }
  }

  const startReview = (workerId) => {
    setReviewingWorkerId(workerId)
    setReviewRating(0)
    setReviewComment('')
  }

  const cancelReview = () => {
    setReviewingWorkerId(null)
    setReviewRating(0)
    setReviewComment('')
  }

  const handleSubmitReview = async (workerId) => {
    if (reviewRating === 0) {
      alert(isUrdu ? 'براہ کرم اسٹار ریٹنگ منتخب کریں۔' : 'Please select a star rating.')
      return
    }
    setSubmittingReview(true)
    try {
      await addDoc(collection(db, 'reviews'), {
        workerId,
        employerId: user.uid,
        rating: reviewRating,
        comment: reviewComment.trim(),
        createdAt: new Date().toISOString()
      })

      const workerRef = doc(db, 'workers', workerId)
      await runTransaction(db, async (transaction) => {
        const workerDoc = await transaction.get(workerRef)
        const data = workerDoc.exists() ? workerDoc.data() : {}
        const currentCount = data.ratingCount || 0
        const currentAvg = data.averageRating || 0
        const newCount = currentCount + 1
        const newAvg = (currentAvg * currentCount + reviewRating) / newCount
        transaction.update(workerRef, { averageRating: newAvg, ratingCount: newCount })
      })

      setReviewedIds([...reviewedIds, workerId])
      cancelReview()
    } catch (err) {
      console.error(err)
      alert(isUrdu ? 'ریویو جمع کرنے میں ناکامی ہوئی۔' : 'Failed to submit review. Please try again.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const formatWhatsAppNumber = (phone) => {
    if (!phone) return ''
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) cleaned = '92' + cleaned.slice(1)
    return cleaned
  }

  if (loading) return <p className="text-gray-500 text-center py-4">{isUrdu ? 'آپ کی پوسٹ کی گئی جابز لوڈ ہو رہی ہیں...' : 'Loading your jobs...'}</p>
  if (jobs.length === 0) return <p className="text-gray-500 text-center py-8">{isUrdu ? 'آپ نے ابھی تک کوئی جاب پوسٹ نہیں کی۔' : "You haven't posted any jobs yet."}</p>

  return (
    <div className="space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
      {jobs.map((job) => {
        const applicants = getApplicantsForJob(job.id)
        const isExpanded = expandedJobId === job.id
        const hasAccepted = applicants.some((a) => a.status === 'accepted')
        const titleSkill = tItem(job.skill) || job.skill
        const cityTranslated = tItem(job.location) || job.location
        const jobPay = job.pay || job.budget || 0

        return (
          <div key={job.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-xs">
            {editingId === job.id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('skillNeeded')}</label>
                  <select value={editForm.skill} onChange={(e) => setEditForm({ ...editForm, skill: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
                    {SKILLS.map((s) => <option key={s} value={s}>{tItem(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('locationCity')}</label>
                  <select value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
                    {CITIES.map((c) => <option key={c} value={c}>{tItem(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('budget')} ({t('pkrCurrency')}{t('perDay')})</label>
                  <input type="number" value={editForm.pay} onChange={(e) => setEditForm({ ...editForm, pay: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isUrdu ? 'تاریخ' : 'Date Needed'}</label>
                  <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSaveEdit(job.id)} disabled={saving} className="flex-1 bg-green-800 text-white font-semibold py-2 rounded-lg hover:bg-green-900 transition disabled:opacity-50 cursor-pointer">
                    {saving ? (isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving...') : (isUrdu ? 'محفوظ کریں' : 'Save')}
                  </button>
                  <button onClick={cancelEdit} disabled={saving} className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 cursor-pointer">
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-amber-900 text-lg">
                    {titleSkill} {isUrdu ? 'کی ضرورت ہے' : 'Needed'}
                  </h4>
                  <div className="flex gap-3">
                    <button onClick={() => startEdit(job)} className="text-green-700 text-sm font-semibold hover:text-green-900 cursor-pointer">
                      {t('edit')}
                    </button>
                    <button onClick={() => handleDelete(job.id)} disabled={deletingId === job.id} className="text-red-600 text-sm font-semibold hover:text-red-800 disabled:opacity-50 cursor-pointer">
                      {deletingId === job.id ? (isUrdu ? 'حذف ہو رہا ہے...' : 'Deleting...') : t('delete')}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3 border-t border-gray-100 pt-2">
                  <span>📍 {cityTranslated}</span>
                  <span>💰 {t('budget')}: {t('pkrCurrency')} {jobPay}{t('perDay')}</span>
                  {job.date && <span>📅 {job.date}</span>}
                  {hasAccepted && <span className="text-green-700 font-semibold">{isUrdu ? '✓ ورکر منتخب ہو گیا' : '✓ Worker Selected'}</span>}
                </div>

                <button onClick={() => setExpandedJobId(isExpanded ? null : job.id)} className="text-sm font-semibold text-green-800 hover:text-green-900 cursor-pointer flex items-center gap-1">
                  <span>{isExpanded ? '▲' : '▼'}</span>
                  <span>{t('viewApplicants')} ({applicants.length})</span>
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-2">
                    {applicants.length === 0 ? (
                      <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg text-center">
                        {isUrdu ? 'ابھی تک کسی ورکر نے اپلائی نہیں کیا۔' : 'No applicants yet.'}
                      </p>
                    ) : (
                      applicants.map((app) => (
                        <div
                          key={app.id}
                          className={`border rounded-lg p-3 ${app.status === 'accepted' ? 'bg-green-50 border-green-300' : app.status === 'rejected' ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-gray-50 border-gray-200'}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <p className="font-semibold text-gray-800">{app.workerName}</p>
                              <p className="text-xs text-gray-500">🛠️ {tItem(app.workerSkill) || app.workerSkill}</p>
                            </div>
                            <span className="text-sm font-bold text-amber-800">{t('pkrCurrency')} {app.proposedPrice}{t('perDay')}</span>
                          </div>

                          {app.status === 'accepted' && <p className="text-xs text-green-700 font-semibold mb-2">{isUrdu ? '✓ منتخب شدہ' : '✓ Selected'}</p>}
                          {app.status === 'rejected' && <p className="text-xs text-gray-500 mb-2">{isUrdu ? 'منتخب نہیں ہوا' : 'Not selected'}</p>}

                          {app.workerPhone && (
                            <div className="flex gap-2 mb-2">
                              <a href={`tel:${app.workerPhone}`} className="text-xs bg-amber-800 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-900 transition flex items-center gap-1">
                                📞 {t('call')}
                              </a>
                              <a href={`https://wa.me/${formatWhatsAppNumber(app.workerPhone)}`} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-1">
                                💬 {t('whatsApp')}
                              </a>
                            </div>
                          )}

                          {app.status === 'pending' && !hasAccepted && (
                            <button
                              onClick={() => handleSelectWorker(app)}
                              disabled={selectingId === app.id}
                              className="text-xs bg-green-800 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-900 transition disabled:opacity-50 cursor-pointer"
                            >
                              {selectingId === app.id ? (isUrdu ? 'منتخب ہو رہا ہے...' : 'Selecting...') : (isUrdu ? '✓ اس ورکر کو منتخب کریں' : '✓ Select This Worker')}
                            </button>
                          )}

                          {app.status === 'accepted' && (
                            reviewedIds.includes(app.workerId) ? (
                              <p className="text-xs text-green-700 font-semibold">{isUrdu ? '✓ ریویو جمع ہو گیا' : '✓ Review submitted'}</p>
                            ) : reviewingWorkerId === app.workerId ? (
                              <div className="bg-white border border-gray-200 rounded-lg p-3 mt-2 space-y-2">
                                <StarPicker value={reviewRating} onChange={setReviewRating} />
                                <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder={isUrdu ? 'کام کیسا رہا؟ (اختیاری)' : 'Kaam kaisa raha? (optional)'} rows={2} className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
                                <div className="flex gap-2">
                                  <button onClick={() => handleSubmitReview(app.workerId)} disabled={submittingReview} className="text-xs bg-green-800 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-900 transition disabled:opacity-50 cursor-pointer">
                                    {submittingReview ? (isUrdu ? 'جمع ہو رہا ہے...' : 'Submitting...') : (isUrdu ? 'ریویو جمع کریں' : 'Submit Review')}
                                  </button>
                                  <button onClick={cancelReview} disabled={submittingReview} className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer">{t('cancel')}</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => startReview(app.workerId)} className="text-xs text-amber-800 font-semibold hover:text-amber-900 cursor-pointer">⭐ {isUrdu ? 'ریویو لکھیں' : 'Write a Review'}</button>
                            )
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default MyPostedJobs