import { useState, useEffect, useRef } from 'react'
import {
  collection, query, where, getDocs, limit,
  doc, setDoc, deleteDoc, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db, auth } from '../firebase'
import { useLanguage } from '../context/LanguageContext'

const SKILLS = ['Electrician', 'Painter', 'Mason', 'Laborer', 'Plumber', 'Carpenter', 'Other']
const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta']
const REQUEST_TIMEOUT_MS = 15000
const PRIMARY_MODEL = 'openai/gpt-oss-20b:free'
const FALLBACK_MODEL = 'meta-llama/llama-3.1-8b-instruct:free'
const MAX_HISTORY_MESSAGES = 6

const QUICK_SUGGESTIONS_EN = [
  'Plumber in Lahore',
  'Electrician under 2000',
  'Mason in Faisalabad',
  'Painter Rawalpindi'
]

const QUICK_SUGGESTIONS_UR = [
  'لاہور میں پلمبر',
  '2000 سے کم میں الیکٹریشین',
  'فیصل آباد میں مستری',
  'راولپنڈی میں پینٹر'
]

function speakText(text, speechLang) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = speechLang === 'ur' ? 'ur-PK' : 'en-US'
  utterance.rate = 0.95
  window.speechSynthesis.speak(utterance)
}

function cleanJSON(rawContent) {
  const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI search failed to respond in valid format.')
    return JSON.parse(match[0])
  }
}

function parseSimpleQuery(text) {
  const lower = text.toLowerCase()
  let matchedSkill = null
  let matchedCity = null
  let maxPrice = null

  for (const s of SKILLS) {
    if (lower.includes(s.toLowerCase())) { matchedSkill = s; break }
  }
  for (const c of CITIES) {
    if (lower.includes(c.toLowerCase())) { matchedCity = c; break }
  }

  const priceMatch = lower.match(/(?:under|tak|less than|<)\s*(\d{3,5})/)
  if (priceMatch) maxPrice = Number(priceMatch[1])

  if (matchedSkill || matchedCity) {
    return { isSimple: true, filters: { skill: matchedSkill, city: matchedCity, maxPrice, workerName: null, reply: null } }
  }
  return { isSimple: false }
}

function makeTitle(text) {
  const trimmed = text.trim()
  return trimmed.length > 40 ? trimmed.slice(0, 40) + '…' : trimmed
}

function AIChat({ mode = 'workers', onSelectCard }) {
  const { language, t, tItem } = useLanguage()

  const quickSuggestions = language === 'ur' ? QUICK_SUGGESTIONS_UR : QUICK_SUGGESTIONS_EN

  const defaultGreetingText = language === 'ur'
    ? (mode === 'jobs'
        ? 'السلام علیکم! بتائیے آپ کو کس طرح کا کام چاہیے — جیسے "لاہور میں مستری کا کام" یا "کراچی میں الیکٹریشین، 2000 تک"۔'
        : 'السلام علیکم! بتائیے آپ کو کون سا ورکر چاہیے — جیسے "فیصل آباد میں پلمبر" یا "راولپنڈی میں دستیاب پینٹر"۔')
    : (mode === 'jobs'
        ? 'Hello! Tell me what kind of job you are looking for — e.g., "Mason job in Lahore" or "Electrician under 2000 in Karachi".'
        : 'Hello! Tell me which worker you are looking for — e.g., "Plumber in Faisalabad" or "Available Painter in Rawalpindi".')

  const defaultGreeting = {
    role: 'ai',
    text: defaultGreetingText
  }

  const [messages, setMessages] = useState([defaultGreeting])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(true)
  const [expandedResults, setExpandedResults] = useState({})
  const [activeFilters, setActiveFilters] = useState({})

  const [chatList, setChatList] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const bottomRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'ai') {
        return [{ role: 'ai', text: defaultGreetingText }]
      }
      return prev
    })
  }, [language, mode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => {
    if (!auth.currentUser) return
    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'aiChats'),
      orderBy('updatedAt', 'desc')
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setChatList(all.filter((c) => c.mode === mode))
    })
    return () => unsubscribe()
  }, [mode])

  // Speech recognition setup (Uses current language automatically)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceSupported(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = language === 'ur' ? 'ur-PK' : 'en-US'
    recognition.onresult = (event) => setInput(event.results[0][0].transcript)
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [language])

  const toggleListening = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setInput('')
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const saveChat = async (chatId, newMessages, title) => {
    if (!auth.currentUser) return
    const textOnlyMessages = newMessages.map((m) => ({ role: m.role, text: m.text }))
    await setDoc(
      doc(db, 'users', auth.currentUser.uid, 'aiChats', chatId),
      {
        mode,
        title,
        messages: textOnlyMessages,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )
  }

  const startNewChat = () => {
    setCurrentChatId(null)
    setMessages([{ role: 'ai', text: defaultGreetingText }])
    setActiveFilters({})
    setSidebarOpen(false)
  }

  const openChat = (chat) => {
    setCurrentChatId(chat.id)
    setMessages(chat.messages && chat.messages.length > 0 ? chat.messages : [{ role: 'ai', text: defaultGreetingText }])
    setActiveFilters({})
    setSidebarOpen(false)
  }

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation()
    const confirmMsg = language === 'ur' ? 'کیا آپ یہ چیٹ حذف کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this chat?'
    if (!window.confirm(confirmMsg)) return
    await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'aiChats', chatId))
    if (currentChatId === chatId) startNewChat()
  }

  const handleRenameChat = async (e, chat) => {
    e.stopPropagation()
    const promptMsg = language === 'ur' ? 'نیا نام:' : 'New title:'
    const newTitle = window.prompt(promptMsg, chat.title)
    if (!newTitle || !newTitle.trim()) return
    await setDoc(
      doc(db, 'users', auth.currentUser.uid, 'aiChats', chat.id),
      { title: newTitle.trim() },
      { merge: true }
    )
  }

  const getSystemPrompt = () => `You are KaamYaar AI Assistant, a search assistant for a Pakistani daily-wage jobs marketplace.

Extract search criteria from the conversation and respond ONLY with valid JSON (no markdown formatting, no code blocks, no explanations):

{
  "skill": "<one of ${SKILLS.join(', ')}, or null>",
  "city": "<one of ${CITIES.join(', ')}, or null>",
  "maxPrice": <a number or null>,
  "workerName": "<a person's name if searching for someone by name, else null>",
  "reply": "<short friendly response strictly in URDU script (اردو) helping or informing the user>"
}

Rules:
- Use the full conversation for context.
- Match skill/city to the closest option from the lists above.
- ALWAYS write the "reply" field strictly in Urdu script.
- Only return raw JSON object.`

  const callOpenRouter = async (conversationHistory, model) => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
    if (!apiKey) throw new Error(language === 'ur' ? "اوپن راؤٹر کی API Key نہیں ملی!" : "OpenRouter API Key not found!")

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "KaamYaar"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: getSystemPrompt() }, ...conversationHistory]
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error?.message || "OpenRouter Request Failed")
      }

      const data = await response.json()
      return cleanJSON(data.choices[0].message.content.trim())
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const extractFiltersViaAI = async (conversationHistory) => {
    try {
      return await callOpenRouter(conversationHistory, PRIMARY_MODEL)
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(language === 'ur' ? 'درخواست میں زیادہ وقت لگ گیا، دوبارہ کوشش کریں۔' : 'Request timed out, please try again.')
      }
      try {
        return await callOpenRouter(conversationHistory, FALLBACK_MODEL)
      } catch (fallbackErr) {
        throw fallbackErr.name === 'AbortError'
          ? new Error(language === 'ur' ? 'درخواست میں زیادہ وقت لگ گیا، دوبارہ کوشش کریں۔' : 'Request timed out, please try again.')
          : fallbackErr
      }
    }
  }

  const fetchFirestoreResults = async (filters) => {
    const collectionName = mode === 'jobs' ? 'jobs' : 'workers'
    let constraints = []
    if (filters.skill) constraints.push(where('skill', '==', filters.skill))
    if (filters.city) constraints.push(where('location', '==', filters.city))
    constraints.push(limit(20))

    const q = query(collection(db, collectionName), ...constraints)
    const snapshot = await getDocs(q)
    let fetchedItems = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

    if (filters.maxPrice) {
      const maxP = Number(filters.maxPrice)
      fetchedItems = fetchedItems.filter((item) => {
        const price = Number(mode === 'jobs' ? item.pay : item.rate)
        return !Number.isNaN(price) && price <= maxP
      })
    }

    if (filters.workerName && filters.workerName.trim()) {
      const targetName = filters.workerName.trim().toLowerCase()
      fetchedItems = fetchedItems.filter((item) => item.name && item.name.toLowerCase().includes(targetName))
    }

    fetchedItems.sort((a, b) => {
      if (mode === 'workers') {
        if (a.available !== b.available) return b.available ? 1 : -1
        return (b.averageRating || 0) - (a.averageRating || 0)
      }
      return 0
    })

    return fetchedItems
  }

  const handleSend = async (overrideText = null) => {
    const trimmedInput = (overrideText || input).trim()
    if (!trimmedInput || thinking) return

    const updatedMessages = [...messages, { role: 'user', text: trimmedInput }]
    setMessages(updatedMessages)
    setInput('')
    setThinking(true)

    try {
      let extractedFilters = {}
      const simpleParse = parseSimpleQuery(trimmedInput)

      if (simpleParse.isSimple) {
        extractedFilters = simpleParse.filters
      } else {
        const conversationHistory = updatedMessages
          .slice(-MAX_HISTORY_MESSAGES)
          .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))
        extractedFilters = await extractFiltersViaAI(conversationHistory)
      }

      const mergedFilters = { ...activeFilters, ...extractedFilters }
      setActiveFilters(mergedFilters)

      const results = await fetchFirestoreResults(mergedFilters)

      let replyText = mergedFilters.reply
      if (!replyText) {
        if (results.length > 0) {
          replyText = language === 'ur'
            ? `یہ رہے آپ کے نتائج (${results.length} ملے):`
            : `Here are your results (${results.length} found):`
        } else if (mergedFilters.city || mergedFilters.skill) {
          replyText = language === 'ur'
            ? `${tItem(mergedFilters.city) || ''} میں ${tItem(mergedFilters.skill) || 'کوئی'} ریکارڈ فی الحال دستیاب نہیں ہے۔`
            : `No records currently available for ${tItem(mergedFilters.skill) || ''} in ${tItem(mergedFilters.city) || ''}.`
        } else {
          replyText = language === 'ur' ? 'آپ کی تلاش کے مطابق کوئی ریکارڈ نہیں ملا۔' : 'No records found for your search.'
        }
      }

      const finalMessages = [
        ...updatedMessages,
        { role: 'ai', text: replyText, results, suggestions: results.length === 0 ? quickSuggestions : null }
      ]
      setMessages(finalMessages)
      speakText(replyText, language)

      if (auth.currentUser) {
        const chatId = currentChatId || doc(collection(db, 'users', auth.currentUser.uid, 'aiChats')).id
        if (!currentChatId) setCurrentChatId(chatId)
        const title = messages.length === 1 ? makeTitle(trimmedInput) : (chatList.find((c) => c.id === chatId)?.title || makeTitle(trimmedInput))
        await saveChat(chatId, finalMessages, title)
      }
    } catch (err) {
      console.error('AI Search Error:', err)
      const errorText = language === 'ur' ? `معذرت، خرابی: ${err.message}` : `Sorry, error: ${err.message}`
      setMessages((prev) => [...prev, { role: 'ai', text: errorText }])
    } finally {
      setThinking(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleExpanded = (msgIndex) => {
    setExpandedResults((prev) => ({ ...prev, [msgIndex]: !prev[msgIndex] }))
  }

  return (
    <div className="border border-gray-200 rounded-xl flex h-[620px] bg-white shadow-lg overflow-hidden relative">
      {/* Sidebar */}
      <div
        className={`absolute md:static inset-y-0 left-0 z-20 w-64 bg-slate-950 text-white flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden'
        }`}
      >
        <div className="p-3 border-b border-slate-800">
          <button
            onClick={startNewChat}
            className="w-full bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold py-2 rounded-lg transition cursor-pointer"
          >
            {language === 'ur' ? '+ نئی چیٹ' : '+ New Chat'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatList.length === 0 && (
            <p className="text-xs text-slate-500 text-center mt-4">
              {language === 'ur' ? 'کوئی پرانی چیٹ نہیں' : 'No previous chats'}
            </p>
          )}
          {chatList.map((chat) => (
            <div
              key={chat.id}
              onClick={() => openChat(chat)}
              className={`group flex items-center justify-between gap-1 px-2.5 py-2 rounded-lg cursor-pointer text-xs ${
                currentChatId === chat.id ? 'bg-slate-800' : 'hover:bg-slate-900'
              }`}
            >
              <span className="truncate flex-1">🕒 {chat.title || (language === 'ur' ? 'بغیر عنوان' : 'Untitled')}</span>
              <div className="hidden group-hover:flex gap-1 flex-shrink-0">
                <button onClick={(e) => handleRenameChat(e, chat)} className="text-slate-400 hover:text-white" title={language === 'ur' ? 'ترمیم کریں' : 'Rename'}>✏️</button>
                <button onClick={(e) => handleDeleteChat(e, chat.id)} className="text-slate-400 hover:text-red-400" title={language === 'ur' ? 'حذف کریں' : 'Delete'}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header without the buttons */}
        <div className="px-4 py-3 bg-slate-900 text-white flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-white text-lg leading-none mr-1 cursor-pointer"
            >
              ☰
            </button>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wide text-sm">
              {t('askAiTitle')} ({mode === 'jobs' ? (language === 'ur' ? 'جابز' : 'Jobs') : (language === 'ur' ? 'ورکرز' : 'Workers')})
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg, i) => {
            const isExpanded = expandedResults[i]
            const visibleResults = msg.results ? (isExpanded ? msg.results : msg.results.slice(0, 5)) : []

            return (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all ${
                    msg.role === 'user'
                      ? 'bg-amber-800 text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <p className="flex-1 whitespace-pre-line leading-relaxed">{msg.text}</p>
                    {msg.role === 'ai' && (
                      <button onClick={() => speakText(msg.text, language)} className="text-gray-400 hover:text-amber-800 transition flex-shrink-0 p-1 cursor-pointer" title={language === 'ur' ? 'سنیں' : 'Listen'}>🔊</button>
                    )}
                  </div>

                  {msg.suggestions && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 font-medium mb-2">
                        {language === 'ur' ? 'شاید آپ یہ ڈھونڈنا چاہتے ہیں:' : 'You might be looking for:'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestions.map((sug, idx) => (
                          <button key={idx} onClick={() => handleSend(sug)} className="bg-amber-50 text-amber-900 border border-amber-200 text-xs px-3 py-1 rounded-full font-medium hover:bg-amber-100 transition cursor-pointer">
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.results && msg.results.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      {visibleResults.map((r) => {
                        const photoSrc = mode === 'jobs' ? r.photoURL : (r.profilePhoto || r.workerPhoto || r.photoURL)
                        return (
                          <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs hover:shadow-md hover:border-amber-400 transition flex flex-col gap-2">
                            <div className="flex items-start gap-3">
                              {photoSrc ? (
                                <img src={photoSrc} alt={r.name || r.skill} className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-gray-200" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 font-bold text-lg flex items-center justify-center flex-shrink-0">
                                  {(r.name || r.skill || 'K')[0].toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="font-bold text-gray-900 truncate text-sm">
                                    {mode === 'jobs' ? `${tItem(r.skill)} ${language === 'ur' ? 'مطلوب ہے' : 'Needed'}` : r.name}
                                  </p>
                                  {mode === 'workers' && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.available ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                                      {r.available ? t('availableToday') : t('notAvailable')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 font-medium mt-0.5">
                                  🛠️ {tItem(r.skill)} · 📍 {tItem(r.location || r.city)} · 💰 {t('pkrCurrency')} {mode === 'jobs' ? r.pay : r.rate}{t('perDay')}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500 mt-1">
                                  {mode === 'workers' && r.experience !== undefined && (
                                    <span>🧰 {r.experience} {language === 'ur' ? 'سال کا تجربہ' : `yr${r.experience === 1 ? '' : 's'} exp`}</span>
                                  )}
                                  {mode === 'workers' && (
                                    <span>⭐ {r.averageRating ? Number(r.averageRating).toFixed(1) : t('newBadge')} {r.ratingCount ? `(${r.ratingCount})` : ''}</span>
                                  )}
                                  {mode === 'jobs' && r.workersNeeded && <span>👥 {r.workersNeeded} {language === 'ur' ? 'ورکرز درکار ہیں' : 'workers needed'}</span>}
                                </div>
                              </div>
                            </div>
                            {onSelectCard && (
                              <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
                                <button onClick={() => onSelectCard(r, mode)} className="text-xs font-semibold px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-md transition cursor-pointer">
                                  {mode === 'jobs' ? (language === 'ur' ? 'درخواست دیں / کام دیکھیں' : 'Apply / View Job') : (language === 'ur' ? 'رابطہ کریں' : 'Contact Worker')}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {msg.results.length > 5 && (
                        <button onClick={() => toggleExpanded(i)} className="text-xs font-bold text-amber-800 hover:underline pt-1 block cursor-pointer">
                          {isExpanded 
                            ? (language === 'ur' ? 'کم دکھائیں ▲' : 'Show less ▲') 
                            : (language === 'ur' ? `تمام ${msg.results.length} نتائج دیکھیں ▼` : `Show all ${msg.results.length} results ▼`)}
                        </button>
                      )}
                    </div>
                  )}

                  {msg.results && msg.results.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {language === 'ur' ? 'کوئی ریکارڈ نہیں ملا۔' : 'No matching records found.'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}

          {thinking && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm w-72 space-y-2.5 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-amber-700 rounded-full animate-ping" />
                  <span className="text-xs font-semibold text-gray-600">
                    {language === 'ur' ? 'تلاش جاری ہے...' : 'Searching...'}
                  </span>
                </div>
                <div className="h-10 bg-gray-100 rounded-lg w-full" />
                <div className="h-8 bg-gray-100 rounded-lg w-3/4" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick Chips Section */}
        <div className="px-3 py-2 bg-gray-100 border-t border-gray-200 flex gap-2 overflow-x-auto text-xs items-center">
          <span className="text-gray-400 font-semibold text-[10px] uppercase whitespace-nowrap">
            {language === 'ur' ? 'فوری:' : 'QUICK:'}
          </span>
          {quickSuggestions.map((chip, idx) => (
            <button key={idx} onClick={() => handleSend(chip)} disabled={thinking} className="bg-white border border-gray-300 hover:border-amber-700 text-gray-700 text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap transition disabled:opacity-50 cursor-pointer">
              {chip}
            </button>
          ))}
        </div>

        {/* Bottom Input Area */}
        <div className="p-3 flex gap-2 bg-white border-t border-gray-200">
          {voiceSupported && (
            <button type="button" onClick={toggleListening} disabled={thinking} className={`px-3 py-2 rounded-lg font-bold text-sm transition cursor-pointer disabled:opacity-50 ${isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200'}`}>
              {isListening ? (language === 'ur' ? '⏹️ روکیں' : '⏹️ Stop') : '🎙️'}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening 
                ? (language === 'ur' ? 'سن رہا ہوں...' : 'Listening...') 
                : (language === 'ur' ? 'پوچھیں (مثلاً لاہور میں مستری)...' : 'Search (e.g., Plumber in Lahore)...')
            }
            disabled={thinking}
            dir="auto"
            className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-800 disabled:opacity-50 text-sm"
          />
          <button
            onClick={() => handleSend()}
            disabled={thinking || !input.trim()}
            className="bg-amber-800 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-amber-900 transition disabled:opacity-50 flex items-center justify-center min-w-[80px] cursor-pointer"
          >
            {thinking ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              language === 'ur' ? 'بھیجیں' : 'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AIChat