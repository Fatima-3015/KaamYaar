export default function BottomNav({ items = [], activeTab, setActiveTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-col items-center justify-center w-full h-full text-xs transition-colors ${
                isActive ? 'text-amber-700 font-bold' : 'text-gray-500 hover:text-amber-600'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}