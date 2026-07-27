import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user) return

    // Using simple query to prevent Firestore missing index errors
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      // Client-side sorting by newest first
      docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      setNotifications(docs)
    })

    return () => unsubscribe()
  }, [user])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true })
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const handleOpen = () => {
    const nextState = !open
    setOpen(nextState)

    // Mark unread notifications as read when opening dropdown
    if (nextState) {
      const unreadList = notifications.filter((n) => !n.read)
      unreadList.forEach((n) => markAsRead(n.id))
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={handleOpen} 
        className="relative p-2 text-white hover:bg-white/20 rounded-full transition focus:outline-none"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
          <div className="p-3 border-b border-gray-200 font-semibold text-gray-800 flex justify-between items-center">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                {unreadCount} new
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 text-center">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-3 border-b border-gray-100 text-sm transition ${
                  n.read ? 'text-gray-500 bg-white' : 'text-gray-800 font-medium bg-green-50'
                }`}
              >
                <p>{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell