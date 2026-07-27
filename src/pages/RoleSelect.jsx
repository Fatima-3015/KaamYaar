import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../firebase'

function RoleSelect() {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/')
        return
      }

      // Check if user already has a role — if so, skip straight to their dashboard
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists() && userDoc.data().role) {
        const role = userDoc.data().role
        navigate(role === 'employer' ? '/employer-dashboard' : '/worker-dashboard')
      } else {
        setChecking(false)
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const selectRole = async (role) => {
    setLoading(true)
    const user = auth.currentUser
    if (!user) return

    try {
      await setDoc(doc(db, 'users', user.uid), { role }, { merge: true })
      navigate(role === 'employer' ? '/employer-dashboard' : '/worker-dashboard')
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-800 to-amber-900">
        <p className="text-white text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-800 to-amber-900 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-green-900 mb-2">Welcome to KaamYaar</h1>
        <p className="text-gray-600 mb-8">What would you like to do?</p>

        <div className="space-y-4">
          <button
            onClick={() => selectRole('employer')}
            disabled={loading}
            className="w-full bg-green-800 text-white text-lg font-semibold py-4 rounded-xl hover:bg-green-900 transition disabled:opacity-50"
          >
            I'm an Employer
            <span className="block text-sm font-normal opacity-90 mt-1">I need to hire workers</span>
          </button>

          <button
            onClick={() => selectRole('worker')}
            disabled={loading}
            className="w-full bg-amber-800 text-white text-lg font-semibold py-4 rounded-xl hover:bg-amber-900 transition disabled:opacity-50"
          >
            I'm a Worker
            <span className="block text-sm font-normal opacity-90 mt-1">I'm looking for work</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoleSelect