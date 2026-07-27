import { useState, useEffect, useRef, useMemo } from 'react'
import { db } from '../firebase'
import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs
} from 'firebase/firestore'
import { useLanguage } from '../context/LanguageContext'

function ChatModal({
  isOpen,
  onClose,
  currentUser,
  recipientId,
  recipientName,
  jobId,
  jobTitle
}) {
  const { language } = useLanguage()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [isContactShared, setIsContactShared] = useState(false)
  const [clearing, setClearing] = useState(false)
  const messagesEndRef = useRef(null)

  const TEXT = useMemo(() => ({
    loading:
      language === 'en'
        ? 'Loading messages...'
        : 'پیغامات لوڈ ہو رہے ہیں...',

    noMessages:
      language === 'en'
        ? '💬 No messages yet.'
        : '💬 ابھی تک کوئی پیغام نہیں۔',

    startChat:
      language === 'en'
        ? 'Use the quick buttons below or type your message to start!'
        : 'شروع کرنے کیلئے نیچے دیئے گئے بٹن استعمال کریں یا اپنا پیغام لکھیں۔',

    placeholder:
      language === 'en'
        ? 'Type your message here...'
        : 'اپنا پیغام یہاں لکھیں...',

    send:
      language === 'en'
        ? 'Send'
        : 'بھیجیں',

    clearChat:
      language === 'en'
        ? 'Clear Chat History'
        : 'چیٹ صاف کریں',

    close:
      language === 'en'
        ? 'Close'
        : 'بند کریں',

    shareContact:
      language === 'en'
        ? '📲 Share Contact'
        : '📲 رابطہ شیئر کریں',

    lockJob:
      language === 'en'
        ? '🔒 Lock (Job Done)'
        : '🔒 لاک کریں',

    contactLocked:
      language === 'en'
        ? 'Direct Call / WhatsApp is locked.'
        : 'کال اور واٹس ایپ لاک ہیں۔',

    contactUnlocked:
      language === 'en'
        ? '✓ Contact shared — Call / WhatsApp unlocked.'
        : '✓ رابطہ شیئر ہو چکا ہے۔'
  }), [language])

  const QUICK_MESSAGES = useMemo(() => (
    language === 'en'
      ? [
          'Hello, is this job still available?',
          'What is your exact location?',
          'What will be your final rate?',
          'I can come tomorrow morning.',
          'Yes, I can do this work.'
        ]
      : [
          'السلام علیکم، کیا کام دستیاب ہے؟',
          'آپ کا مقام کہاں ہے؟',
          'آپ کا فائنل ریٹ کیا ہوگا؟',
          'میں کل صبح آ سکتا ہوں۔',
          'جی، میں یہ کام کر سکتا ہوں۔'
        ]
  ), [language])

  const currentUid = currentUser?.uid
  const targetUid = recipientId

  let chatId = null
  if (currentUid && targetUid) {
    const baseId = [currentUid, targetUid].sort().join('_')
    chatId = jobId ? `${baseId}_${jobId}` : baseId
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (!isOpen || !chatId) {
      setMessages([])
      return
    }

    setLoading(true)

    const chatDocRef = doc(db, 'chats', chatId)
    const unsubscribeChatDoc = onSnapshot(chatDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.contactShared) {
        setIsContactShared(true)
      } else {
        setIsContactShared(false)
      }
    })

    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))

    const unsubscribeMessages = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        setMessages(msgs)
        setLoading(false)
        setTimeout(scrollToBottom, 100)
      },
      (error) => {
        console.error("Firestore Listen Error:", error)
        setLoading(false)
      }
    )

    return () => {
      unsubscribeChatDoc()
      unsubscribeMessages()
    }
  }, [isOpen, chatId])

  const sendMessageText = async (textToSend) => {
    if (!textToSend.trim() || !chatId || !currentUid || !targetUid) {
      alert(
        language === 'en'
          ? 'Failed to send message.'
          : 'پیغام بھیجنے میں مسئلہ پیش آیا۔'
      )
      return
    }

    try {
      const chatDocRef = doc(db, 'chats', chatId)
      await setDoc(chatDocRef, {
        participants: [currentUid, targetUid],
        jobId: jobId || '',
        jobTitle: jobTitle || (language === 'en' ? 'General Inquiry' : 'عام معلومات'),
        lastMessage: textToSend,
        updatedAt: serverTimestamp()
      }, { merge: true })

      const messagesRef = collection(db, 'chats', chatId, 'messages')
      await addDoc(messagesRef, {
        senderId: currentUid,
        senderName: currentUser.displayName || currentUser.email || (language === 'en' ? 'User' : 'صارف'),
        text: textToSend,
        createdAt: serverTimestamp()
      })

      scrollToBottom()
    } catch (err) {
      console.error('Error sending message:', err)
      alert(
        language === 'en'
          ? 'Failed to send message.'
          : 'پیغام بھیجا نہیں جا سکا۔'
      )
    }
  }

  const handleDeleteMessage = async (messageId, senderId) => {
    if (senderId !== currentUid) return
    if (
      !window.confirm(
        language === 'en'
          ? 'Are you sure you want to delete this message?'
          : 'کیا آپ یہ پیغام حذف کرنا چاہتے ہیں؟'
      )
    )
      return

    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId))
    } catch (err) {
      console.error('Error deleting message:', err)
      alert(
        language === 'en'
          ? 'Failed to delete message.'
          : 'پیغام حذف نہیں ہو سکا۔'
      )
    }
  }

  const handleClearChat = async () => {
    if (!chatId) return
    if (
      !window.confirm(
        language === 'en'
          ? 'Are you sure you want to clear all chat history?'
          : 'کیا آپ پوری چیٹ حذف کرنا چاہتے ہیں؟'
      )
    )
      return

    setClearing(true)
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages')
      const snapshot = await getDocs(messagesRef)
      const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref))
      await Promise.all(deletePromises)

      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: '',
        updatedAt: serverTimestamp()
      }, { merge: true })
    } catch (err) {
      console.error('Error clearing chat:', err)
      alert(
        language === 'en'
          ? 'Failed to clear chat.'
          : 'چیٹ حذف نہیں ہو سکی۔'
      )
    } finally {
      setClearing(false)
    }
  }

  const handleLockContact = async () => {
    if (!chatId) return
    if (
      !window.confirm(
        language === 'en'
          ? 'Lock contact sharing?'
          : 'کیا رابطہ دوبارہ لاک کرنا چاہتے ہیں؟'
      )
    )
      return

    try {
      await setDoc(doc(db, 'chats', chatId), {
        contactShared: false,
        sharedBy: null,
        sharedAt: null
      }, { merge: true })

      const messagesRef = collection(db, 'chats', chatId, 'messages')
      await addDoc(messagesRef, {
        senderId: currentUid,
        senderName: currentUser.displayName || currentUser.email || (language === 'en' ? 'User' : 'صارف'),
        text:
          language === 'en'
            ? "🔒 Job completed. Contact sharing has been locked again."
            : "🔒 کام مکمل ہوگیا۔ رابطہ دوبارہ لاک کردیا گیا ہے۔",
        createdAt: serverTimestamp()
      })
    } catch (err) {
      console.error('Error locking contact:', err)
      alert('Failed to lock contact.')
    }
  }

  const handleShareContact = async () => {
    if (!chatId || !currentUid) return

    try {
      const chatDocRef = doc(db, 'chats', chatId)
      await setDoc(chatDocRef, {
        contactShared: true,
        sharedBy: currentUid,
        sharedAt: serverTimestamp()
      }, { merge: true })

      const messagesRef = collection(db, 'chats', chatId, 'messages')
      await addDoc(messagesRef, {
        senderId: currentUid,
        senderName: currentUser.displayName || currentUser.email || (language === 'en' ? 'Worker' : 'ورکر'),
        text:
          language === 'en'
            ? "📲 I have shared my contact number. You can call or WhatsApp directly!"
            : "📲 میں نے اپنا رابطہ شیئر کر دیا ہے۔ اب آپ براہ راست کال یا واٹس ایپ کر سکتے ہیں۔",
        createdAt: serverTimestamp()
      })

      alert(
        language === 'en'
          ? "Contact shared successfully!"
          : "رابطہ کامیابی سے شیئر ہوگیا۔"
      )
      scrollToBottom()
    } catch (err) {
      console.error('Error sharing contact:', err)
      alert(
        language === 'en'
          ? 'Failed to share contact.'
          : 'رابطہ شیئر نہیں ہو سکا۔'
      )
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    const text = newMessage
    setNewMessage('')
    await sendMessageText(text)
  }

  const handleQuickSend = async (quickMsg) => {
    await sendMessageText(quickMsg)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh] max-h-[580px] my-auto">

        {/* Header */}
        <div className="bg-amber-800 text-white p-3.5 flex justify-between items-center shrink-0">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="font-bold text-sm truncate" dir="auto">
              {recipientName || (language === 'en' ? 'KaamYaar User' : 'کام یار صارف')}
            </h3>
            {jobTitle && (
              <p className="text-xs text-amber-200 truncate" dir="auto">
                {jobTitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleClearChat}
              disabled={clearing || messages.length === 0}
              title={TEXT.clearChat}
              className="text-white hover:bg-amber-900 px-2 py-1 rounded-lg text-xs transition disabled:opacity-40 cursor-pointer"
            >
              🧹
            </button>
            <button
              onClick={onClose}
              title={TEXT.close}
              className="text-white hover:bg-amber-900 px-2.5 py-1 rounded-lg text-sm font-bold transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Message Container */}
        <div className="flex-1 p-3 overflow-y-auto bg-gray-50 space-y-3 min-h-0">
          {loading ? (
            <p className="text-center text-xs text-gray-400 py-4">
              {TEXT.loading}
            </p>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 text-xs py-8">
              <p>{TEXT.noMessages}</p>
              <p className="mt-1">{TEXT.startChat}</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUid
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="group relative max-w-[82%]">
                    <div
                      dir="auto"
                      className={`px-3.5 py-2 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-amber-800 text-white rounded-br-none shadow-xs text-right'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-xs text-left'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {isMe && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id, msg.senderId)}
                        title={language === 'en' ? 'Delete Message' : 'پیغام حذف کریں'}
                        className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-red-600 text-xs cursor-pointer"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Action / Share Contact Bar */}
        {!isContactShared ? (
          <div className="px-3 py-2 bg-amber-100/60 border-t border-amber-200 flex items-center justify-between shrink-0">
            <p className="text-[11px] text-amber-900 font-medium">
              {TEXT.contactLocked}
            </p>
            <button
              onClick={handleShareContact}
              className="text-xs bg-green-700 hover:bg-green-800 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs transition shrink-0 cursor-pointer"
            >
              {TEXT.shareContact}
            </button>
          </div>
        ) : (
          <div className="px-3 py-2 bg-green-100/60 border-t border-green-200 flex items-center justify-between shrink-0">
            <p className="text-[11px] text-green-900 font-medium">
              {TEXT.contactUnlocked}
            </p>
            <button
              onClick={handleLockContact}
              className="text-xs bg-gray-700 hover:bg-gray-800 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs transition shrink-0 cursor-pointer"
            >
              {TEXT.lockJob}
            </button>
          </div>
        )}

        {/* Quick Messages Chips */}
        <div className="p-2 bg-amber-50/70 border-t border-amber-100 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
          {QUICK_MESSAGES.map((msg, index) => (
            <button
              key={index}
              onClick={() => handleQuickSend(msg)}
              className="text-xs bg-white text-amber-900 border border-amber-300 hover:bg-amber-800 hover:text-white transition px-2.5 py-1 rounded-full flex-shrink-0 font-medium shadow-2xs cursor-pointer"
            >
              ⚡ {msg}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleFormSubmit} className="p-2.5 border-t border-gray-200 bg-white flex gap-2 shrink-0">
          <input
            type="text"
            dir={language === 'ur' ? 'rtl' : 'ltr'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={TEXT.placeholder}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {TEXT.send}
          </button>
        </form>

      </div>
    </div>
  )
}

export default ChatModal
