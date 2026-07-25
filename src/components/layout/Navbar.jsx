import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, LogOut, ChevronDown, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useShop } from '../../hooks/useShop'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../hooks/useToast'
import { useClickOutside } from '../../hooks/useClickOutside'
import productService from '../../services/productService'
import Avatar from '../ui/Avatar'
import SyncBadge from '../ui/SyncBadge'
import UpdaterModal from '../ui/UpdaterModal'

const LOW_STOCK_THRESHOLD = 10

export default function Navbar({ onMenuClick, title, sidebarCollapsed = false }) {
  const { user, logout } = useAuth()
  const { shopId }       = useShop()
  const { toast }        = useToast()
  const navigate         = useNavigate()

  // --- Dropdown States ---
  const [userDropOpen, setUserDropOpen]       = useState(false)
  const [notifDropOpen, setNotifDropOpen]     = useState(false)
  const [showUpdaterModal, setShowUpdaterModal] = useState(false)
  
  const userDropRef  = useRef(null)
  const notifDropRef = useRef(null)

  useClickOutside(userDropRef,  () => setUserDropOpen(false))
  useClickOutside(notifDropRef, () => setNotifDropOpen(false))

  // --- Fetch Products & Calculate Notifications ---
  const { data: productData } = useFetch(
    () => shopId ? productService.getAll(shopId) : Promise.resolve(null),
    [shopId]
  )
  
  const lowStockProducts = useMemo(() => {
    const products = productData?.data?.products ?? productData?.data ?? []
    return products.filter((p) => p.stock_quantity <= LOW_STOCK_THRESHOLD)
  }, [productData])

  const notificationCount = lowStockProducts.length

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully.')
    navigate('/login')
  }

  return (
    <header className="
      sticky top-0 z-20 h-20 px-4 md:px-8 
      bg-white border-b border-[#d9d4c8] 
      flex items-center justify-between shadow-sm transition-all
    ">
      {/* --- Left Section --- */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="text-[#697773] hover:text-[#004643] transition-colors p-2 rounded-lg hover:bg-[#e5f2f1] focus:outline-none focus:ring-2 focus:ring-[#004643]"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Toggle sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Toggle sidebar'}
        >
          <Menu size={22} />
        </button>
        {title && (
          <div className="flex items-center gap-3">
            <div className="hidden lg:block h-6 w-[2px] bg-[#004643]/30 rounded-full" />
            <h1 className="text-lg font-bold text-[#182321] hidden sm:block tracking-wide">
              {title}
            </h1>
          </div>
        )}
      </div>

      {/* --- Right Section --- */}
      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* --- Sync Status Badge (Desktop POS Offline Sync) --- */}
        <div className="hidden sm:block">
          <SyncBadge />
        </div>
        
        {/* --- System Health & Auto-Updates Button --- */}
        <button
          onClick={() => setShowUpdaterModal(true)}
          title="System Security & Software Updates"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e5f2f1] hover:bg-[#c8ddda] border border-[#c8ddda] rounded-lg text-xs font-bold text-[#004643] transition-all cursor-pointer select-none"
        >
          <ShieldCheck size={16} />
          <span className="hidden md:inline">Security & Updates</span>
        </button>
        
        {/* --- Notifications Dropdown --- */}
        <div ref={notifDropRef} className="relative">
          <button 
            onClick={() => setNotifDropOpen((p) => !p)}
            className={`relative p-2.5 text-[#697773] hover:text-[#004643] hover:bg-[#e5f2f1] rounded-lg transition-all focus:outline-none ${
              notifDropOpen ? 'bg-[#e5f2f1]' : ''
            }`}
          >
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>

          {/* Notification Panel */}
          {notifDropOpen && (
            <div className="absolute right-0 top-full mt-4 w-80 sm:w-96 bg-white rounded-lg border border-[#d9d4c8] shadow-xl animate-scale-in overflow-hidden z-50">
              
              <div className="px-5 py-4 border-b border-[#ebe6dc] bg-[#faf8f2] flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-[#182321]">Notifications</p>
                  <p className="text-[10px] font-bold text-[#697773] uppercase tracking-widest mt-0.5">
                    {shopId ? 'Current Shop' : 'No Shop Selected'}
                  </p>
                </div>
                {notificationCount > 0 && (
                  <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">
                    {notificationCount} Alerts
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto no-scrollbar p-2 space-y-1">
                {!shopId ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <p className="text-sm font-semibold text-[#697773]">Select a shop to view notifications.</p>
                  </div>
                ) : notificationCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <CheckCircle size={32} className="text-emerald-500 mb-2" />
                    <p className="text-sm font-semibold text-[#182321]">All clear!</p>
                    <p className="text-xs text-[#697773] mt-0.5">No low stock items detected.</p>
                  </div>
                ) : (
                  lowStockProducts.map((p) => (
                    <div 
                      key={p.product_id}
                      onClick={() => {
                        setNotifDropOpen(false)
                        navigate('/inventory')
                      }}
                      className="p-3 bg-rose-50/50 hover:bg-rose-50 rounded-lg border border-rose-100 flex items-start gap-3 cursor-pointer transition-colors"
                    >
                      <div className="p-2 bg-rose-100 text-rose-700 rounded-lg mt-0.5 shrink-0">
                        <AlertTriangle size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#182321] truncate">
                          {p.product_name}
                        </p>
                        <p className="text-xs text-rose-700 mt-0.5">
                          Low Stock: <span className="font-extrabold">{p.stock_quantity} {p.unit ?? 'units'}</span> remaining
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}
        </div>

        {/* --- User Profile & Logout --- */}
        <div ref={userDropRef} className="relative">
          <button
            onClick={() => setUserDropOpen((p) => !p)}
            className={`flex items-center gap-3 p-1.5 rounded-lg hover:bg-[#e5f2f1] transition-all focus:outline-none ${
              userDropOpen ? 'bg-[#e5f2f1]' : ''
            }`}
          >
            <Avatar name={user?.full_name} size="md" />
            
            <div className="hidden sm:block text-left">
              <p className="text-sm font-bold text-[#182321] leading-tight">
                {user?.full_name}
              </p>
              <p className="text-[11px] font-extrabold text-[#004643] uppercase tracking-wider mt-0.5">
                {user?.type}
              </p>
            </div>
            
            <ChevronDown
              size={16}
              className={`text-[#697773] hidden sm:block transition-transform duration-300 ${userDropOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* User Dropdown Panel */}
          {userDropOpen && (
            <div className="absolute right-0 top-full mt-4 w-60 bg-white rounded-lg border border-[#d9d4c8] shadow-xl animate-scale-in overflow-hidden z-50">
              
              {/* Dropdown Header */}
              <div className="px-5 py-4 border-b border-[#ebe6dc] bg-[#faf8f2]">
                <p className="text-[10px] font-bold text-[#697773] uppercase tracking-widest mb-1.5">
                  Signed in as
                </p>
                <p className="text-sm font-semibold text-[#182321] truncate">
                  {user?.email || user?.username}
                </p>
              </div>

              {/* Dropdown Actions */}
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <LogOut size={16} strokeWidth={2.5} />
                  Secure Sign Out
                </button>
              </div>
              
            </div>
          )}
        </div>

      </div>

      {/* --- System Health & Auto-Updates Modal --- */}
      <UpdaterModal
        isOpen={showUpdaterModal}
        onClose={() => setShowUpdaterModal(false)}
      />
    </header>
  )
}
